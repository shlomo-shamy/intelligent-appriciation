console.log('🚀 Starting Gate Controller Server - Dual Authentication...');

const http = require('http');
const crypto = require('crypto');
const url = require('url');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

// Two types of tokens
function generateMobileToken(user) {
  // Long-lasting token for mobile users (30 days)
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
  // Short-lived token for dashboard access (2 hours)
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

const controllers = [
  {
    id: 'GC001',
    name: 'Main Entrance',
    nickname: 'Front Gate',
    location: 'Building A - Main Entry',
    status: 'online',
    lastCommunication: new Date().toISOString(),
    relays: {
      1: { name: 'Open', active: false },
      2: { name: 'Stop', active: false },
      3: { name: 'Close', active: false },
      4: { name: 'Partial', active: false }
    }
  },
  {
    id: 'GC002',
    name: 'Parking Gate',
    nickname: 'Parking',
    location: 'Building B - Parking',
    status: 'online',
    lastCommunication: new Date(Date.now() - 300000).toISOString(),
    relays: {
      1: { name: 'Open', active: false },
      2: { name: 'Stop', active: false },
      3: { name: 'Close', active: false },
      4: { name: 'Emergency', active: false }
    }
  }
];

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
  
  if (activityLog.length > 100) {
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
      message: '🚀 Gate Controller API - Dual Mode Authentication',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      modes: {
        mobile: '📱 Quick access for gate control',
        dashboard: '💻 Management interface'
      },
      endpoints: {
        mobile: '/api/mobile/login - Long-lasting session',
        dashboard: '/api/dashboard/login - Secure session',
        commands: '/api/command - Gate control',
        management: '/api/* - Admin functions'
      }
    }));
  }
  
  // Mobile login - creates persistent session
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
        message: 'Welcome! You are now connected. Keep this app handy for quick gate access.'
      }));
    });
  }
  
  // Dashboard login - creates temporary session
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
        message: 'Dashboard access granted. Session expires in 2 hours.'
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
        if (!controller || controller.status !== 'online') {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Controller offline or not found' }));
          return;
        }
        
        controller.relays[relay_number].active = true;
        setTimeout(() => {
          controller.relays[relay_number].active = false;
        }, 2000);
        
        addToLog('command', `${button_name} executed on ${controller_id}`, req.user.phone, controller_id);
        
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          message: `${button_name} command executed`,
          controller: controller.name,
          timestamp: new Date().toISOString(),
          sessionType: req.user.type
        }));
      });
    });
  }
  
  
  // Password change endpoint
  else if (path === '/api/change-password' && method === 'POST') {
    parseJsonBody(req, (err, data) => {
      if (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      
      const { phone_number, old_password, new_password } = data;
      
      console.log(`Password change attempt for: ${phone_number}`);
      
      if (!phone_number || !old_password || !new_password) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'All fields required' }));
        return;
      }
      
      if (new_password.length < 6 || new_password.length > 8) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Password must be 6-8 characters' }));
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
      
      // Update password
      user.password = hashPassword(new_password);
      user.passwordChanged = true;
      
      addToLog('password_changed', `Password changed for ${user.name}`, user.phone);
      
      console.log(`✅ Password changed successfully for ${user.name}`);
      
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        message: 'Password changed successfully'
      }));
    });
  }
  
  
  // Password change endpoint
  else if (path === '/api/change-password' && method === 'POST') {
    parseJsonBody(req, (err, data) => {
      if (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      
      const { phone_number, old_password, new_password } = data;
      
      console.log(`Password change attempt for: ${phone_number}`);
      
      if (!phone_number || !old_password || !new_password) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'All fields required' }));
        return;
      }
      
      if (new_password.length < 6 || new_password.length > 8) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Password must be 6-8 characters' }));
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
      
      // Update password
      user.password = hashPassword(new_password);
      user.passwordChanged = true;
      
      addToLog('password_changed', `Password changed for ${user.name}`, user.phone);
      
      console.log(`✅ Password changed successfully for ${user.name}`);
      
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        message: 'Password changed successfully'
      }));
    });
  }
  
  else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log('✅ Gate Controller API - Dual Authentication Mode');
  console.log(`🔗 Running on: http://localhost:${PORT}`);
  console.log('');
  console.log('📱 MOBILE MODE:');
  console.log('   • One-time login → Stay connected');
  console.log('   • Instant gate access');
  console.log('   • 30-day sessions');
  console.log('   • Endpoint: /api/mobile/login');
  console.log('');
  console.log('💻 DASHBOARD MODE:');
  console.log('   • Login required each time');
  console.log('   • Full management features');  
  console.log('   • 2-hour sessions');
  console.log('   • Endpoint: /api/dashboard/login');
  console.log('');
  console.log('🔐 Demo Credentials:');
  console.log('   👑 Admin: +972522554743 / admin123');
  console.log('   👨‍💼 Manager: +972501234567 / temp123');
  console.log('   👤 User: +972587654321 / user123');
  
  addToLog('system', 'Dual Authentication Gate Controller API started');
});
