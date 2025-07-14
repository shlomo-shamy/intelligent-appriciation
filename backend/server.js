console.log('🚀 Starting Gate Controller Server - Full Device Integration...');

const http = require('http');
const crypto = require('crypto');
const url = require('url');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

// Device authentication token generation
function generateDeviceToken(deviceId) {
  const payload = {
    type: 'device',
    device_id: deviceId,
    exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// Two types of tokens for users
function generateMobileToken(user) {
  const payload = {
    type: 'mobile',
    phone: user.phone,
    name: user.name,
    level: user.level,
    controllers: user.controllers,
    relayMask: user.relayMask,
    exp: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function generateDashboardToken(user) {
  const payload = {
    type: 'dashboard',
    phone: user.phone,
    name: user.name,
    level: user.level,
    controllers: user.controllers,
    relayMask: user.relayMask,
    exp: Date.now() + (2 * 60 * 60 * 1000) // 2 hours
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function verifyToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    if (payload.exp < Date.now()) {
      return null; // Token expired
    }
    return payload;
  } catch {
    return null; // Invalid token
  }
}

// Users database
const users = [
  {
    phone: '+972522554743',
    password: hashPassword('admin123'),
    name: 'Admin User',
    level: 2,
    active: true,
    passwordChanged: true,
    controllers: ['GC001', 'GC002'],
    relayMask: 15,
    mobileToken: null
  },
  {
    phone: '+972501234567',
    password: hashPassword('temp123'),
    name: 'Manager User',
    level: 1,
    active: true,
    passwordChanged: false,
    controllers: ['GC001'],
    relayMask: 7,
    mobileToken: null
  },
  {
    phone: '+972587654321',
    password: hashPassword('user123'),
    name: 'Regular User',
    level: 0,
    active: true,
    passwordChanged: true,
    controllers: ['GC001'],
    relayMask: 1,
    mobileToken: null
  }
];

// Enhanced controllers with real-time status
const controllers = [
  {
    id: 'GC001',
    name: 'Main Entrance',
    nickname: 'Front Gate',
    location: 'Building A - Main Entry',
    status: 'offline', // Will be updated by device heartbeat
    lastCommunication: null,
    deviceToken: null,
    relays: {
      1: { name: 'Open', active: false },
      2: { name: 'Stop', active: false },
      3: { name: 'Close', active: false },
      4: { name: 'Partial', active: false }
    },
    // Real-time data from device
    signalStrength: 0,
    batteryLevel: 0,
    uptime: 0,
    freeHeap: 0,
    gatePosition: 0,
    lastGateAction: 0,
    lastActionUser: '',
    operator: ''
  },
  {
    id: 'GC002',
    name: 'Parking Gate',
    nickname: 'Parking',
    location: 'Building B - Parking',
    status: 'offline',
    lastCommunication: null,
    deviceToken: null,
    relays: {
      1: { name: 'Open', active: false },
      2: { name: 'Stop', active: false },
      3: { name: 'Close', active: false },
      4: { name: 'Emergency', active: false }
    },
    signalStrength: 0,
    batteryLevel: 0,
    uptime: 0,
    freeHeap: 0,
    gatePosition: 0,
    lastGateAction: 0,
    lastActionUser: '',
    operator: ''
  }
];

// Command queue for devices
const deviceCommands = {};

const activityLog = [];

function addToLog(type, message, userPhone = null, controllerId = null) {
  activityLog.unshift({
    id: Date.now(),
    timestamp: new Date().toISOString(),
    type,
    message,
    userPhone,
    controllerId
  });
  
  if (activityLog.length > 200) {
    activityLog.pop();
  }
}

function parseJsonBody(req, callback) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    try {
      const data = JSON.parse(body);
      callback(null, data);
    } catch (error) {
      callback(error, null);
    }
  });
}

function requireAuth(req, res, callback, requiredType = null) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.writeHead(401);
    res.end(JSON.stringify({ error: 'No token provided' }));
    return;
  }
  
  const token = authHeader.substring(7);
  const user = verifyToken(token);
  
  if (!user) {
    res.writeHead(401);
    res.end(JSON.stringify({ error: 'Invalid or expired token' }));
    return;
  }
  
  if (requiredType && user.type !== requiredType) {
    res.writeHead(403);
    res.end(JSON.stringify({ error: `${requiredType} access required` }));
    return;
  }
  
  req.user = user;
  callback();
}

// Helper function to queue commands for devices
function queueCommandForDevice(deviceId, command) {
  if (!deviceCommands[deviceId]) {
    deviceCommands[deviceId] = [];
  }
  
  deviceCommands[deviceId].push({
    ...command,
    queued_at: new Date().toISOString(),
    id: Date.now()
  });
  
  // Keep only last 10 commands
  if (deviceCommands[deviceId].length > 10) {
    deviceCommands[deviceId].shift();
  }
}

// Helper function to update controller status
function updateControllerStatus(controllerId, data) {
  const controller = controllers.find(c => c.id === controllerId);
  if (!controller) return false;
  
  controller.status = 'online';
  controller.lastCommunication = new Date().toISOString();
  
  if (data.signalStrength !== undefined) controller.signalStrength = data.signalStrength;
  if (data.batteryLevel !== undefined) controller.batteryLevel = data.batteryLevel;
  if (data.uptime !== undefined) controller.uptime = data.uptime;
  if (data.freeHeap !== undefined) controller.freeHeap = data.freeHeap;
  if (data.gatePosition !== undefined) controller.gatePosition = data.gatePosition;
  if (data.lastGateAction !== undefined) controller.lastGateAction = data.lastGateAction;
  if (data.lastActionUser !== undefined) controller.lastActionUser = data.lastActionUser;
  if (data.operator !== undefined) controller.operator = data.operator;
  
  if (data.relays) {
    Object.keys(data.relays).forEach(relayNum => {
      if (controller.relays[relayNum]) {
        controller.relays[relayNum].active = data.relays[relayNum].active;
      }
    });
  }
  
  return true;
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  console.log(`${method} ${path}`);

  // Root endpoint
  if (path === '/' && method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({
      message: '🚀 Gate Controller API - Full Device Integration',
      version: '2.1.0',
      timestamp: new Date().toISOString(),
      modes: {
        mobile: '📱 Quick access for gate control',
        dashboard: '💻 Management interface',
        device: '🔧 ESP32 controller integration'
      },
      endpoints: {
        mobile: '/api/mobile/* - Mobile app endpoints',
        dashboard: '/api/dashboard/* - Web dashboard endpoints',
        device: '/api/device/* - ESP32 device endpoints',
        commands: '/api/command - Gate control'
      },
      devices: {
        online: controllers.filter(c => c.status === 'online').length,
        total: controllers.length
      }
    }));
  }
  
  // ===== DEVICE ENDPOINTS (ESP32) =====
  
  // Device authentication
  else if (path === '/api/device/auth' && method === 'POST') {
    parseJsonBody(req, (err, data) => {
      if (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      
      const { device_id, firmware_version } = data;
      
      const controller = controllers.find(c => c.id === device_id);
      if (!controller) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Device not found' }));
        return;
      }
      
      const deviceToken = generateDeviceToken(device_id);
      controller.deviceToken = deviceToken;
      controller.status = 'online';
      controller.lastCommunication = new Date().toISOString();
      
      addToLog('device_auth', `Device ${device_id} authenticated (FW: ${firmware_version})`, null, device_id);
      
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        token: deviceToken,
        device_id: device_id,
        message: 'Device authenticated successfully'
      }));
    });
  }
  
  // Device heartbeat
  else if (path === '/api/device/heartbeat' && method === 'POST') {
    parseJsonBody(req, (err, data) => {
      if (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      
      const { device_id } = data;
      
      const controller = controllers.find(c => c.id === device_id);
      if (!controller) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Device not found' }));
        return;
      }
      
      // Update controller with heartbeat data
      updateControllerStatus(device_id, data);
      
      console.log(`💓 Heartbeat from ${device_id} - Signal: ${data.signal_strength}, Battery: ${data.battery_level}%`);
      
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        message: 'Heartbeat received',
        timestamp: new Date().toISOString()
      }));
    });
  }
  
  // Get commands for device
  else if (path.startsWith('/api/device/') && path.endsWith('/commands') && method === 'GET') {
    const deviceId = path.split('/')[3];
    
    const commands = deviceCommands[deviceId] || [];
    
    // Clear commands after sending
    deviceCommands[deviceId] = [];
    
    res.writeHead(200);
    res.end(JSON.stringify(commands));
  }
  
  // Command acknowledgment from device
  else if (path === '/api/device/command-ack' && method === 'POST') {
    parseJsonBody(req, (err, data) => {
      if (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      
      const { device_id, command_id, success, result } = data;
      
      addToLog('command_result', `Command ${command_id} on ${device_id}: ${result}`, null, device_id);
      
      console.log(`✅ Command ${command_id} acknowledged by ${device_id}: ${success ? 'SUCCESS' : 'FAILED'}`);
      
      res.writeHead(200);
      res.end(JSON.stringify({ success: true }));
    });
  }
  
  // ===== USER ENDPOINTS =====
  
  // Mobile session check
  else if (path === '/api/mobile/check-session' && method === 'GET') {
    requireAuth(req, res, () => {
      if (req.user.type !== 'mobile') {
        res.writeHead(403);
        res.end(JSON.stringify({ sessionValid: false, error: 'Not a mobile session' }));
        return;
      }
      
      const userRecord = users.find(u => u.phone === req.user.phone);
      if (!userRecord || !userRecord.active) {
        res.writeHead(401);
        res.end(JSON.stringify({ sessionValid: false, error: 'User inactive' }));
        return;
      }
      
      const accessibleControllers = controllers.filter(c => 
        userRecord.controllers.includes(c.id)
      ).map(c => ({
        controller_id: c.id,
        controller_name: c.name,
        controller_nickname: c.nickname,
        location: c.location,
        status: c.status,
        lastCommunication: c.lastCommunication,
        signalStrength: c.signalStrength,
        batteryLevel: c.batteryLevel,
        gatePosition: c.gatePosition,
        relays: c.relays
      }));
      
      res.writeHead(200);
      res.end(JSON.stringify({
        sessionValid: true,
        user: {
          phone_number: userRecord.phone,
          user_name: userRecord.name,
          user_level: userRecord.level,
          relay_mask: userRecord.relayMask,
          accessible_controllers: accessibleControllers
        }
      }));
    });
  }
  
  // Mobile login
  else if (path === '/api/mobile/login' && method === 'POST') {
    parseJsonBody(req, (err, data) => {
      if (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      
      const { phone_number, password } = data;
      
      const user = users.find(u => u.phone === phone_number && u.active);
      
      if (!user || !verifyPassword(password, user.password)) {
        addToLog('mobile_login_failed', `Failed mobile login attempt for ${phone_number}`);
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Invalid phone number or password' }));
        return;
      }
      
      if (!user.passwordChanged) {
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          passwordChangeRequired: true,
          message: 'Please change your password first',
          user: {
            phone_number: user.phone,
            user_name: user.name
          }
        }));
        return;
      }
      
      const mobileToken = generateMobileToken(user);
      user.mobileToken = mobileToken;
      
      const accessibleControllers = controllers.filter(c => 
        user.controllers.includes(c.id)
      ).map(c => ({
        controller_id: c.id,
        controller_name: c.name,
        controller_nickname: c.nickname,
        location: c.location,
        status: c.status,
        lastCommunication: c.lastCommunication,
        signalStrength: c.signalStrength,
        batteryLevel: c.batteryLevel,
        gatePosition: c.gatePosition,
        relays: c.relays
      }));
      
      addToLog('mobile_login_success', `${user.name} connected via mobile`, user.phone);
      
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        sessionType: 'mobile',
        token: mobileToken,
        persistentSession: true,
        user: {
          phone_number: user.phone,
          user_name: user.name,
          user_level: user.level,
          relay_mask: user.relayMask,
          accessible_controllers: accessibleControllers
        },
        message: 'Welcome! You are now connected.'
      }));
    });
  }
  
  // Dashboard login
  else if (path === '/api/dashboard/login' && method === 'POST') {
    parseJsonBody(req, (err, data) => {
      if (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      
      const { phone_number, password } = data;
      
      const user = users.find(u => u.phone === phone_number && u.active);
      
      if (!user || !verifyPassword(password, user.password)) {
        addToLog('dashboard_login_failed', `Failed dashboard login attempt for ${phone_number}`);
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Invalid credentials' }));
        return;
      }
      
      if (user.level < 1) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'Management access required' }));
        return;
      }
      
      if (!user.passwordChanged) {
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          passwordChangeRequired: true,
          user: {
            phone_number: user.phone,
            user_name: user.name
          }
        }));
        return;
      }
      
      const dashboardToken = generateDashboardToken(user);
      
      addToLog('dashboard_login_success', `${user.name} accessed management dashboard`, user.phone);
      
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        sessionType: 'dashboard',
        token: dashboardToken,
        sessionDuration: '2 hours',
        user: {
          phone_number: user.phone,
          user_name: user.name,
          user_level: user.level,
          accessible_controllers: user.controllers
        },
        message: 'Dashboard access granted.'
      }));
    });
  }
  
  // Gate commands (works with both mobile and dashboard tokens)
  else if (path === '/api/command' && method === 'POST') {
    requireAuth(req, res, () => {
      parseJsonBody(req, (err, data) => {
        if (err) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
          return;
        }
        
        const { controller_id, relay_number, button_name } = data;
        
        if (!req.user.controllers.includes(controller_id)) {
          res.writeHead(403);
          res.end(JSON.stringify({ error: 'No access to this controller' }));
          return;
        }
        
        const relayBit = 1 << (relay_number - 1);
        if ((req.user.relayMask & relayBit) === 0) {
          res.writeHead(403);
          res.end(JSON.stringify({ error: 'No access to this relay' }));
          return;
        }
        
        const controller = controllers.find(c => c.id === controller_id);
        if (!controller) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Controller not found' }));
          return;
        }
        
        if (controller.status !== 'online') {
          res.writeHead(503);
          res.end(JSON.stringify({ 
            error: 'Controller offline',
            lastSeen: controller.lastCommunication
          }));
          return;
        }
        
        // Queue command for device
        const command = {
          command_id: `cmd_${Date.now()}`,
          action: button_name.toLowerCase().replace(' ', '_'),
          user_id: req.user.phone,
          relay_number: relay_number,
          timestamp: new Date().toISOString()
        };
        
        queueCommandForDevice(controller_id, command);
        
        // Optimistically update relay state
        controller.relays[relay_number].active = true;
        setTimeout(() => {
          controller.relays[relay_number].active = false;
        }, 2000);
        
        addToLog('command', `${button_name} queued for ${controller_id}`, req.user.phone, controller_id);
        
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          message: `${button_name} command sent to ${controller.name}`,
          command_id: command.command_id,
          controller: controller.name,
          timestamp: new Date().toISOString(),
          sessionType: req.user.type
        }));
      });
    });
  }
  
  // Get system status (dashboard only)
  else if (path === '/api/dashboard/status' && method === 'GET') {
    requireAuth(req, res, () => {
      if (req.user.level < 1) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'Management access required' }));
        return;
      }
      
      const onlineControllers = controllers.filter(c => c.status === 'online');
      const activeUsers = users.filter(u => u.active);
      
      res.writeHead(200);
      res.end(JSON.stringify({
        summary: {
          controllers: {
            total: controllers.length,
            online: onlineControllers.length,
            offline: controllers.length - onlineControllers.length
          },
          users: {
            total: activeUsers.length,
            admin: activeUsers.filter(u => u.level === 2).length,
            manager: activeUsers.filter(u => u.level === 1).length,
            regular: activeUsers.filter(u => u.level === 0).length
          },
          activity: {
            recent_logs: activityLog.slice(0, 10),
            total_logs: activityLog.length
          }
        },
        controllers: controllers,
        timestamp: new Date().toISOString()
      }));
    });
  }
  
  // Password change
  else if (path === '/api/change-password' && method === 'POST') {
    parseJsonBody(req, (err, data) => {
      if (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      
      const { phone_number, old_password, new_password } = data;
      
      if (!phone_number || !old_password || !new_password) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'All fields required' }));
        return;
      }
      
      if (new_password.length < 6 || new_password.length > 20) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Password must be 6-20 characters' }));
        return;
      }
      
      const user = users.find(u => u.phone === phone_number && u.active);
      
      if (!user) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'User not found' }));
        return;
      }
      
      if (!verifyPassword(old_password, user.password)) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Current password incorrect' }));
        return;
      }
      
      user.password = hashPassword(new_password);
      user.passwordChanged = true;
      
      addToLog('password_changed', `Password changed for ${user.name}`, user.phone);
      
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        message: 'Password changed successfully.'
      }));
    });
  }
  
  else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Mark controllers as offline if no heartbeat for 2 minutes
setInterval(() => {
  const now = Date.now();
  controllers.forEach(controller => {
    if (controller.status === 'online' && controller.lastCommunication) {
      const lastSeen = new Date(controller.lastCommunication).getTime();
      if (now - lastSeen > 120000) { // 2 minutes
        controller.status = 'offline';
        addToLog('device_offline', `Device ${controller.id} went offline`, null, controller.id);
        console.log(`⚠️ Device ${controller.id} marked offline (no heartbeat)`);
      }
    }
  });
}, 30000); // Check every 30 seconds

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log('✅ Gate Controller API - Full Device Integration');
  console.log(`🔗 Running on: http://localhost:${PORT}`);
  console.log('');
  console.log('📱 MOBILE MODE: /api/mobile/login');
  console.log('💻 DASHBOARD MODE: /api/dashboard/login');
  console.log('🔧 DEVICE ENDPOINTS: /api/device/*');
  console.log('');
  console.log('🔐 Demo Credentials:');
  console.log('   👑 Admin: +972522554743 / admin123');
  console.log('   👨‍💼 Manager: +972501234567 / temp123');
  console.log('   👤 User: +972587654321 / user123');
  console.log('');
  console.log('🔌 Waiting for ESP32 devices to connect...');
  
  addToLog('system', 'Enhanced Gate Controller API started with device support');
});