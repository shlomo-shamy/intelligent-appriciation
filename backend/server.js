console.log('=== SERVER STARTUP DEBUG ===');
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('Memory usage:', process.memoryUsage());
console.log('Environment variables set:', Object.keys(process.env).length);
console.log('PORT from environment:', process.env.PORT);
console.log('Current working directory:', process.cwd());

// Catch any unhandled errors
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

console.log('Starting main server code...');

const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('Current working directory:', process.cwd());
console.log('Files in current directory:', require('fs').readdirSync('.'));

try {
  const packageJson = require('./package.json');
  console.log('Package.json found:', packageJson.dependencies);
} catch (error) {
  console.log('Package.json not found in current directory');
}

// Create views and public directories
const viewsDir = path.join(__dirname, 'views');
const publicDir = path.join(__dirname, 'public');

if (!fs.existsSync(viewsDir)) {
  fs.mkdirSync(viewsDir, { recursive: true });
  console.log('Created views directory');
}
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('Created public directory');
}

// Template rendering function
function renderTemplate(templateName, data = {}) {
  try {
    const templatePath = path.join(viewsDir, `${templateName}.html`);
    let template = fs.readFileSync(templatePath, 'utf8');
    
    // Simple template variable replacement
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(regex, data[key]);
    });
    
    return template;
  } catch (error) {
    console.error(`Template rendering error for ${templateName}:`, error);
    return `
    <!DOCTYPE html>
    <html>
    <head><title>Template Error</title></head>
    <body>
      <h1>Template Error</h1>
      <p>Could not load template: ${templateName}</p>
      <p>Error: ${error.message}</p>
      <p>Please ensure the template file exists at: views/${templateName}.html</p>
      <a href="/dashboard">Return to Dashboard</a>
    </body>
    </html>`;
  }
}

// Firebase Admin SDK (optional - falls back gracefully)
let admin, db, auth, firebaseInitialized = false;

try {
  console.log('Firebase environment check:');
  console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'SET' : 'MISSING');
  console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'SET (' + process.env.FIREBASE_PRIVATE_KEY.length + ' chars)' : 'MISSING');
  console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'SET' : 'MISSING');
  
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    admin = require('firebase-admin');
    
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    db = admin.firestore();
    auth = admin.auth();
    firebaseInitialized = true;
    console.log('Firebase initialized successfully');
  } else {
    console.log('Firebase environment variables missing - running in local mode');
  }
} catch (error) {
  console.log('Firebase initialization error:', error.message);
  console.log('Full error:', error);
}

// ==================== DASHBOARD USERS FIREBASE SYNC ====================

// Load dashboard users from Firebase on startup
async function loadDashboardUsersFromFirebase() {
  if (!firebaseInitialized) {
    console.log('⚠️ Firebase not initialized, using hardcoded dashboard users');
    return;
  }
  
  try {
    const usersSnapshot = await db.collection('dashboardUsers').get();
    
    if (usersSnapshot.empty) {
      console.log('📋 No dashboard users in Firebase, initializing with defaults');
      // Save the default hardcoded users to Firebase
      for (const [email, userData] of DASHBOARD_USERS.entries()) {
        await db.collection('dashboardUsers').doc(email).set(userData);
      }
      console.log('✅ Default dashboard users saved to Firebase');
      return;
    }
    
    // Load users from Firebase into memory
// Clear memory and load users from Firebase (Firebase is source of truth)
    DASHBOARD_USERS.clear();
    
    let loadedCount = 0;
    usersSnapshot.forEach(doc => {
      DASHBOARD_USERS.set(doc.id, doc.data());
      loadedCount++;
    });
    
    console.log(`✅ Loaded ${loadedCount} dashboard users from Firebase (memory cleared and synced)`);
    
  } catch (error) {
    console.error('❌ Error loading dashboard users from Firebase:', error);
    console.log('⚠️ Using hardcoded dashboard users as fallback');
  }
}

// Save a dashboard user to Firebase
async function saveDashboardUserToFirebase(email, userData) {
  if (!firebaseInitialized) {
    console.log('⚠️ Firebase not initialized, user only in memory');
    return { success: false, error: 'Firebase not available' };
  }
  
  try {
    await db.collection('dashboardUsers').doc(email).set(userData);
    console.log(`✅ Dashboard user saved to Firebase: ${email}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Error saving dashboard user to Firebase:`, error);
    return { success: false, error: error.message };
  }
}

// Delete a dashboard user from Firebase
async function deleteDashboardUserFromFirebase(email) {
  if (!firebaseInitialized) {
    console.log('⚠️ Firebase not initialized, user only deleted from memory');
    return { success: false, error: 'Firebase not available' };
  }
  
  try {
    await db.collection('dashboardUsers').doc(email).delete();
    console.log(`✅ Dashboard user deleted from Firebase: ${email}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Error deleting dashboard user from Firebase:`, error);
    return { success: false, error: error.message };
  }
}

console.log('🚀 Starting Railway server with ESP32 support, User Management, and Dashboard Login...');

// Organization storage (will migrate to Firebase)
const organizations = new Map();

// Initialize default platform organization - ALL GATES AUTO-ASSIGNED HERE
organizations.set('platform_org', {
  id: 'platform_org',
  name: 'Gate Controller Platform',
  type: 'platform',
  createdAt: new Date().toISOString(),
  createdBy: 'system',
  devices: [],  // Will be populated as gates activate
  members: {
    'admin@gatecontroller.com': {
      role: 'superadmin',
      phone: '1234567890',
      name: 'Administrator',
      addedAt: new Date().toISOString(),
      addedBy: 'system'
    }
  }
});

// Helper function to get user's organizations
function getUserOrganizations(userEmail) {
  const userOrgs = [];
  for (const [orgId, org] of organizations.entries()) {
    if (org.members[userEmail]) {
      userOrgs.push({
        id: orgId,
        name: org.name,
        role: org.members[userEmail].role,
        type: org.type
      });
    }
  }
  return userOrgs;
}

// Helper function to get user's highest role
function getUserHighestRole(userEmail) {
  // First check dashboard users for explicit organizationRole
  const dashboardUser = DASHBOARD_USERS.get(userEmail);
  if (dashboardUser && dashboardUser.organizationRole) {
    return dashboardUser.organizationRole;
  }
  
  // Then check organizations
  const userOrgs = getUserOrganizations(userEmail);
  
  // Check for superadmin first
  if (userOrgs.some(org => org.role === 'superadmin')) {
    return 'superadmin';
  }
  
  // Then admin
  if (userOrgs.some(org => org.role === 'admin')) {
    return 'admin';
  }
  
  // Then manager
  if (userOrgs.some(org => org.role === 'manager')) {
    return 'manager';
  }
  
  // Finally check if dashboard user has userLevel that implies a role
  if (dashboardUser) {
    const derivedRole = userLevelToRole(dashboardUser.userLevel);
    if (derivedRole === 'admin') return 'admin';
    if (derivedRole === 'manager') return 'manager';
  }
  
  return 'user';
}

// Helper function to check if user is Admin or higher
function isAdminOrHigher(userRole) {
  return userRole === 'superadmin' || userRole === 'admin';
}

// Helper function to get gates for user's organizations
function getUserGates(userEmail, userRole) {
  // SuperAdmin sees ALL connected gates (bypass organization filter)
  if (userRole === 'superadmin') {
    console.log(`SuperAdmin ${userEmail} accessing ALL gates`);
    return Array.from(connectedDevices.keys());
  }
  
  // Other users see only gates from their organizations
  const userOrgs = getUserOrganizations(userEmail);
  const gateSet = new Set();
  
  for (const org of userOrgs) {
    const orgData = organizations.get(org.id);
    if (orgData && orgData.devices) {
      orgData.devices.forEach(deviceId => gateSet.add(deviceId));
    }
  }
  
  console.log(`User ${userEmail} (${userRole}) accessing ${gateSet.size} gates from ${userOrgs.length} organizations`);
  return Array.from(gateSet);
}

// Helper function to check if user can access a specific gate
function userCanAccessGate(userEmail, userRole, gateSerial) {
  // SuperAdmin can access all gates
  if (userRole === 'superadmin') {
    return true;
  }
  
  // Check if gate is in any of user's organizations
  const userGates = getUserGates(userEmail, userRole);
  return userGates.includes(gateSerial);
}

// ==================== ORGANIZATIONS FIREBASE SYNC ====================

// Load organizations from Firebase on startup
async function loadOrganizationsFromFirebase() {
  if (!firebaseInitialized) {
    console.log('⚠️ Firebase not initialized, using default organizations');
    return;
  }
  
  try {
    const orgsSnapshot = await db.collection('organizations').get();
    
    if (orgsSnapshot.empty) {
      console.log('📋 No organizations in Firebase, initializing with defaults');
      // Save the default platform_org to Firebase
      for (const [orgId, orgData] of organizations.entries()) {
        await db.collection('organizations').doc(orgId).set(orgData);
      }
      console.log('✅ Default organizations saved to Firebase');
      return;
    }
    
    // Clear memory and load from Firebase
    organizations.clear();
    
    let loadedCount = 0;
    orgsSnapshot.forEach(doc => {
      organizations.set(doc.id, {
        id: doc.id,
        ...doc.data()
      });
      loadedCount++;
    });
    
    console.log(`✅ Loaded ${loadedCount} organizations from Firebase`);
    
  } catch (error) {
    console.error('❌ Error loading organizations from Firebase:', error);
    console.log('⚠️ Using default organizations as fallback');
  }
}

// Save an organization to Firebase
async function saveOrganizationToFirebase(orgId, orgData) {
  if (!firebaseInitialized) {
    console.log('⚠️ Firebase not initialized, organization only in memory');
    return { success: false, error: 'Firebase not available' };
  }
  
  try {
    await db.collection('organizations').doc(orgId).set(orgData);
    console.log(`✅ Organization saved to Firebase: ${orgId}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Error saving organization to Firebase:`, error);
    return { success: false, error: error.message };
  }
}

// Delete an organization from Firebase
async function deleteOrganizationFromFirebase(orgId) {
  if (!firebaseInitialized) {
    console.log('⚠️ Firebase not initialized, organization only deleted from memory');
    return { success: false, error: 'Firebase not available' };
  }
  
  try {
    await db.collection('organizations').doc(orgId).delete();
    console.log(`✅ Organization deleted from Firebase: ${orgId}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Error deleting organization from Firebase:`, error);
    return { success: false, error: error.message };
  }
}

// Let Railway assign the port - don't force 3000
const PORT = process.env.PORT || 3001;

console.log(`🔍 Full Environment check:`, {
  'process.env.PORT': process.env.PORT,
  'process.env.RAILWAY_ENVIRONMENT': process.env.RAILWAY_ENVIRONMENT,
  'Final PORT being used': PORT,
  'All env vars': Object.keys(process.env).filter(key => key.includes('RAILWAY'))
});

// Store connected devices
const connectedDevices = new Map();
const deviceCommands = new Map(); // Store commands for each device
const registeredUsers = new Map(); // Store registered users by deviceId
const deviceLogs = new Map(); // Store device logs
const deviceSchedules = new Map(); // Store device schedules

// Firebase-specific data stores
const authorizedUsers = new Map();
const manufacturingDevices = new Map();

// Demo data for testing - UPDATED: use phone numbers without + prefix
authorizedUsers.set('972501234567', {
  name: 'Demo Admin',
  email: 'demo@gatecontroller.com', 
  canActivateDevices: true
});

// Manufacturing Devices - Pre-registered during production
manufacturingDevices.set('GC-2025-001', {
  serial: 'GC-2025-001',
  pin: '123456',
  activationCode: '123456',
  hardwareVersion: 'v1.0',
  firmwareVersion: '1.0.0',
  manufactureDate: new Date().toISOString(),
  activated: true,
  activatedBy: '972522554743',
  activationDate: new Date().toISOString(),
  name: 'main gate',
  location: 'test location'
});

manufacturingDevices.set('GC-2025-002', {
  serial: 'GC-2025-002',
  pin: '654321',
  activationCode: '654321',
  hardwareVersion: 'v1.0',
  firmwareVersion: '1.0.0',
  manufactureDate: new Date().toISOString(),
  activated: false,
  activatedBy: null,
  activationDate: null,
  name: null,
  location: null
});

// Simple dashboard authentication - Default admin users
const DASHBOARD_USERS = new Map([
  ['admin@gatecontroller.com', { 
    password: 'admin123', 
    name: 'Administrator', 
    userLevel: 2, 
    phone: '1234567890',
    organizationRole: 'superadmin'  // ✅ ADD THIS
  }],
  ['972522554743@gatecontroller.com', { 
    password: 'gate2024', 
    name: 'Shlomo Shamy',  // ✅ Better name match
    userLevel: 1, 
    phone: '972522554743',
    organizationRole: 'manager'  // ✅ ADD THIS
  }]
]);

// Helper: Convert userLevel to organization role
function userLevelToRole(userLevel) {
  switch(userLevel) {
    case 2: return 'admin';
    case 1: return 'manager';
    case 0: return 'user';
    default: return 'user';
  }
}

// Helper: Get user's organization role (prioritize explicit organizationRole)
function getUserOrgRole(userEmail) {
  const dashboardUser = DASHBOARD_USERS.get(userEmail);
  if (!dashboardUser) return 'user';
  
  // If explicit organizationRole is set, use it
  if (dashboardUser.organizationRole) {
    return dashboardUser.organizationRole;
  }
  
  // Otherwise, derive from userLevel
  return userLevelToRole(dashboardUser.userLevel);
}

// Store active sessions (in production, use Redis or database)
const activeSessions = new Map();

function generateSessionToken() {
  return 'session_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function validateSession(sessionToken) {
  return activeSessions.has(sessionToken);
}

// PHONE VALIDATION HELPER FUNCTION - supports 10-14 digits
function validatePhoneNumber(phone) {
    console.log("Validating phone:", phone, "Type:", typeof phone);
    
    // Convert to string and remove any non-digit characters
    const cleanPhone = phone.toString().replace(/\D/g, '');
    console.log("Clean phone:", cleanPhone, "Length:", cleanPhone.length);
    
    // Check if it's between 10-14 digits
    const isValid = /^\d{10,14}$/.test(cleanPhone);
    console.log("Regex test result:", isValid);
    
    if (!isValid) {
        return {
            valid: false,
            message: `Phone number must be 10-14 digits. Received: "${cleanPhone}" (${cleanPhone.length} digits)`,
            cleanPhone: null
        };
    }
    
    return {
        valid: true,
        message: 'Valid phone number',
        cleanPhone: cleanPhone
    };
}

// Helper function to add device log
function addDeviceLog(deviceId, action, user, details = '') {
  if (!deviceLogs.has(deviceId)) {
    deviceLogs.set(deviceId, []);
  }
  
  const log = {
    timestamp: new Date().toISOString(),
    action: action,
    user: user,
    details: details,
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2)
  };
  
  const logs = deviceLogs.get(deviceId);
  logs.unshift(log); // Add to beginning
  
  // Keep only last 500 logs per device
  if (logs.length > 500) {
    logs.splice(500);
  }
  
  deviceLogs.set(deviceId, logs);
}

const server = http.createServer((req, res) => {
  console.log(`📡 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  
  // Set CORS headers for all requests with UTF-8 support
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Helper function to read request body
  function readBody(callback) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString('utf8');
    });
    req.on('end', () => {
      try {
        const parsedBody = body ? JSON.parse(body) : {};
        callback(parsedBody);
      } catch (error) {
        console.error('❌ JSON Parse Error:', error);
        callback({});
      }
    });
  }

  // Helper function to get session token from cookie
  function getSessionFromCookie(cookieHeader) {
    if (!cookieHeader) return null;
    const sessionMatch = cookieHeader.match(/session=([^;]+)/);
    return sessionMatch ? sessionMatch[1] : null;
  }

  // Serve static files from public directory
  if (req.url.startsWith('/public/')) {
    const filePath = path.join(publicDir, req.url.replace('/public/', ''));
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.wasm': 'application/wasm'
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      
      res.writeHead(200, { 'Content-Type': contentType });
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      return;
    }
  }

// ==================== FIREBASE SCHEDULE HELPERS ====================

async function saveScheduleToFirebase(deviceId, schedule) {
  if (!firebaseInitialized) {
    console.log('⚠️ Firebase not initialized, skipping schedule save');
    return { success: false, error: 'Firebase not available' };
  }
  
  try {
    const gateRef = db.collection('gates').doc(deviceId);
    const gateDoc = await gateRef.get();
    
    if (!gateDoc.exists) {
      console.log(`⚠️ Gate ${deviceId} not found in Firebase`);
      return { success: false, error: 'Gate not found' };
    }
    
    // Get current schedules array
    const currentSchedules = gateDoc.data().schedules || [];
    
    // Prepare schedule data (convert timestamps to Date objects)
    const now = new Date();
    const scheduleToSave = {
      ...schedule,
      // Remove any FieldValue objects and use plain Date
      createdAt: schedule.createdAt || now,
      updatedAt: now
    };
    
    // Check if updating existing or adding new
    const existingIndex = currentSchedules.findIndex(s => s.id === schedule.id);
    
    if (existingIndex >= 0) {
      // Update existing - preserve original createdAt
      scheduleToSave.createdAt = currentSchedules[existingIndex].createdAt || now;
      currentSchedules[existingIndex] = scheduleToSave;
      console.log(`📅 Updating existing schedule at index ${existingIndex}`);
    } else {
      // Add new
      currentSchedules.push(scheduleToSave);
      console.log(`📅 Adding new schedule, total: ${currentSchedules.length}`);
    }
    
    // Save back to Firebase (entire array)
    await gateRef.update({
      schedules: currentSchedules
    });
    
    console.log(`✅ Schedule saved to Firebase: ${schedule.name}`);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Firebase save error:', error);
    return { success: false, error: error.message };
  }
}

async function deleteScheduleFromFirebase(deviceId, scheduleId) {
  if (!firebaseInitialized) {
    console.log('⚠️ Firebase not initialized, skipping schedule delete');
    return { success: false, error: 'Firebase not available' };
  }
  
  try {
    const gateRef = db.collection('gates').doc(deviceId);
    const gateDoc = await gateRef.get();
    
    if (!gateDoc.exists) {
      return { success: false, error: 'Gate not found' };
    }
    
    // Get current schedules and filter out deleted one
    const currentSchedules = gateDoc.data().schedules || [];
    const filteredSchedules = currentSchedules.filter(s => s.id != scheduleId);
    
    // Save back to Firebase
    await gateRef.update({
      schedules: filteredSchedules
    });
    
    console.log(`✅ Schedule deleted from Firebase: ${scheduleId}`);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Firebase delete error:', error);
    return { success: false, error: error.message };
  }
}

async function loadSchedulesFromFirebase(deviceId) {
  if (!firebaseInitialized) {
    console.log('⚠️ Firebase not initialized, returning local schedules');
    return deviceSchedules.get(deviceId) || [];
  }
  
  try {
    const gateDoc = await db.collection('gates').doc(deviceId).get();
    
    if (!gateDoc.exists) {
      console.log(`⚠️ Gate ${deviceId} not found in Firebase`);
      return [];
    }
    
    const schedules = gateDoc.data().schedules || [];
    console.log(`✅ Loaded ${schedules.length} schedules from Firebase for ${deviceId}`);
    
    // Also update local cache
    deviceSchedules.set(deviceId, schedules);
    
    return schedules;
    
  } catch (error) {
    console.error('❌ Firebase load error:', error);
    // Fallback to local storage
    return deviceSchedules.get(deviceId) || [];
  }
}
  
// DEVICE ACTIVATION ENDPOINT - AUTO-ASSIGN TO PLATFORM_ORG
if (req.url === '/api/device/activate' && req.method === 'POST') {
  readBody(async (data) => {
    const { serial, activationCode, deviceName, location, installerPhone } = data;
    
    console.log(`Activation attempt: ${serial} by installer ${installerPhone}`);
    
    // Validate phone number
    const phoneValidation = validatePhoneNumber(installerPhone);
    if (!phoneValidation.valid) {
      res.writeHead(400);
      res.end(JSON.stringify({ success: false, error: phoneValidation.message }));
      return;
    }
    const cleanPhone = phoneValidation.cleanPhone;
    
    // 1. Check manufacturing database
    const device = manufacturingDevices.get(serial);
    if (!device) {
      res.writeHead(404);
      res.end(JSON.stringify({ 
        success: false, 
        error: 'Device not found in manufacturing database' 
      }));
      return;
    }
    
    // 2. Verify activation code
    if (device.pin !== activationCode && device.activationCode !== activationCode) {
      res.writeHead(400);
      res.end(JSON.stringify({ 
        success: false, 
        error: 'Invalid activation code' 
      }));
      return;
    }
    
    // 3. Check if already activated
    if (device.activated) {
      res.writeHead(400);
      res.end(JSON.stringify({ 
        success: false, 
        error: `Device already activated on ${device.activationDate}` 
      }));
      return;
    }
    
    // 4. Get user info (or create basic profile if user doesn't exist)
    let installer = authorizedUsers.get(cleanPhone);
    if (!installer) {
      installer = {
        name: deviceName.split(' ')[0] + ' User',
        email: cleanPhone + '@gatecontroller.local',
        canActivateDevices: true
      };
      authorizedUsers.set(cleanPhone, installer);
      console.log(`New user created during activation: ${cleanPhone}`);
    }
    
    // 5. Update manufacturing database
    device.activated = true;
    device.activatedBy = cleanPhone;
    device.activationDate = new Date().toISOString();
    device.name = deviceName || `Gate ${serial}`;
    device.location = location || 'Location not specified';
    
// 6. AUTO-ASSIGN TO PLATFORM ORGANIZATION
const platformOrg = organizations.get('platform_org');
if (platformOrg) {
  if (!platformOrg.devices.includes(serial)) {
    platformOrg.devices.push(serial);
    organizations.set('platform_org', platformOrg);
    
    // Save to Firebase
    await saveOrganizationToFirebase('platform_org', platformOrg);
    
    console.log(`✅ Gate ${serial} auto-assigned to platform_org`);
  }
}
    
    // 7. Create Firebase gate document
    if (firebaseInitialized) {
      try {
        await db.collection('gates').doc(serial).set({
          serial: serial,
          name: device.name,
          location: device.location,
          timezone: 'Asia/Jerusalem',
          hardwareVersion: device.hardwareVersion || 'v1.0',
          firmwareVersion: device.firmwareVersion || '1.0.0',
          manufactureDate: device.manufactureDate || new Date().toISOString(),
          activatedBy: cleanPhone,
          activationDate: admin.firestore.FieldValue.serverTimestamp(),
          owner: 'platform_org',  // Platform is primary owner
          organizations: ['platform_org'],  // Start with platform only
          admins: [cleanPhone],
          users: {
            [cleanPhone]: {
              name: installer.name,
              email: installer.email,
              relayMask: 15,
              userLevel: 2,
              role: 'admin',
              addedBy: 'activation',
              addedDate: admin.firestore.FieldValue.serverTimestamp()
            }
          }
        });
        
        // Create user permissions
        await db.collection('userPermissions').doc(cleanPhone).set({
          gates: {
            [serial]: {
              name: device.name,
              relayMask: 15,
              role: 'admin',
              addedBy: 'activation',
              addedDate: admin.firestore.FieldValue.serverTimestamp()
            }
          }
        }, { merge: true });
        
        // Update platform organization in Firebase
        await db.collection('organizations').doc('platform_org').set({
          id: 'platform_org',
          name: 'Gate Controller Platform',
          type: 'platform',
          devices: admin.firestore.FieldValue.arrayUnion(serial)
        }, { merge: true });
        
        console.log(`Device activated: ${serial} by ${installer.name}`);
        
      } catch (firebaseError) {
        console.error('Firebase activation error:', firebaseError);
        res.writeHead(500);
        res.end(JSON.stringify({ 
          success: false, 
          error: 'Firebase write failed: ' + firebaseError.message 
        }));
        return;
      }
    }
    
    // Add to local storage
    if (!registeredUsers.has(serial)) {
      registeredUsers.set(serial, []);
    }
    registeredUsers.get(serial).push({
      email: installer.email,
      phone: cleanPhone,
      name: installer.name,
      relayMask: 15,
      userLevel: 2
    });
    
    addDeviceLog(serial, 'activation', installer.name, 
      `Device: ${device.name}, Location: ${device.location}, Auto-assigned to platform_org`);
    
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      message: 'Device activated successfully',
      serial: serial,
      deviceName: device.name,
      location: device.location,
      installerName: installer.name,
      firebase_status: firebaseInitialized ? 'synced' : 'local_only',
      platform_assigned: true
    }));
  });
  return;
}
  
  // Dashboard login endpoint
if (req.url === '/dashboard/login' && req.method === 'POST') {
    readBody((data) => {
        const { email, password } = data;
        const user = DASHBOARD_USERS.get(email);
        
if (user && user.password === password) {
    const sessionToken = generateSessionToken();
    
    // Get organization role
    const orgRole = getUserOrgRole(email);
    
    activeSessions.set(sessionToken, {
        email: email,
        name: user.name,
        userLevel: user.userLevel,
        organizationRole: orgRole,  // ✅ ADD THIS
        phone: user.phone,
        loginTime: new Date().toISOString()
});

console.log(`🔐 Dashboard login successful: ${email} (userLevel: ${user.userLevel}, orgRole: ${orgRole})`);
        
        console.log(`🔐 Dashboard login successful: ${email}`);
        
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Set-Cookie': `session=${sessionToken}; HttpOnly; Path=/; Max-Age=86400` // 24 hours
        });
res.end(JSON.stringify({
  success: true,
  message: 'Login successful',
  user: { 
    email, 
    name: user.name, 
    userLevel: user.userLevel,
    organizationRole: orgRole  // ✅ ADD THIS
  }
}));
      } else {
        console.log(`🔐 Dashboard login failed: ${email}`);
        res.writeHead(401);
        res.end(JSON.stringify({
          success: false,
          message: 'Invalid email or password'
        }));
      }
    });
    return;
  }

  // Dashboard logout endpoint
  if (req.url === '/dashboard/logout' && req.method === 'POST') {
    const sessionToken = getSessionFromCookie(req.headers.cookie);
    if (sessionToken && activeSessions.has(sessionToken)) {
      const session = activeSessions.get(sessionToken);
      activeSessions.delete(sessionToken);
      console.log(`🔐 Dashboard logout: ${session.email}`);
    }
    
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Set-Cookie': 'session=; HttpOnly; Path=/; Max-Age=0'
    });
    res.end(JSON.stringify({ success: true, message: 'Logged out' }));
    return;
  }

  // ==================== DASHBOARD USER MANAGEMENT ENDPOINTS ====================

// Get all dashboard users (SuperAdmin only) - READ FROM FIREBASE
if (req.url === '/api/dashboard-users' && req.method === 'GET') {
  requireAuth(async (session) => {  // ← Add async here
    const userRole = getUserHighestRole(session.email);
    
    if (userRole !== 'superadmin') {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'SuperAdmin access required' }));
      return;
    }
    
    try {
      let users = [];
      
      if (firebaseInitialized) {
        // READ FROM FIREBASE (source of truth)
        const usersSnapshot = await db.collection('dashboardUsers').get();
        
        usersSnapshot.forEach(doc => {
          users.push({
            email: doc.id,
            name: doc.data().name || 'Unknown',
            phone: doc.data().phone || '',
            userLevel: doc.data().userLevel || 0,
            organizationRole: doc.data().organizationRole || 'user'
          });
        });
        
        console.log(`📋 Loaded ${users.length} dashboard users from Firebase for display`);
      } else {
        // Fallback to memory if Firebase unavailable
        users = Array.from(DASHBOARD_USERS.entries()).map(([email, user]) => ({
          email: email,
          name: user.name || 'Unknown',
          phone: user.phone || '',
          userLevel: user.userLevel || 0,
          organizationRole: user.organizationRole || 'user'
        }));
        
        console.log(`⚠️ Loaded ${users.length} dashboard users from memory (Firebase unavailable)`);
      }
      
      res.writeHead(200);
      res.end(JSON.stringify(users));
      
    } catch (error) {
      console.error('❌ Error reading dashboard users:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to load users' }));
    }
  });
  return;
}
  
// Get single dashboard user
if (req.url.match(/^\/api\/dashboard-users\/[^\/]+$/) && req.method === 'GET') {
  requireAuth((session) => {
    const userRole = getUserHighestRole(session.email);
    
    if (userRole !== 'superadmin') {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'SuperAdmin access required' }));
      return;
    }
    
    const email = decodeURIComponent(req.url.split('/').pop());
    const user = DASHBOARD_USERS.get(email);
    
    if (!user) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'User not found' }));
      return;
    }
    
    res.writeHead(200);
    res.end(JSON.stringify({
      email: email,
      name: user.name,
      phone: user.phone,
      userLevel: user.userLevel,
      organizationRole: user.organizationRole || userLevelToRole(user.userLevel)
    }));
  });
  return;
}

// Create new dashboard user (SuperAdmin only)
// Create new dashboard user (SuperAdmin only)
if (req.url === '/api/dashboard-users' && req.method === 'POST') {
  requireAuth((session) => {
    const userRole = getUserHighestRole(session.email);
    
    if (userRole !== 'superadmin') {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'SuperAdmin access required' }));
      return;
    }
    
    readBody(async (data) => {  // ← Make sure it's async
      const { email, name, phone, password, organizationRole, userLevel } = data;
      
      if (!email || !name || !phone || !password) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Email, name, phone, and password are required' }));
        return;
      }
      
      if (DASHBOARD_USERS.has(email)) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'User with this email already exists' }));
        return;
      }
      
      // Validate phone
      const phoneValidation = validatePhoneNumber(phone);
      if (!phoneValidation.valid) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: phoneValidation.message }));
        return;
      }
      
      // Validate password
      if (password.length < 6) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Password must be at least 6 characters' }));
        return;
      }
      
      const newUser = {
        password: password,
        name: name,
        userLevel: userLevel || 0,
        phone: phoneValidation.cleanPhone,
        organizationRole: organizationRole || 'user'
      };
      
      // Save to memory
      DASHBOARD_USERS.set(email, newUser);
      
      // ✅ Save to Firebase
      const firebaseResult = await saveDashboardUserToFirebase(email, newUser);
      
      console.log(`✅ Dashboard user created: ${email} (${organizationRole}) - Firebase: ${firebaseResult.success ? 'synced' : 'local_only'}`);
      
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        message: 'User created successfully',
        email: email,
        firebase_status: firebaseResult.success ? 'synced' : 'local_only'
      }));
    });
  });
  return;
}

// Update dashboard user (SuperAdmin only)
if (req.url.match(/^\/api\/dashboard-users\/[^\/]+$/) && req.method === 'PUT') {
  requireAuth((session) => {
    const userRole = getUserHighestRole(session.email);
    
    if (userRole !== 'superadmin') {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'SuperAdmin access required' }));
      return;
    }
    
    const email = decodeURIComponent(req.url.split('/').pop());
    const user = DASHBOARD_USERS.get(email);
    
    if (!user) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'User not found' }));
      return;
    }
    
    readBody((data) => {
      const { name, phone, password, organizationRole, userLevel } = data;
      
      // Validate phone if provided
      if (phone) {
        const phoneValidation = validatePhoneNumber(phone);
        if (!phoneValidation.valid) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: phoneValidation.message }));
          return;
        }
        user.phone = phoneValidation.cleanPhone;
      }
      
      // Validate password if provided
      if (password) {
        if (password.length < 6) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Password must be at least 6 characters' }));
          return;
        }
        user.password = password;
      }
      
      // Update other fields
      if (name) user.name = name;
      if (organizationRole) user.organizationRole = organizationRole;
      if (userLevel !== undefined) user.userLevel = userLevel;
      
      DASHBOARD_USERS.set(email, user);
      
      console.log(`✅ Dashboard user updated: ${email}`);
      
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        message: 'User updated successfully'
      }));
    });
  });
  return;
}

// Change password (SuperAdmin or self)
if (req.url.match(/^\/api\/dashboard-users\/[^\/]+\/password$/) && req.method === 'PUT') {
  requireAuth((session) => {
    const email = decodeURIComponent(req.url.split('/')[3]);
    const userRole = getUserHighestRole(session.email);
    
    // Allow superadmin or self
    if (userRole !== 'superadmin' && session.email !== email) {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'Access denied' }));
      return;
    }
    
    const user = DASHBOARD_USERS.get(email);
    
    if (!user) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'User not found' }));
      return;
    }
    
    readBody((data) => {
      const { password } = data;
      
      if (!password || password.length < 6) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Password must be at least 6 characters' }));
        return;
      }
      
      user.password = password;
      DASHBOARD_USERS.set(email, user);
      
      console.log(`✅ Password changed for: ${email}`);
      
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        message: 'Password changed successfully'
      }));
    });
  });
  return;
}

// Delete dashboard user (SuperAdmin only)
// Delete dashboard user (SuperAdmin only)
if (req.url.match(/^\/api\/dashboard-users\/[^\/]+$/) && req.method === 'DELETE') {
  requireAuth(async (session) => {  // ← Make sure it's async
    const userRole = getUserHighestRole(session.email);
    
    if (userRole !== 'superadmin') {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'SuperAdmin access required' }));
      return;
    }
    
    const email = decodeURIComponent(req.url.split('/').pop());
    
    if (email === session.email) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Cannot delete your own account' }));
      return;
    }
    
    if (!DASHBOARD_USERS.has(email)) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'User not found' }));
      return;
    }
    
    // Delete from memory
    DASHBOARD_USERS.delete(email);
    
    // ✅ Delete from Firebase
    const firebaseResult = await deleteDashboardUserFromFirebase(email);
    
    console.log(`✅ Dashboard user deleted: ${email} (Firebase: ${firebaseResult.success ? 'synced' : 'local_only'})`);
    
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      message: 'User deleted successfully'
    }));
  });
  return;
}
  
// ESP32 Heartbeat endpoint (no auth required for device communication)
if (req.url === '/api/device/heartbeat' && req.method === 'POST') {
  console.log(`💓 Heartbeat from ESP32: ${req.method} ${req.url}`);
  
  readBody((data) => {
    const deviceId = data.deviceId || 'unknown';
    const timestamp = new Date().toISOString();
    
    const mfgDevice = manufacturingDevices.get(deviceId);
    const existingDevice = connectedDevices.get(deviceId) || {};

    connectedDevices.set(deviceId, {
      ...existingDevice,  // Preserve ALL existing fields including settings
      lastHeartbeat: timestamp,
      status: data.status || 'online',  // FIXED: was missing 'status'
      signalStrength: data.signalStrength || 0,
      batteryLevel: data.batteryLevel || 0,
      firmwareVersion: data.firmwareVersion || '1.0.0',
      uptime: data.uptime || 0,
      freeHeap: data.freeHeap || 0,
      connectionType: data.connectionType || 'wifi',
      macAddress: data.macAddress || 'Unknown',
      name: mfgDevice ? mfgDevice.name : deviceId,
      location: mfgDevice ? mfgDevice.location : 'Unknown location'
    });

// Auto-assign to platform_org if not already assigned
const platformOrg = organizations.get('platform_org');
if (platformOrg && !platformOrg.devices.includes(deviceId)) {
  platformOrg.devices.push(deviceId);
  organizations.set('platform_org', platformOrg);
  
  // Save to Firebase (async, don't block heartbeat)
  saveOrganizationToFirebase('platform_org', platformOrg).catch(err => {
    console.error('Failed to save org on heartbeat:', err);
  });
  
  console.log(`✅ Auto-assigned ${deviceId} to platform_org on heartbeat`);
}
    
    addDeviceLog(deviceId, 'heartbeat', 'system', `Signal: ${data.signalStrength}dBm`);
    
    addDeviceLog(deviceId, 'heartbeat', 'system', `Signal: ${data.signalStrength}dBm`);
    
    console.log(`💓 Device ${deviceId} heartbeat received`);
    
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      message: "Heartbeat received",
      timestamp: timestamp,
      deviceId: deviceId
    }));
  });
  return;
}

// ESP32 Command check endpoint - GET /api/device/{deviceId}/commands (no auth required)
if (req.url.startsWith('/api/device/') && req.url.endsWith('/commands') && req.method === 'GET') {
  const urlParts = req.url.split('/');
  const deviceId = urlParts[3];
  
  console.log(`📥 Command check from ESP32 device: ${deviceId}`);
  
  const deviceCommandQueue = deviceCommands.get(deviceId) || [];
  deviceCommands.set(deviceId, []);
  
  console.log(`📋 Sending ${deviceCommandQueue.length} commands to device ${deviceId}`);
  
  res.writeHead(200);
  res.end(JSON.stringify(deviceCommandQueue));
  return;
}
  
  // ESP32 Authentication endpoint (no auth required)
  if (req.url === '/api/device/auth' && req.method === 'POST') {
    console.log(`🔐 Auth request from ESP32: ${req.method} ${req.url}`);
    
    readBody((data) => {
      const deviceId = data.deviceId || 'unknown';
      const deviceType = data.deviceType || 'unknown';
      const firmwareVersion = data.firmwareVersion || '1.0.0';
      
      console.log(`🔐 Authenticating device: ${deviceId} (${deviceType}) v${firmwareVersion}`);
      
      // Add log entry
      addDeviceLog(deviceId, 'authentication', 'system', `Device type: ${deviceType}, Firmware: ${firmwareVersion}`);
      
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        token: "device_token_" + deviceId + "_" + Date.now(),
        message: "Device authenticated",
        deviceId: deviceId
      }));
    });
    return;
  }

  // Protected dashboard endpoints - require login
  function requireAuth(callback) {
    const sessionToken = getSessionFromCookie(req.headers.cookie);
    if (!sessionToken || !validateSession(sessionToken)) {
      // Return login page for dashboard access
      if (req.url === '/dashboard' || req.url === '/') {
        const loginHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>🔐 Gate Controller Login</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0; 
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .login-container { 
            background: white; 
            padding: 40px; 
            border-radius: 15px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            max-width: 400px;
            width: 90%;
        }
        .login-header { 
            text-align: center; 
            margin-bottom: 30px;
            color: #333;
        }
        .login-header h1 {
            margin: 0;
            font-size: 2em;
            color: #667eea;
        }
        .form-group { margin-bottom: 20px; }
        label { 
            display: block; 
            margin-bottom: 5px; 
            font-weight: bold;
            color: #555;
        }
        input { 
            width: 100%; 
            padding: 12px; 
            border: 2px solid #ddd; 
            border-radius: 8px; 
            font-size: 16px;
            box-sizing: border-box;
        }
        input:focus {
            outline: none;
            border-color: #667eea;
        }
        button { 
            width: 100%; 
            padding: 12px; 
            background: #667eea; 
            color: white; 
            border: none; 
            border-radius: 8px; 
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: background 0.3s;
        }
        button:hover { background: #5a6fd8; }
        .error { 
            color: #dc3545; 
            margin-top: 10px; 
            text-align: center;
            font-weight: bold;
        }
        .demo-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            font-size: 14px;
            border-left: 4px solid #17a2b8;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-header">
            <h1>🚪 Gate Controller</h1>
            <p>Dashboard Login</p>
        </div>
        
        <form id="loginForm">
            <div class="form-group">
                <label for="email">Email:</label>
                <input type="email" id="email" name="email" required>
            </div>
            
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required>
            </div>
            
            <button type="submit">🔐 Login</button>
            
            <div id="error" class="error"></div>
        </form>
        
        <div class="demo-info">
            <strong>Demo Credentials:</strong><br>
            Email: <code>admin@gatecontroller.com</code> / Password: <code>admin123</code><br>
            Email: <code>manager@gatecontroller.com</code> / Password: <code>gate2024</code>
        </div>
    </div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('error');
            
            try {
                const response = await fetch('/dashboard/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json; charset=utf-8' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    window.location.href = '/dashboard';
                } else {
                    errorDiv.textContent = data.message || 'Login failed';
                }
            } catch (error) {
                errorDiv.textContent = 'Connection error: ' + error.message;
            }
        });
    </script>
</body>
</html>`;
        
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(loginHtml);
        return;
      } else {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Authentication required' }));
        return;
      }
    }
    
    const session = activeSessions.get(sessionToken);
    callback(session);
  }

// Protected dashboard - require auth (UPDATED with organization context)
if (req.url === '/dashboard') {
  requireAuth((session) => {
    // Get user's organizations and role
    const userOrgs = getUserOrganizations(session.email);
    const userRole = getUserHighestRole(session.email);
    const isSuperAdmin = (userRole === 'superadmin');
    const isAdminPlus = isAdminOrHigher(userRole);  // ✅ ADD THIS LINE
    
    // Get gates based on role
    const userGates = getUserGates(session.email, userRole);
    
    // Filter connected devices to only show user's gates
    const userDevices = Array.from(connectedDevices.entries())
      .filter(([deviceId]) => userGates.includes(deviceId));
    
    // Get user's primary organization (first one or platform)
    const primaryOrg = userOrgs.length > 0 ? userOrgs[0] : null;
    
    const dashboardData = {
      userName: session.name,
      userEmail: session.email,
      userPhone: session.phone,
      userLevel: session.userLevel,
      userRole: userRole,
      isSuperAdmin: isSuperAdmin ? 'true' : 'false',
      organizationName: primaryOrg ? primaryOrg.name : 'No Organization',
      organizationId: primaryOrg ? primaryOrg.id : null,
      organizationsData: JSON.stringify(userOrgs),
      serverPort: PORT,
      currentTime: new Date().toISOString(),
      deviceCount: userDevices.length,
      totalDeviceCount: connectedDevices.size,
      activeSessionsCount: activeSessions.size,
      firebase: firebaseInitialized ? 'Connected' : 'Not Connected',
      devicesData: JSON.stringify(userDevices),
      registeredUsersData: JSON.stringify(Array.from(registeredUsers.entries())),
      showActivationPanel: isAdminPlus ? 'block' : 'none',
      showSuperAdminFeatures: isSuperAdmin ? 'block' : 'none',
      showAdminFeatures: isAdminPlus ? 'block' : 'none'  // ✅ ADD THIS LINE
    };
    
    console.log("Dashboard access:", {
      user: session.email,
      role: userRole,
      isSuperAdmin: isSuperAdmin,
      isAdminPlus: isAdminPlus,  // ✅ ADD THIS LINE
      gatesVisible: userDevices.length,
      totalGates: connectedDevices.size
    });
    
    const dashboardHtml = renderTemplate('dashboard', dashboardData);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(dashboardHtml);
  });
  return;
}

// ==================== ORGANIZATION MANAGEMENT ENDPOINTS ====================

// Get all organizations (SuperAdmin only)
if (req.url === '/api/organizations' && req.method === 'GET') {
  requireAuth((session) => {
    const userRole = getUserHighestRole(session.email);
    
    if (userRole !== 'superadmin') {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'SuperAdmin access required' }));
      return;
    }
    
    const orgsList = Array.from(organizations.values());
    res.writeHead(200);
    res.end(JSON.stringify(orgsList));
  });
  return;
}

// Get user's organizations
if (req.url === '/api/user/organizations' && req.method === 'GET') {
  requireAuth((session) => {
    const userOrgs = getUserOrganizations(session.email);
    res.writeHead(200);
    res.end(JSON.stringify(userOrgs));
  });
  return;
}

// Create new organization (SuperAdmin only)
if (req.url === '/api/organizations' && req.method === 'POST') {
  requireAuth((session) => {
    const userRole = getUserHighestRole(session.email);
    
    if (userRole !== 'superadmin') {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'SuperAdmin access required' }));
      return;
    }
    
    readBody(async (data) => {
      const { name, type } = data;
      
      if (!name || !type) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Name and type required' }));
        return;
      }
      
      const orgId = 'org_' + Date.now();
      
      const newOrg = {
        id: orgId,
        name: name,
        type: type,  // platform | service_provider | customer
        createdAt: new Date().toISOString(),
        createdBy: session.email,
        devices: [],
        members: {}
      };
      
// Store locally
organizations.set(orgId, newOrg);

// Store in Firebase
const firebaseResult = await saveOrganizationToFirebase(orgId, newOrg);

console.log(`✅ Organization created: ${orgId} (Firebase: ${firebaseResult.success ? 'synced' : 'local_only'})`);
      
      
      console.log(`✅ Organization created: ${name} (${orgId})`);
      
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        organization: newOrg
      }));
    });
  });
  return;
}

// Assign gate to organization (SuperAdmin only)
if (req.url === '/api/organizations/assign-gate' && req.method === 'POST') {
  requireAuth((session) => {
    const userRole = getUserHighestRole(session.email);
    
    if (userRole !== 'superadmin') {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'SuperAdmin access required' }));
      return;
    }
    
    readBody(async (data) => {
      const { organizationId, gateSerial } = data;
      
      if (!organizationId || !gateSerial) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Organization ID and gate serial required' }));
        return;
      }
      
      const org = organizations.get(organizationId);
      if (!org) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Organization not found' }));
        return;
      }
      
      // Add gate to organization's devices array
      if (!org.devices.includes(gateSerial)) {
        org.devices.push(gateSerial);
        organizations.set(organizationId, org);
      }
      
      // Update Firebase gate document
const firebaseResult = await saveOrganizationToFirebase(organizationId, org);
if (firebaseInitialized && gateRef) {
        try {
          const gateRef = db.collection('gates').doc(gateSerial);
          const gateDoc = await gateRef.get();
          
          if (gateDoc.exists) {
            const currentOrgs = gateDoc.data().organizations || [];
            if (!currentOrgs.includes(organizationId)) {
              await gateRef.update({
                organizations: admin.firestore.FieldValue.arrayUnion(organizationId)
              });
            }
          }
          
          // Update organization document
          await db.collection('organizations').doc(organizationId).update({
            devices: admin.firestore.FieldValue.arrayUnion(gateSerial)
          });
          
          console.log(`✅ Gate ${gateSerial} assigned to org ${organizationId} in Firebase`);
        } catch (error) {
          console.error('❌ Firebase gate assignment error:', error);
        }
      }
      
      console.log(`✅ Gate ${gateSerial} assigned to organization ${organizationId}`);
      
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        message: 'Gate assigned to organization'
      }));
    });
  });
  return;
}

// Remove gate from organization (SuperAdmin only) - PREVENT REMOVING FROM PLATFORM
if (req.url === '/api/organizations/remove-gate' && req.method === 'POST') {
  requireAuth((session) => {
    const userRole = getUserHighestRole(session.email);
    
    if (userRole !== 'superadmin') {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'SuperAdmin access required' }));
      return;
    }
    
    readBody(async (data) => {
      const { organizationId, gateSerial } = data;
      
      // PREVENT REMOVING FROM PLATFORM ORGANIZATION
      if (organizationId === 'platform_org') {
        res.writeHead(403);
        res.end(JSON.stringify({ 
          error: 'Cannot remove gates from platform organization. Platform owns all devices.' 
        }));
        return;
      }
      
      const org = organizations.get(organizationId);
      if (!org) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Organization not found' }));
        return;
      }
      
      // Remove gate from organization
      org.devices = org.devices.filter(d => d !== gateSerial);
organizations.set(organizationId, org);

// Update Firebase
const firebaseResult = await saveOrganizationToFirebase(organizationId, org);

console.log(`✅ Member ${userEmail} added to org ${organizationId} (Firebase: ${firebaseResult.success ? 'synced' : 'local_only'})`);
      
      
      console.log(`✅ Gate ${gateSerial} removed from organization ${organizationId}`);
      
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        message: 'Gate removed from organization'
      }));
    });
  });
  return;
}

// Add member to organization (Admin or SuperAdmin)
if (req.url === '/api/organizations/add-member' && req.method === 'POST') {
  requireAuth((session) => {
    readBody(async (data) => {
      const { organizationId, userEmail, userName, userPhone, role } = data;
      
      if (!organizationId || !userEmail || !role) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Organization ID, email, and role required' }));
        return;
      }
      
      const org = organizations.get(organizationId);
      if (!org) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Organization not found' }));
        return;
      }
      
      // Check if session user has permission to add members
      const sessionMember = org.members[session.email];
      const sessionRole = getUserHighestRole(session.email);
      
      if (!sessionMember && sessionRole !== 'superadmin') {
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'You are not a member of this organization' }));
        return;
      }
      
      if (sessionMember && sessionMember.role !== 'superadmin' && sessionMember.role !== 'admin') {
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'Admin or SuperAdmin access required' }));
        return;
      }
      
      // Add member to organization
      org.members[userEmail] = {
        role: role,  // superadmin | admin | manager
        phone: userPhone,
        name: userName,
        addedAt: new Date().toISOString(),
        addedBy: session.email
      };
      
      organizations.set(organizationId, org);
      
      // Update Firebase
      const firebaseResult = await saveOrganizationToFirebase(organizationId, org);
      
      console.log(`✅ Member ${userEmail} added to org ${organizationId} (Firebase: ${firebaseResult.success ? 'synced' : 'local_only'})`);
      
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        message: 'Member added to organization'
      }));
    });
  });
  return;
}

// Remove member from organization (Admin or SuperAdmin)
if (req.url === '/api/organizations/remove-member' && req.method === 'POST') {
  requireAuth((session) => {
    readBody(async (data) => {
      const { organizationId, userEmail } = data;
      
      if (!organizationId || !userEmail) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Organization ID and email required' }));
        return;
      }
      
      const org = organizations.get(organizationId);
      if (!org) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Organization not found' }));
        return;
      }
      
      // Check if session user has permission to remove members
      const sessionRole = getUserHighestRole(session.email);
      const sessionMember = org.members[session.email];
      
      // SuperAdmin can always remove members
      if (sessionRole === 'superadmin') {
        // Allow - superadmin has access to all organizations
      } else if (!sessionMember) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'You are not a member of this organization' }));
        return;
      } else if (sessionMember.role !== 'admin' && sessionMember.role !== 'superadmin') {
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'Admin or SuperAdmin access required' }));
        return;
      }
      
      // Prevent removing yourself
      if (userEmail === session.email) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Cannot remove yourself from the organization' }));
        return;
      }
      
      // Check if user is a member
      if (!org.members[userEmail]) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'User is not a member of this organization' }));
        return;
      }
      
      // Prevent removing the last superadmin from platform_org
      if (organizationId === 'platform_org' && org.members[userEmail].role === 'superadmin') {
        const superadminCount = Object.values(org.members).filter(m => m.role === 'superadmin').length;
        if (superadminCount <= 1) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Cannot remove the last superadmin from platform organization' }));
          return;
        }
      }
      
      // Remove member from organization
      delete org.members[userEmail];
      organizations.set(organizationId, org);
      
      // Update Firebase
      const firebaseResult = await saveOrganizationToFirebase(organizationId, org);
      
      console.log(`✅ Member ${userEmail} removed from org ${organizationId} (Firebase: ${firebaseResult.success ? 'synced' : 'local_only'})`);
      
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        message: 'Member removed from organization'
      }));
    });
  });
  return;
}
  
// Get organization details (Members can view their own org)
if (req.url.match(/^\/api\/organizations\/[^\/]+$/) && req.method === 'GET') {
  requireAuth((session) => {
    const orgId = req.url.split('/').pop();
    const org = organizations.get(orgId);
    
    if (!org) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Organization not found' }));
      return;
    }
    
    // Check if user is member or superadmin
    const userRole = getUserHighestRole(session.email);
    const isMember = org.members[session.email];
    
    if (!isMember && userRole !== 'superadmin') {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'Access denied' }));
      return;
    }
    
    res.writeHead(200);
    res.end(JSON.stringify(org));
  });
  return;
}  

// Devices page
if (req.url === '/devices') {
  requireAuth((session) => {
    // 🔒 ACCESS CONTROL CHECK - Admin+ only
    const userRole = getUserHighestRole(session.email);
    const isAdminPlus = isAdminOrHigher(userRole);
    
    // Regular users and managers cannot access Devices page
    if (!isAdminPlus) {
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderTemplate('access-denied', {
        userName: session.name,
        userRole: userRole,
        message: 'Devices page requires Admin or SuperAdmin access'
      }));
      return;
    }
    // ✅ END OF ACCESS CONTROL CHECK
    
    const isSuperAdmin = (userRole === 'superadmin');
    const userOrgs = getUserOrganizations(session.email);
    const primaryOrg = userOrgs.length > 0 ? userOrgs[0] : { name: 'No Organization' };
    
    const devicesData = {
      userName: session.name,
      userEmail: session.email,
      userPhone: session.phone,
      userLevel: session.userLevel,
      userRole: userRole,
      isSuperAdmin: isSuperAdmin ? 'true' : 'false',
      showSuperAdminFeatures: isSuperAdmin ? 'block' : 'none',
      showAdminFeatures: isAdminPlus ? 'block' : 'none',  // ✅ NEW
      organizationName: primaryOrg.name,
      devicesData: JSON.stringify(Array.from(connectedDevices.entries())),
      registeredUsersData: JSON.stringify(Array.from(registeredUsers.entries())),
      showActivationPanel: isAdminPlus ? 'block' : 'none'
    };
    
    const devicesHtml = renderTemplate('devices', devicesData);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(devicesHtml);
  });
  return;
}

  // Manufacturing page
if (req.url === '/manufacturing') {
  requireAuth((session) => {
    // 🔒 UPDATED ACCESS CONTROL - Using role-based check
    const userRole = getUserHighestRole(session.email);
    
    if (userRole !== 'superadmin') {
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderTemplate('access-denied', {
        userName: session.name,
        userRole: userRole,
        message: 'Manufacturing DB requires SuperAdmin access'
      }));
      return;
    }
    // ✅ END OF ACCESS CONTROL CHECK
    
    // Your existing code continues below (unchanged)
    const manufacturingData = {
      userName: session.name,
      userEmail: session.email,
      showAdminFeatures: 'block',  // ✅ ADD THIS LINE
      manufacturingDevicesData: JSON.stringify(Array.from(manufacturingDevices.entries()))
    };
    
    const manufacturingHtml = renderTemplate('manufacturing', manufacturingData);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(manufacturingHtml);
  });
  return;
}

// System page
if (req.url === '/system') {
  requireAuth((session) => {
    // 🔒 ACCESS CONTROL CHECK - ADD THIS BLOCK FIRST
    const userRole = getUserHighestRole(session.email);
    
    if (userRole !== 'superadmin') {
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderTemplate('access-denied', {
        userName: session.name,
        userRole: userRole,
        message: 'System page requires SuperAdmin access'
      }));
      return;
    }
    // ✅ END OF ACCESS CONTROL CHECK
    
    // Your existing code continues below (unchanged)
    const systemData = {
      userName: session.name,
      userEmail: session.email,
      nodeEnv: process.env.NODE_ENV || 'development',
      railwayEnv: process.env.RAILWAY_ENVIRONMENT || 'local',
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      connectedDevices: connectedDevices.size,
      activeSessions: activeSessions.size,
      showAdminFeatures: 'block',  // ✅ ADD THIS LINE
      firebaseStatus: firebaseInitialized ? 'Connected' : 'Not Connected'
    };
    
    const systemHtml = renderTemplate('system', systemData);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(systemHtml);
  });
  return;
}

  // System information endpoint
  if (req.url === '/api/system/info' && req.method === 'GET') {
    requireAuth((session) => {
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      res.writeHead(200);
      res.end(JSON.stringify({
        nodeEnv: process.env.NODE_ENV || 'development',
        railwayEnv: process.env.RAILWAY_ENVIRONMENT || 'local',
        memoryUsage: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal
        },
        uptime: uptime,
        connectedDevices: connectedDevices.size,
        activeSessions: activeSessions.size
      }));
    });
    return;
  }

  // Clear cache endpoint
  if (req.url === '/api/system/clear-cache' && req.method === 'POST') {
    requireAuth((session) => {
      if (session.userLevel < 2) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'Admin access required' }));
        return;
      }
      
      // Clear temporary data but keep important user data
      deviceCommands.clear();
      deviceLogs.clear();
      
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        message: 'Cache cleared successfully'
      }));
    });
    return;
  }

  // Export data endpoint
  if (req.url === '/api/system/export' && req.method === 'GET') {
    requireAuth((session) => {
      if (session.userLevel < 2) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'Admin access required' }));
        return;
      }
      
      const exportData = {
        timestamp: new Date().toISOString(),
        connectedDevices: Array.from(connectedDevices.entries()),
        registeredUsers: Array.from(registeredUsers.entries()),
        manufacturingDevices: Array.from(manufacturingDevices.entries()),
        authorizedUsers: Array.from(authorizedUsers.entries()),
        deviceLogs: Array.from(deviceLogs.entries()),
        dashboardUsers: Array.from(DASHBOARD_USERS.entries()).map(([email, user]) => ({
          email,
          name: user.name,
          userLevel: user.userLevel,
          phone: user.phone
        }))
      };
      
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="gate-controller-export.json"'
      });
      res.end(JSON.stringify(exportData, null, 2));
    });
    return;
  }

// Get device info endpoint (requires auth)
if (req.url.startsWith('/api/device/') && req.url.endsWith('/info') && req.method === 'GET') {
  requireAuth((session) => {
    const urlParts = req.url.split('/');
    const deviceId = urlParts[3];
    
    const device = connectedDevices.get(deviceId);
    
    if (!device) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Device not found' }));
      return;
    }
    
    res.writeHead(200);
    res.end(JSON.stringify(device));
  });
  return;
}
  
  // Restart server endpoint
  if (req.url === '/api/system/restart' && req.method === 'POST') {
    requireAuth((session) => {
      if (session.userLevel < 2) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'Admin access required' }));
        return;
      }
      
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        message: 'Server restart initiated'
      }));
      
      // Restart after a short delay
      setTimeout(() => {
        console.log('🔄 Server restart requested by:', session.email);
        process.exit(0);
      }, 1000);
    });
    return;
  }

  // Manufacturing device management endpoints
  if (req.url === '/api/manufacturing/add-device' && req.method === 'POST') {
    requireAuth((session) => {
      if (session.userLevel < 2) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'Admin access required' }));
        return;
      }
      
      readBody((data) => {
        const { serial, pin } = data;
        
        if (!serial || !pin) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Serial and PIN required' }));
          return;
        }
        
        if (manufacturingDevices.has(serial)) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Device already exists' }));
          return;
        }
        
        manufacturingDevices.set(serial, {
          pin: pin,
          activated: false,
          createdDate: new Date().toISOString(),
          activatedDate: null,
          activatedBy: null
        });
        
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          message: 'Device added successfully',
          serial: serial
        }));
      });
    });
    return;
  }

  if (req.url === '/api/manufacturing/edit-device' && req.method === 'PUT') {
    requireAuth((session) => {
      if (session.userLevel < 2) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'Admin access required' }));
        return;
      }
      
      readBody((data) => {
        const { serial, pin } = data;
        
        if (!manufacturingDevices.has(serial)) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Device not found' }));
          return;
        }
        
        const device = manufacturingDevices.get(serial);
        device.pin = pin;
        manufacturingDevices.set(serial, device);
        
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          message: 'Device updated successfully'
        }));
      });
    });
    return;
  }

  if (req.url === '/api/manufacturing/delete-device' && req.method === 'DELETE') {
    requireAuth((session) => {
      if (session.userLevel < 2) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'Admin access required' }));
        return;
      }
      
      readBody((data) => {
        const { serial } = data;
        
        if (!manufacturingDevices.has(serial)) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Device not found' }));
          return;
        }
        
        manufacturingDevices.delete(serial);
        
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          message: 'Device deleted successfully'
        }));
      });
    });
    return;
  }

  // Firebase  endpoint
  if (req.url === '/api/firebase/' && req.method === 'GET') {
    requireAuth((session) => {
      res.writeHead(200);
      res.end(JSON.stringify({
        firebase_initialized: firebaseInitialized,
        project_id: process.env.FIREBASE_PROJECT_ID ? 'SET' : 'MISSING',
        client_email: process.env.FIREBASE_CLIENT_EMAIL ? 'SET' : 'MISSING',
        private_key: process.env.FIREBASE_PRIVATE_KEY ? `SET (${process.env.FIREBASE_PRIVATE_KEY.length} chars)` : 'MISSING',
        status: firebaseInitialized ? 'Connected' : 'Not Connected'
      }));
    });
    return;
  }

// Get device settings - TEMPORARY: No auth for debugging
if (req.url.startsWith('/api/device/') && req.url.endsWith('/settings') && req.method === 'GET') {
  const urlParts = req.url.split('/');
  const deviceId = urlParts[3];
  
  console.log(`🔍 GET settings request for device: ${deviceId}`);
  console.log(`🔍 URL was: ${req.url}`);
  console.log(`🔍 Connected devices:`, Array.from(connectedDevices.keys()));
  
  const device = connectedDevices.get(deviceId);
  
  if (!device) {
    console.log(`❌ Device ${deviceId} not in connectedDevices`);
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Device not found' }));
    return;
  }
  
  if (!device.settings) {
    console.log(`❌ Device ${deviceId} has no settings property`);
    console.log(`📋 Device object keys:`, Object.keys(device));
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Settings not found' }));
    return;
  }
  
  console.log(`✅ Returning settings for ${deviceId}`);
  res.writeHead(200);
  res.end(JSON.stringify(device.settings));
  return;
}
// ESP32 reports settings (no auth - direct from device)
// ESP32 reports settings - MUST come BEFORE  endpoint
if (req.url.match(/^\/api\/device\/[^\/]+\/settings$/) && req.method === 'POST') {
  readBody((data) => {
    const deviceId = data.deviceId;
    
    const settings = {
      commandDuration: data.commandDuration,
      motorReverseDelay: data.motorReverseDelay,
      partialTime: data.partialTime,
      gateMode: data.gateMode,
      magneticLoopMode: data.magneticLoopMode,
      emergencyLock: data.emergencyLock,
      autoCloseEnabled: data.autoCloseEnabled,
      autoCloseDelay: data.autoCloseDelay,
      openTimeLearned: data.openTimeLearned,
      closeTimeLearned: data.closeTimeLearned,
      manualModeEnabled: data.manualModeEnabled
    };
    
    if (connectedDevices.has(deviceId)) {
      const device = connectedDevices.get(deviceId);
      device.settings = settings;
      connectedDevices.set(deviceId, device);
      console.log(`📊 Settings updated for ${deviceId}`);
    } else {
      const mfgDevice = manufacturingDevices.get(deviceId);
      connectedDevices.set(deviceId, {
        settings: settings,
        lastHeartbeat: new Date().toISOString(),
        name: mfgDevice ? mfgDevice.name : deviceId,
        location: mfgDevice ? mfgDevice.location : 'Unknown'
      });
      console.log(`📊 Settings created for new device ${deviceId}`);
    }
    
    res.writeHead(200);
    res.end(JSON.stringify({ success: true }));
  });
  return;
}

// Update device settings (from dashboard)
if (req.url.startsWith('/api/device/') && req.url.includes('/settings/update') && req.method === 'POST') {
  requireAuth((session) => {
    readBody((data) => {
      const deviceId = req.url.split('/')[3];

      console.log(`⚙️ Settings update request for ${deviceId}`);
      console.log(`⚙️ Settings data:`, data);
      
      // Queue command to ESP32
      const settingsCommand = {
        id: 'settings_' + Date.now(),
        action: 'update_settings',
        settings: data,
        timestamp: new Date().toISOString()
      };
      
if (!deviceCommands.has(deviceId)) {
    deviceCommands.set(deviceId, []);
}
deviceCommands.get(deviceId).push(settingsCommand);
           
      console.log(`⚙️ Command queued. Queue length: ${deviceCommands.get(deviceId).length}`);

      res.writeHead(200);
      res.end(JSON.stringify({ success: true }));
    });
  });
  return;
}
  
// ESP32 USER SYNC ENDPOINT - NO AUTH REQUIRED
if (req.url.startsWith('/api/device/') && req.url.endsWith('/users') && req.method === 'GET') {
  const urlParts = req.url.split('/');
  const gateId = urlParts[3];
  
  console.log(`📱 ESP32 user sync request from: ${gateId}`);
  
  // Wrap in async IIFE
  (async () => {
    try {
      if (!firebaseInitialized) {
        const users = registeredUsers.get(gateId) || [];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(users));
        return;
      }
      
      const gateDoc = await db.collection('gates').doc(gateId).get();
      
      if (!gateDoc.exists) {
        console.log(`⚠️ No gate document found for ${gateId}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }
      
      const gateData = gateDoc.data();
      const firestoreUsers = gateData.users || {};
      
      const users = Object.keys(firestoreUsers).map(phone => ({
        phone: phone,
        email: firestoreUsers[phone].email || '',
        name: firestoreUsers[phone].name || 'Unknown',
        relayMask: firestoreUsers[phone].relayMask || 1,
        userLevel: firestoreUsers[phone].userLevel || 0,
        active: true
      }));
      
      console.log(`✅ ESP32: Sent ${users.length} users to ${gateId}`);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(users));
      
    } catch (error) {
      console.error('❌ Firebase read error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  })();
  return;
}
  
// Get device users endpoint - READ FROM FIREBASE
if (req.url.startsWith('/api/gates/') && req.url.endsWith('/users') && req.method === 'GET') {
  requireAuth(async (session) => {
    const urlParts = req.url.split('/');
    const gateId = urlParts[3];
    
    try {
      if (!firebaseInitialized) {
        // Fallback to local storage if Firebase not available
        const users = registeredUsers.get(gateId) || [];
        res.writeHead(200);
        res.end(JSON.stringify(users));
        return;
      }
      
      // READ FROM FIREBASE
      const gateDoc = await db.collection('gates').doc(gateId).get();
      
      if (!gateDoc.exists) {
        console.log(`No gate document found for ${gateId}`);
        res.writeHead(200);
        res.end(JSON.stringify([]));
        return;
      }
      
      const gateData = gateDoc.data();
      const firestoreUsers = gateData.users || {};
      
      // Convert Firebase user object to array format
      const users = Object.keys(firestoreUsers).map(phone => ({
        phone: phone,
        email: firestoreUsers[phone].email || '',
        name: firestoreUsers[phone].name || 'Unknown',
        relayMask: firestoreUsers[phone].relayMask || 1,
        userLevel: firestoreUsers[phone].userLevel || 0,
        role: firestoreUsers[phone].role || 'user',
        addedBy: firestoreUsers[phone].addedBy || 'system',
        addedDate: firestoreUsers[phone].addedDate ? 
                   firestoreUsers[phone].addedDate.toDate().toISOString() : 
                   new Date().toISOString(),
        registeredAt: firestoreUsers[phone].addedDate ? 
                      firestoreUsers[phone].addedDate.toDate().toISOString() : 
                      new Date().toISOString(),
        active: true
      }));
      
      console.log(`Firebase: Read ${users.length} users from gate ${gateId}`);
      
      res.writeHead(200);
      res.end(JSON.stringify(users));
      
    } catch (error) {
      console.error('Firebase read error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to read users from Firebase: ' + error.message }));
    }
  });
  return;
}

  // Get device logs endpoint
  if (req.url.startsWith('/api/device/') && req.url.endsWith('/logs') && req.method === 'GET') {
    requireAuth((session) => {
      const urlParts = req.url.split('/');
      const deviceId = urlParts[3];
      
      const logs = deviceLogs.get(deviceId) || [];
      
      res.writeHead(200);
      res.end(JSON.stringify(logs));
    });
    return;
  }

// ESP32  reporting endpoint (no auth - direct from device)
if (req.url.startsWith('/api/device/') && req.url.endsWith('/status') && req.method === 'POST') {
  readBody((data) => {
    const { 
      deviceId, gateState, lastCommand,
      relay1, relay2, relay3, relay4,
      photoIntBlocked, photoExtBlocked, photoBlocked,
      edgeIntContact, edgeExtContact, edgeContact,
      fccPosition, fcaPosition,
      learningMode, remoteOpen, remoteStop, modeSwitch,
      autoCloseEnabled, autoCloseTimer, autoCloseRemaining,
      partialActive, emergencyLock, userCount
    } = data;
    
    console.log(`📊 Status update from ${deviceId}: ${gateState}`);
    const existingDevice = connectedDevices.get(deviceId) || {};

    // Update device info in memory - STORE ALL FIELDS
    if (connectedDevices.has(deviceId)) {
      const device = connectedDevices.get(deviceId);
      device.gateState = gateState;
      device.lastCommand = lastCommand;
      device.relay1 = relay1;
      device.relay2 = relay2;
      device.relay3 = relay3;
      device.relay4 = relay4;
      device.photoIntBlocked = photoIntBlocked;
      device.photoExtBlocked = photoExtBlocked;
      device.photoBlocked = photoBlocked;
      device.edgeIntContact = edgeIntContact;
      device.edgeExtContact = edgeExtContact;
      device.edgeContact = edgeContact;
      device.fccPosition = fccPosition;
      device.fcaPosition = fcaPosition;
      device.learningMode = learningMode;
      device.remoteOpen = remoteOpen;
      device.remoteStop = remoteStop;
      device.modeSwitch = modeSwitch;
      device.autoCloseEnabled = autoCloseEnabled;
      device.autoCloseTimer = autoCloseTimer;
      device.autoCloseRemaining = autoCloseRemaining;
      device.partialActive = partialActive;
      device.emergencyLock = emergencyLock;
      device.userCount = userCount;
      device.lastStatusUpdate = new Date().toISOString();
      connectedDevices.set(deviceId, device);
    } else {
      // Device not yet in map - create new entry with ALL fields
      connectedDevices.set(deviceId, {
        gateState: gateState,
        lastCommand: lastCommand,
        relay1: relay1,
        relay2: relay2,
        relay3: relay3,
        relay4: relay4,
        photoIntBlocked: photoIntBlocked,
        photoExtBlocked: photoExtBlocked,
        photoBlocked: photoBlocked,
        edgeIntContact: edgeIntContact,
        edgeExtContact: edgeExtContact,
        edgeContact: edgeContact,
        fccPosition: fccPosition,
        fcaPosition: fcaPosition,
        learningMode: learningMode,
        remoteOpen: remoteOpen,
        remoteStop: remoteStop,
        modeSwitch: modeSwitch,
        autoCloseEnabled: autoCloseEnabled,
        autoCloseTimer: autoCloseTimer,
        autoCloseRemaining: autoCloseRemaining,
        partialActive: partialActive,
        emergencyLock: emergencyLock,
        userCount: userCount,
        lastStatusUpdate: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString()
      });
    }
    
    res.writeHead(200);
    res.end(JSON.stringify({ success: true }));
  });
  return;
}

// Dashboard status fetch endpoint (requires auth)
if (req.url.startsWith('/api/gates/') && req.url.endsWith('/status') && req.method === 'GET') {
  requireAuth((session) => {
    const urlParts = req.url.split('/');
    const gateId = urlParts[3];
    
    const device = connectedDevices.get(gateId);
    
    if (!device) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Device not found' }));
      return;
    }
    
    // Return all fields with safe defaults - never return undefined
    res.writeHead(200);
    res.end(JSON.stringify({
      gateState: device.gateState || 'UNKNOWN',
      lastCommand: device.lastCommand || 'NONE',
      relay1: Boolean(device.relay1),
      relay2: Boolean(device.relay2),
      relay3: Boolean(device.relay3),
      relay4: Boolean(device.relay4),
      photoIntBlocked: Boolean(device.photoIntBlocked),
      photoExtBlocked: Boolean(device.photoExtBlocked),
      photoBlocked: Boolean(device.photoBlocked),
      edgeIntContact: Boolean(device.edgeIntContact),
      edgeExtContact: Boolean(device.edgeExtContact),
      edgeContact: Boolean(device.edgeContact),
      fccPosition: Boolean(device.fccPosition),
      fcaPosition: Boolean(device.fcaPosition),
      learningMode: Boolean(device.learningMode),
      remoteOpen: Boolean(device.remoteOpen),
      remoteStop: Boolean(device.remoteStop),
      modeSwitch: device.modeSwitch || 'AUTO',
      autoCloseEnabled: Boolean(device.autoCloseEnabled),
      autoCloseTimer: Boolean(device.autoCloseTimer),
      autoCloseRemaining: Number(device.autoCloseRemaining) || 0,
      partialActive: Boolean(device.partialActive),
      emergencyLock: device.emergencyLock || 'NORMAL',
      userCount: Number(device.userCount) || 0,
      lastUpdate: device.lastStatusUpdate || device.lastHeartbeat
    }));
  });
  return;
}
    
// Command result endpoint (no auth - ESP32 direct)
if (req.url.startsWith('/api/device/') && req.url.endsWith('/command-result') && req.method === 'POST') {
  readBody((data) => {
    const { deviceId, command, success, message } = data;
    console.log(`📝 Command result from ${deviceId}: ${command} - ${success ? 'SUCCESS' : 'FAILED'}`);
    
    addDeviceLog(deviceId, `command_result_${success ? 'success' : 'failed'}`, 'system', 
      `Command: ${command}, Message: ${message}`);
    
    res.writeHead(200);
    res.end(JSON.stringify({ success: true }));
  });
  return;
}

// Safety event endpoint (no auth - ESP32 direct)
if (req.url.startsWith('/api/device/') && req.url.endsWith('/safety-event') && req.method === 'POST') {
  readBody(async (data) => {
    const { deviceId, eventType, details } = data;
    console.log(`🚨 Safety event from ${deviceId}: ${eventType}`);
    
    addDeviceLog(deviceId, 'safety_event', 'system', `${eventType}: ${details}`);
    
    // Store in Firebase errors collection
    if (firebaseInitialized) {
      try {
        await db.collection('gates').doc(deviceId).collection('errors').add({
          type: eventType,
          details: details,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          resolved: false
        });
      } catch (error) {
        console.error('Firebase error logging failed:', error);
      }
    }
    
    res.writeHead(200);
    res.end(JSON.stringify({ success: true }));
  });
  return;
}
  
  // FIREBASE SYNC ENDPOINT - sync all local users to Firebase
  if (req.url === '/api/firebase/sync' && req.method === 'POST') {
    requireAuth((session) => {
      if (session.userLevel < 2) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'Admin access required' }));
        return;
      }
      
      if (!firebaseInitialized) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Firebase not initialized' }));
        return;
      }
      
      readBody(async (data) => {
        try {
          let syncedDevices = 0;
          let syncedUsers = 0;
          
          // Sync all registered users to Firebase
          for (const [deviceId, users] of registeredUsers.entries()) {
            // Check if gate document exists, create if not
            const gateRef = db.collection('gates').doc(deviceId);
            const gateDoc = await gateRef.get();
            
            const gateUsers = {};
            let gateAdmins = [];
            
            // Prepare users data
            for (const user of users) {
              gateUsers[user.phone] = {
                name: user.name,
                email: user.email,
                relayMask: user.relayMask,
                userLevel: user.userLevel,
                role: user.userLevel >= 2 ? 'admin' : (user.userLevel >= 1 ? 'manager' : 'user'),
                addedBy: user.registeredBy || 'system',
                addedDate: admin.firestore.FieldValue.serverTimestamp()
              };
              
              // Collect admin phone numbers
              if (user.userLevel >= 2) {
                gateAdmins.push(user.phone);
              }
              
              // Update user permissions
              await db.collection('userPermissions').doc(user.phone).set({
                gates: {
                  [deviceId]: {
                    name: `Gate ${deviceId}`,
                    relayMask: user.relayMask,
                    role: user.userLevel >= 2 ? 'admin' : (user.userLevel >= 1 ? 'manager' : 'user'),
                    addedBy: user.registeredBy || 'system',
                    addedDate: admin.firestore.FieldValue.serverTimestamp()
                  }
                }
              }, { merge: true });
              
              syncedUsers++;
            }
            
            if (!gateDoc.exists) {
              // Create new gate document
              const firstAdmin = users.find(u => u.userLevel >= 2);
              await gateRef.set({
                serial: deviceId,
                name: `Gate ${deviceId}`,
                location: 'Location not specified',
                timezone: 'Asia/Jerusalem',
                activatedBy: firstAdmin ? firstAdmin.phone : users[0]?.phone || 'unknown',
                activationDate: admin.firestore.FieldValue.serverTimestamp(),
                admins: gateAdmins.length > 0 ? gateAdmins : [users[0]?.phone || 'unknown'],
                users: gateUsers
              });
            } else {
              // Update existing gate document
              await gateRef.update({
                users: gateUsers,
                admins: gateAdmins.length > 0 ? gateAdmins : admin.firestore.FieldValue.arrayUnion()
              });
            }
            
            syncedDevices++;
          }
          
          res.writeHead(200);
          res.end(JSON.stringify({
            success: true,
            message: 'Firebase sync completed',
            syncedDevices: syncedDevices,
            syncedUsers: syncedUsers
          }));
          
        } catch (error) {
          console.error('Firebase sync error:', error);
          res.writeHead(500);
          res.end(JSON.stringify({ error: 'Firebase sync failed: ' + error.message }));
        }
      });
    });
    return;
  }

  // DELETE USER ENDPOINT - require auth
  if (req.url.includes('/delete-user') && req.method === 'DELETE') {
    requireAuth((session) => {
      const urlParts = req.url.split('/');
      const deviceId = urlParts[3];
      
      console.log(`🗑️ User deletion for device: ${deviceId} by ${session.email}`);
      
      readBody(async (data) => {
        const { phone, email } = data;
        
        if (!phone && !email) {
          res.writeHead(400);
          res.end(JSON.stringify({
            success: false,
            error: 'Phone or email required for deletion'
          }));
          return;
        }
        
        // Find and remove user from local storage
        const users = registeredUsers.get(deviceId) || [];
        const userIndex = users.findIndex(u => 
          (phone && u.phone === phone) || (email && u.email === email)
        );
        
        if (userIndex === -1) {
          res.writeHead(404);
          res.end(JSON.stringify({
            success: false,
            error: 'User not found'
          }));
          return;
        }
        
        const deletedUser = users[userIndex];
        users.splice(userIndex, 1);
        registeredUsers.set(deviceId, users);
        
        // Remove from dashboard users if exists
        if (deletedUser.canLogin && deletedUser.email) {
          DASHBOARD_USERS.delete(deletedUser.email);
        }
        
        // Send delete command to ESP32
        const deleteCommand = {
          id: 'del_' + Date.now(),
          action: 'delete_user',
          phone: deletedUser.phone,
          email: deletedUser.email,
          timestamp: Date.now(),
          deletedBy: session.email
        };
        
        if (!deviceCommands.has(deviceId)) {
          deviceCommands.set(deviceId, []);
        }
        deviceCommands.get(deviceId).push(deleteCommand);
        
        // FIREBASE: Remove user from Firebase if connected
        if (firebaseInitialized) {
          try {
            // Remove user from gate document
            await db.collection('gates').doc(deviceId).update({
              [`users.${deletedUser.phone}`]: admin.firestore.FieldValue.delete()
            });
            
            // Remove gate from user permissions or delete document if no gates left
            const userPermRef = db.collection('userPermissions').doc(deletedUser.phone);
            const userPermDoc = await userPermRef.get();
            
            if (userPermDoc.exists) {
              const userData = userPermDoc.data();
              if (userData.gates && Object.keys(userData.gates).length === 1 && userData.gates[deviceId]) {
                // Delete entire document if this was the only gate
                await userPermRef.delete();
              } else {
                // Remove just this gate
                await userPermRef.update({
                  [`gates.${deviceId}`]: admin.firestore.FieldValue.delete()
                });
              }
            }
            
            console.log(`🔥 Firebase: User ${deletedUser.phone} removed from gate ${deviceId}`);
            
          } catch (firebaseError) {
            console.error('🔥 Firebase user deletion error:', firebaseError);
          }
        }
        
        // Add log entry
        addDeviceLog(deviceId, 'user_deleted', session.email, `User: ${deletedUser.name} (${deletedUser.email}/${deletedUser.phone})`);
        
        console.log(`🗑️ User deleted from device ${deviceId}:`, deletedUser);
        
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          message: "User deleted successfully",
          deletedUser: {
            name: deletedUser.name,
            email: deletedUser.email,
            phone: deletedUser.phone
          },
          deviceId: deviceId,
          firebase_status: firebaseInitialized ? 'removed' : 'local_only'
        }));
      });
    });
    return;
  }

  // UPDATED USER REGISTRATION ENDPOINT - add phone validation
  if (req.url.includes('/register-user') && req.method === 'POST') {
    requireAuth((session) => {
      const urlParts = req.url.split('/');
      const deviceId = urlParts[3];
      
      console.log(`👤 User registration for device: ${deviceId} by ${session.email}`);
      
      readBody(async (data) => {
        console.log("Registration data received:", data); // Debug log
        
        // ADDED: Validate phone number with enhanced debugging
        const phoneValidation = validatePhoneNumber(data.phone);
        console.log("Phone validation result:", phoneValidation); // Debug log
        
        if (!phoneValidation.valid) {
          console.error("Phone validation failed:", phoneValidation.message);
          res.writeHead(400);
          res.end(JSON.stringify({
            success: false,
            error: phoneValidation.message
          }));
          return;
        }
        
        // ADDED: Use the cleaned phone number
        const cleanPhone = phoneValidation.cleanPhone;
        console.log("Using cleaned phone:", cleanPhone);
        
        // Store user in registered users
        if (!registeredUsers.has(deviceId)) {
          registeredUsers.set(deviceId, []);
        }
        
        const users = registeredUsers.get(deviceId);
        
        // UPDATED: Check if user already exists (by email or cleaned phone)
        const existingUserIndex = users.findIndex(u => u.email === data.email || u.phone === cleanPhone);
        if (existingUserIndex >= 0) {
          users[existingUserIndex] = {
            email: data.email,
            phone: cleanPhone, // UPDATED: use cleaned phone
            name: data.name || 'New User',
            password: data.password || 'defaultpass123',
            relayMask: data.relayMask || 1,
            userLevel: data.userLevel || 0,
            canLogin: data.canLogin || false,
            registeredBy: session.email,
            registeredAt: users[existingUserIndex].registeredAt,
            lastUpdated: new Date().toISOString()
          };
        } else {
          users.push({
            email: data.email,
            phone: cleanPhone, // UPDATED: use cleaned phone
            name: data.name || 'New User',
            password: data.password || 'defaultpass123',
            relayMask: data.relayMask || 1,
            userLevel: data.userLevel || 0,
            canLogin: data.canLogin || false,
            registeredBy: session.email,
            registeredAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          });
          
          // Add to dashboard users if they have login permission
          if (data.canLogin && data.email && data.password) {
            DASHBOARD_USERS.set(data.email, {
              password: data.password,
              name: data.name || 'New User',
              userLevel: data.userLevel || 0,
              phone: cleanPhone // UPDATED: use cleaned phone
            });
          }
        }
        
        registeredUsers.set(deviceId, users);
        
        const registrationCommand = {
          id: 'reg_' + Date.now(),
          action: 'register_user',
          phone: cleanPhone, // UPDATED: use cleaned phone
          email: data.email,
          name: data.name || 'New User',
          relayMask: data.relayMask || 1,
          userLevel: data.userLevel || 0,
          timestamp: Date.now(),
          registeredBy: session.email
        };
        
        if (!deviceCommands.has(deviceId)) {
          deviceCommands.set(deviceId, []);
        }
        deviceCommands.get(deviceId).push(registrationCommand);
        
        // FIREBASE INTEGRATION: Add user to Firebase if connected
        if (firebaseInitialized) {
          try {
            // Check if gate document exists, create if not
            const gateRef = db.collection('gates').doc(deviceId);
            const gateDoc = await gateRef.get();
            
            if (!gateDoc.exists) {
              // Create new gate document
              await gateRef.set({
                serial: deviceId,
                name: `Gate ${deviceId}`,
                location: 'Location not specified',
                timezone: 'Asia/Jerusalem',
                activatedBy: cleanPhone,
                activationDate: admin.firestore.FieldValue.serverTimestamp(),
                admins: [cleanPhone],
                users: {
                  [cleanPhone]: {
                    name: data.name || 'New User',
                    email: data.email,
                    relayMask: data.relayMask || 1,
                    userLevel: data.userLevel || 0,
                    role: data.userLevel >= 2 ? 'admin' : (data.userLevel >= 1 ? 'manager' : 'user'),
                    addedBy: session.email,
                    addedDate: admin.firestore.FieldValue.serverTimestamp()
                  }
                }
              });
            } else {
              // Update existing gate document
              await gateRef.update({
                [`users.${cleanPhone}`]: {
                  name: data.name || 'New User',
                  email: data.email,
                  relayMask: data.relayMask || 1,
                  userLevel: data.userLevel || 0,
                  role: data.userLevel >= 2 ? 'admin' : (data.userLevel >= 1 ? 'manager' : 'user'),
                  addedBy: session.email,
                  addedDate: admin.firestore.FieldValue.serverTimestamp()
                }
              });
            }
            
            // Update or create user permissions document
            await db.collection('userPermissions').doc(cleanPhone).set({
              gates: {
                [deviceId]: {
                  name: `Gate ${deviceId}`,
                  relayMask: data.relayMask || 1,
                  role: data.userLevel >= 2 ? 'admin' : (data.userLevel >= 1 ? 'manager' : 'user'),
                  addedBy: session.email,
                  addedDate: admin.firestore.FieldValue.serverTimestamp()
                }
              }
            }, { merge: true });
            
            console.log(`🔥 Firebase: User ${cleanPhone} added to gate ${deviceId}`);
            
          } catch (firebaseError) {
            console.error('🔥 Firebase user registration error:', firebaseError);
          }
        }
        
        // UPDATED: Add log entry with cleaned phone
        addDeviceLog(deviceId, 'user_registered', session.email, `User: ${data.name} (${data.email}/${cleanPhone})`);
        
        console.log(`📝 Registration successful for device ${deviceId}:`, registrationCommand);
        
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          message: "User registration queued",
          email: data.email,
          phone: cleanPhone, // UPDATED: return cleaned phone
          deviceId: deviceId,
          firebase_status: firebaseInitialized ? 'synced' : 'local_only'
        }));
      });
    });
    return;
  }
// ESP32 SCHEDULE SYNC - NO AUTH REQUIRED (like users endpoint)
if (req.url.match(/^\/api\/device\/[^\/]+\/schedules\/sync$/) && req.method === 'GET') {
  const deviceId = req.url.split('/')[3];
  
  console.log(`📅 ESP32 schedule sync request from: ${deviceId}`);
  
  (async () => {
    try {
      // Load from Firebase if available
      const schedules = await loadSchedulesFromFirebase(deviceId);
      
      console.log(`✅ ESP32: Sending ${schedules.length} schedules to ${deviceId}`);
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(schedules));
      
    } catch (error) {
      console.error('❌ ESP32 schedule sync error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: error.message }));
    }
  })();
  return;
}
// ==================== SCHEDULE MANAGEMENT ====================

// Initialize schedule storage
function initializeSchedules(deviceId) {
  if (!deviceSchedules.has(deviceId)) {
    deviceSchedules.set(deviceId, []);
  }
}

// Get all schedules for a device
if (req.url.match(/^\/api\/device\/[^\/]+\/schedules$/) && req.method === 'GET') {
  requireAuth(async (session) => {  // ← Make this async
    const deviceId = req.url.split('/')[3];
    
    console.log(`📅 Loading schedules for device: ${deviceId}`);
    
    // Try to load from Firebase first
    const schedules = await loadSchedulesFromFirebase(deviceId);
    
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(schedules));
  });
  return;
}

// Create new schedule
if (req.url.match(/^\/api\/device\/[^\/]+\/schedules$/) && req.method === 'POST') {
  requireAuth((session) => {
    readBody(async (data) => {  // ← Make this async
      const deviceId = req.url.split('/')[3];
      
      console.log('📅 Creating schedule for device:', deviceId);
      console.log('📅 Schedule data:', data);
      
      if (!data.id) {
        data.id = Date.now();
      }
      
      // Add metadata
      data.createdBy = session.email;
      
      // Save to local memory first
      initializeSchedules(deviceId);
      const schedules = deviceSchedules.get(deviceId);
      schedules.push(data);
      deviceSchedules.set(deviceId, schedules);
      
      // Save to Firebase
      const firebaseResult = await saveScheduleToFirebase(deviceId, data);
      
      console.log('📅 Schedule saved locally, total schedules:', schedules.length);
      console.log('🔥 Firebase save result:', firebaseResult);
      
      addDeviceLog(deviceId, 'schedule_created', session.email, `Schedule: ${data.name}`);
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ 
        success: true, 
        schedule: data,
        firebase_status: firebaseResult.success ? 'synced' : 'local_only',
        firebase_error: firebaseResult.error || null
      }));
    });
  });
  return;
}

// Update schedule
if (req.url.match(/^\/api\/device\/[^\/]+\/schedules\/\d+$/) && req.method === 'PUT') {
  requireAuth((session) => {
    readBody(async (data) => {  // ← Make this async
      const urlParts = req.url.split('/');
      const deviceId = urlParts[3];
      const scheduleId = parseInt(urlParts[5]);
      
      console.log(`📅 Updating schedule ${scheduleId} for device ${deviceId}`);
      
      initializeSchedules(deviceId);
      const schedules = deviceSchedules.get(deviceId);
      
      const index = schedules.findIndex(s => s.id == scheduleId);
      if (index === -1) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Schedule not found' }));
        return;
      }
      
      // Update local storage
      schedules[index] = { ...schedules[index], ...data };
      deviceSchedules.set(deviceId, schedules);
      
      // Update Firebase
      const firebaseResult = await saveScheduleToFirebase(deviceId, schedules[index]);
      
      console.log('🔥 Firebase update result:', firebaseResult);
      
      addDeviceLog(deviceId, 'schedule_updated', session.email, `Schedule: ${schedules[index].name}`);
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ 
        success: true, 
        schedule: schedules[index],
        firebase_status: firebaseResult.success ? 'synced' : 'local_only'
      }));
    });
  });
  return;
}

// Delete schedule
if (req.url.match(/^\/api\/device\/[^\/]+\/schedules\/\d+$/) && req.method === 'DELETE') {
  requireAuth((session) => {
    const urlParts = req.url.split('/');
    const deviceId = urlParts[3];
    const scheduleId = parseInt(urlParts[5]);
    
    (async () => {  // ← Wrap in async IIFE
      console.log(`📅 Deleting schedule ${scheduleId} from device ${deviceId}`);
      
      initializeSchedules(deviceId);
      const schedules = deviceSchedules.get(deviceId);
      
      // Delete from local storage
      const filtered = schedules.filter(s => s.id != scheduleId);
      deviceSchedules.set(deviceId, filtered);
      
      // Delete from Firebase
      const firebaseResult = await deleteScheduleFromFirebase(deviceId, scheduleId);
      
      console.log('🔥 Firebase delete result:', firebaseResult);
      
      addDeviceLog(deviceId, 'schedule_deleted', session.email, `Schedule ID: ${scheduleId}`);
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ 
        success: true,
        firebase_status: firebaseResult.success ? 'synced' : 'local_only'
      }));
    })();
  });
  return;
}

// Log schedule execution (from ESP32)
if (req.url.match(/^\/api\/device\/[^\/]+\/schedule-execution$/) && req.method === 'POST') {
  readBody((data) => {
    const deviceId = req.url.split('/')[3];
    const { scheduleId, scheduleName } = data;
    
    console.log(`⏰ Schedule executed on ${deviceId}: ${scheduleName}`);
    addDeviceLog(deviceId, 'schedule_execution', 'system', `Schedule: ${scheduleName}`);
    
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true }));
  });
  return;
}
  
  // Command injection endpoint - require auth
if (req.url.includes('/send-command') && req.method === 'POST') {
    requireAuth((session) => {
        const urlParts = req.url.split('/');
        const deviceId = urlParts[3];
      
      console.log(`🎮 Command sent to ESP32 device: ${deviceId} by ${session.email}`);
      
        readBody((data) => {
            const isDashboardCommand = req.headers['x-command-source'] === 'dashboard';
            
            const command = {
                id: data.id || 'cmd_' + Date.now(),
                action: data.action || 'relay_activate',
                relay: data.relay || 1,
                duration: data.duration || 2000,
                user: data.user || session.email,
                user_id: data.user_id || null,  // System user (999999999)
                timestamp: Date.now(),
                sentBy: session.email
            };
            
            if (!deviceCommands.has(deviceId)) {
                deviceCommands.set(deviceId, []);
            }
            deviceCommands.get(deviceId).push(command);
            
            // Enhanced logging with actual user info
            const logDetails = isDashboardCommand && data.dashboard_user ?
                `Action: ${command.action}, Relay: ${command.relay}, Dashboard User: ${data.dashboard_user.name} (${data.dashboard_user.email}), System User ID: ${command.user_id}` :
                `Action: ${command.action}, Relay: ${command.relay}, User ID: ${command.user_id}`;
            
            addDeviceLog(deviceId, 'command_sent', session.email, logDetails);
            
            console.log(`📝 Command queued for device ${deviceId}:`, command);
            
            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                message: "Command queued for device",
                commandId: command.id,
                deviceId: deviceId,
                timestamp: new Date().toISOString()
            }));
        });
    });
    return;
}

  // Health check endpoint (public)
  if (req.url === '/health') {
    const responseData = {
      message: '🎉 Railway server is working perfectly!',
      timestamp: new Date().toISOString(),
      url: req.url,
      method: req.method,
      port: PORT,
      connectedDevices: connectedDevices.size,
      activeSessions: activeSessions.size,
      server_info: {
        actual_port: PORT,
        railway_env: process.env.RAILWAY_ENVIRONMENT || 'not_set',
        node_env: process.env.NODE_ENV || 'not_set'
      }
    };
    
    res.writeHead(200);
    res.end(JSON.stringify(responseData, null, 2));
    return;
  }

  // API endpoints list (public)
  if (req.url === '/api' || req.url === '/api/') {
    const responseData = {
      message: '🎉 Gate Controller API with User Management and Authentication',
      timestamp: new Date().toISOString(),
      connectedDevices: connectedDevices.size,
      activeSessions: activeSessions.size,
      endpoints: [
        'GET /',
        'GET /dashboard (requires login)',
        'GET /system (requires login)',
        'GET /devices (requires login)',
        'GET /manufacturing (requires admin)',
        'POST /dashboard/login',
        'POST /dashboard/logout', 
        'GET /health', 
        'POST /api/device/heartbeat',
        'GET /api/device/{deviceId}/commands',
        'POST /api/device/auth',
        'POST /api/device/activate',
        'POST /api/device/{deviceId}/send-command (requires login)',
        'POST /api/device/{deviceId}/register-user (requires login)',
        'DELETE /api/device/{deviceId}/delete-user (requires login)',
        'GET /api/device/{deviceId}/users (requires login)',
        'GET /api/device/{deviceId}/logs (requires login)',
        'POST /api/firebase/sync (requires admin)',
        'GET /api/firebase/status (requires login)',
        'GET /api/system/info (requires login)',
        'POST /api/system/clear-cache (requires admin)',
        'GET /api/system/export (requires admin)',
        'POST /api/system/restart (requires admin)',
        'POST /api/manufacturing/add-device (requires admin)',
        'PUT /api/manufacturing/edit-device (requires admin)',
        'DELETE /api/manufacturing/delete-device (requires admin)'
      ],
      devices: Array.from(connectedDevices.keys())
    };
    
    res.writeHead(200);
    res.end(JSON.stringify(responseData, null, 2));
    return;
  }

  // Root redirect to dashboard
  if (req.url === '/') {
    res.writeHead(302, { 'Location': '/dashboard' });
    res.end();
    return;
  }

  // Default response for other endpoints
  const responseData = {
    message: '🎉 Railway Gate Controller Server with Template Support',
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method,
    port: PORT,
    help: 'Visit /dashboard for the control interface or /api for API info'
  };
  
  res.writeHead(404);
  res.end(JSON.stringify(responseData, null, 2));
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  console.error('Error details:', {
    code: err.code,
    message: err.message,
    port: PORT
  });
});

server.on('listening', () => {
  const addr = server.address();
  console.log('🎉 Server successfully listening with Template Support!');
  console.log(`✅ Port: ${addr.port}`);
  console.log(`✅ Address: ${addr.address}`);
  console.log(`🌐 Railway should now be able to route traffic`);
  console.log(`📱 Dashboard: https://gate-controller-system-production.up.railway.app/dashboard`);
  console.log(`🔐 Demo Login: admin@gatecontroller.com/admin123 or manager@gatecontroller.com/gate2024`);
});

// Start server
server.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
  console.log(`💫 Server started on ${PORT} with Template Support`);
});

// Health check endpoint logging
setInterval(() => {
  console.log(`💓 Server heartbeat - Port: ${PORT} - Devices: ${connectedDevices.size} - Sessions: ${activeSessions.size} - ${new Date().toISOString()}`);
  
  // Clean up old devices (offline for more than 5 minutes)
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  for (const [deviceId, info] of connectedDevices.entries()) {
    if (new Date(info.lastHeartbeat).getTime() < fiveMinutesAgo) {
      console.log(`🗑️ Removing offline device: ${deviceId}`);
      connectedDevices.delete(deviceId);
      deviceCommands.delete(deviceId);
      deviceLogs.delete(deviceId);
      registeredUsers.delete(deviceId);
      deviceSchedules.delete(deviceId);
    }
  }

// Load schedules from Firebase on server startup
async function syncSchedulesOnStartup() {
  if (!firebaseInitialized) {
    console.log('⚠️ Firebase not available, using local schedule storage');
    return;
  }
  
  try {
    console.log('🔄 Syncing schedules from Firebase...');
    
    const gatesSnapshot = await db.collection('gates').get();
    let totalSchedules = 0;
    
    for (const doc of gatesSnapshot.docs) {
      const deviceId = doc.id;
      const schedules = doc.data().schedules || [];
      
      if (schedules.length > 0) {
        deviceSchedules.set(deviceId, schedules);
        totalSchedules += schedules.length;
        console.log(`✅ Loaded ${schedules.length} schedules for device ${deviceId}`);
      }
    }
    
    console.log(`✅ Sync complete: Loaded ${totalSchedules} total schedules from Firebase`);
    
  } catch (error) {
    console.error('❌ Firebase sync error:', error);
  }
}

// ==================== FIREBASE DATA INITIALIZATION ====================
// Load all data from Firebase after server starts

// Load schedules
setTimeout(syncSchedulesOnStartup, 2000);

// Load dashboard users
setTimeout(loadDashboardUsersFromFirebase, 2500);

// Load organizations
setTimeout(loadOrganizationsFromFirebase, 3000);

console.log('✅ Firebase data loaders scheduled');
  
  // Clean up old sessions (older than 24 hours)
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  for (const [sessionToken, session] of activeSessions.entries()) {
    if (new Date(session.loginTime).getTime() < oneDayAgo) {
      console.log(`🗑️ Removing expired session: ${session.email}`);
      activeSessions.delete(sessionToken);
    }
  }
}, 30000);
