const http = require('http');

console.log('🚀 Starting Railway server with ESP32 support, User Management, and Dashboard Login...');

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

// Simple dashboard authentication
const DASHBOARD_USERS = new Map([
  ['admin', { password: 'admin123', name: 'Administrator' }],
  ['manager', { password: 'gate2024', name: 'Gate Manager' }]
]);

// Store active sessions (in production, use Redis or database)
const activeSessions = new Map();

function generateSessionToken() {
  return 'session_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function validateSession(sessionToken) {
  return activeSessions.has(sessionToken);
}

const server = http.createServer((req, res) => {
  console.log(`📡 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  
  // Set CORS headers for all requests
  res.setHeader('Content-Type', 'application/json');
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
      body += chunk.toString();
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

  // Dashboard login endpoint
  if (req.url === '/dashboard/login' && req.method === 'POST') {
    readBody((data) => {
      const { username, password } = data;
      const user = DASHBOARD_USERS.get(username);
      
      if (user && user.password === password) {
        const sessionToken = generateSessionToken();
        activeSessions.set(sessionToken, {
          username: username,
          name: user.name,
          loginTime: new Date().toISOString()
        });
        
        console.log(`🔐 Dashboard login successful: ${username}`);
        
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Set-Cookie': `session=${sessionToken}; HttpOnly; Path=/; Max-Age=86400` // 24 hours
        });
        res.end(JSON.stringify({
          success: true,
          message: 'Login successful',
          user: { username, name: user.name }
        }));
      } else {
        console.log(`🔐 Dashboard login failed: ${username}`);
        res.writeHead(401);
        res.end(JSON.stringify({
          success: false,
          message: 'Invalid username or password'
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
      console.log(`🔐 Dashboard logout: ${session.username}`);
    }
    
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': 'session=; HttpOnly; Path=/; Max-Age=0'
    });
    res.end(JSON.stringify({ success: true, message: 'Logged out' }));
    return;
  }

  // ESP32 Heartbeat endpoint (no auth required for device communication)
  if (req.url === '/api/device/heartbeat' && req.method === 'POST') {
    console.log(`💓 Heartbeat from ESP32: ${req.method} ${req.url}`);
    
    readBody((data) => {
      const deviceId = data.deviceId || 'unknown';
      const timestamp = new Date().toISOString();
      
      // Store/update device info
      connectedDevices.set(deviceId, {
        lastHeartbeat: timestamp,
        status: data.status || 'online',
        signalStrength: data.signalStrength || 0,
        batteryLevel: data.batteryLevel || 0,
        firmwareVersion: data.firmwareVersion || '1.0.0',
        uptime: data.uptime || 0,
        freeHeap: data.freeHeap || 0,
        connectionType: data.connectionType || 'wifi'
      });
      
      console.log(`💓 Device ${deviceId} heartbeat received:`, connectedDevices.get(deviceId));
      
     // res.writeHead(200);
      res.writeHead(200, { 
  'Content-Type': 'text/html; charset=utf-8'
});
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
    
    //res.writeHead(200);
    res.writeHead(200, { 
  'Content-Type': 'text/html; charset=utf-8'
});
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
      
      //res.writeHead(200);
      res.writeHead(200, { 
  'Content-Type': 'text/html; charset=utf-8'
});
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
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta charset="UTF-8">
    <style>
        body { 
            font-family: Arial, sans-serif; 
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
                <label for="username">Username:</label>
                <input type="text" id="username" name="username" required>
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
            Username: <code>admin</code> / Password: <code>admin123</code><br>
            Username: <code>manager</code> / Password: <code>gate2024</code>
        </div>
    </div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('error');
            
            try {
                const response = await fetch('/dashboard/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
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
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
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

  // User registration endpoint - require auth
  if (req.url.includes('/register-user') && req.method === 'POST') {
    requireAuth((session) => {
      const urlParts = req.url.split('/');
      const deviceId = urlParts[3];
      
      console.log(`👤 User registration for device: ${deviceId} by ${session.username}`);
      
      readBody((data) => {
        const registrationCommand = {
          id: 'reg_' + Date.now(),
          action: 'register_user',
          phone: data.phone,
          name: data.name || 'New User',
          relayMask: data.relayMask || 1,
          userLevel: data.userLevel || 0,
          timestamp: Date.now(),
          registeredBy: session.username
        };
        
        if (!deviceCommands.has(deviceId)) {
          deviceCommands.set(deviceId, []);
        }
        deviceCommands.get(deviceId).push(registrationCommand);
        
        console.log(`📝 Registration queued for device ${deviceId}:`, registrationCommand);
        
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          message: "User registration queued",
          phone: data.phone,
          deviceId: deviceId
        }));
      });
    });
    return;
  }

  // Command injection endpoint - require auth
  if (req.url.includes('/send-command') && req.method === 'POST') {
    requireAuth((session) => {
      const urlParts = req.url.split('/');
      const deviceId = urlParts[3];
      
      console.log(`🎮 Command sent to ESP32 device: ${deviceId} by ${session.username}`);
      
      readBody((data) => {
        const command = {
          id: data.id || 'cmd_' + Date.now(),
          action: data.action || 'relay_activate',
          relay: data.relay || 1,
          duration: data.duration || 2000,
          user: data.user || session.username,
          user_id: data.user_id || null,
          timestamp: Date.now(),
          sentBy: session.username
        };
        
        if (!deviceCommands.has(deviceId)) {
          deviceCommands.set(deviceId, []);
        }
        deviceCommands.get(deviceId).push(command);
        
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

  // Protected dashboard - require auth
  if (req.url === '/dashboard') {
    requireAuth((session) => {
      const dashboardHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>🚪 Gate Controller Dashboard</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1000px; margin: 0 auto; }
        .header { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; }
        .user-info { color: #666; }
        .logout { background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
        .card { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .device { border-left: 4px solid #28a745; }
        .device.offline { border-left-color: #dc3545; }
        .controls { display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
        .device-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        button { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
        .open { background: #28a745; color: white; }
        .stop { background: #ffc107; color: black; }
        .close { background: #dc3545; color: white; }
        .partial { background: #6f42c1; color: white; }
        .register { background: #17a2b8; color: white; }
        .status { font-size: 0.9em; color: #666; }
        h1 { color: #333; margin: 0; }
        .refresh { background: #007bff; color: white; margin-bottom: 20px; }
        input, select { padding: 10px; border: 1px solid #ddd; border-radius: 4px; width: 100%; margin-bottom: 10px; }
        .form-grid { display: grid; gap: 10px; max-width: 400px; }
        .checkbox-group { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0; }
        .checkbox-group label { display: flex; align-items: center; gap: 5px; margin: 0; }
        .user-management { border-left: 4px solid #17a2b8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div>
                <h1>🚪 Gate Controller Dashboard</h1>
                <div class="user-info">Logged in as: <strong>${session.name}</strong> (${session.username})</div>
            </div>
            <button class="logout" onclick="logout()">🚪 Logout</button>
        </div>
        
        <button class="refresh" onclick="location.reload()">🔄 Refresh</button>
        
        <div id="devices"></div>
        
        <div class="card">
            <h3>📊 Server Status</h3>
            <p>✅ Server running on port ${PORT}</p>
            <p>🕒 Started: ${new Date().toISOString()}</p>
            <p>📱 Connected Devices: <span id="deviceCount">${connectedDevices.size}</span></p>
            <p>👤 Active Sessions: ${activeSessions.size}</p>
        </div>
    </div>

    <script>
        const devices = ${JSON.stringify(Array.from(connectedDevices.entries()))};
        
        async function logout() {
            try {
                await fetch('/dashboard/logout', { method: 'POST' });
                window.location.href = '/dashboard';
            } catch (error) {
                alert('Logout error: ' + error.message);
            }
        }
        
        function sendCommand(deviceId, relay, action) {
            const userId = prompt("Enter your registered phone number:");
            if (!userId) return;
            
            if (!/^\\d{10}$/.test(userId)) {
                alert('Please enter a valid 10-digit phone number');
                return;
            }
            
            if (!confirm('Send ' + action + ' command with user ID: ' + userId + '?')) {
                return;
            }
            
            fetch('/api/device/' + deviceId + '/send-command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: 'web_' + Date.now(),
                    action: 'relay_activate',
                    relay: relay,
                    duration: 2000,
                    user: 'dashboard',
                    user_id: parseInt(userId)
                })
            })
            .then(r => r.json())
            .then(d => {
                if (d.success) {
                    alert('✅ Command sent: ' + action);
                } else {
                    alert('❌ Command failed');
                }
            })
            .catch(e => alert('❌ Error: ' + e.message));
        }
        
        function registerUser(deviceId) {
            const phone = document.getElementById('phone-' + deviceId).value;
            const name = document.getElementById('name-' + deviceId).value;
            const userLevel = parseInt(document.getElementById('userLevel-' + deviceId).value);
            
            let relayMask = 0;
            if (document.getElementById('relay1-' + deviceId).checked) relayMask |= 1;
            if (document.getElementById('relay2-' + deviceId).checked) relayMask |= 2;
            if (document.getElementById('relay3-' + deviceId).checked) relayMask |= 4;
            if (document.getElementById('relay4-' + deviceId).checked) relayMask |= 8;
            
            if (!phone || !name) {
                alert('Please fill in all fields');
                return;
            }
            
            if (!/^\\d{10}$/.test(phone)) {
                alert('Please enter a valid 10-digit phone number');
                return;
            }
            
            fetch('/api/device/' + deviceId + '/register-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: parseInt(phone),
                    name: name,
                    relayMask: relayMask,
                    userLevel: userLevel
                })
            })
            .then(r => r.json())
            .then(d => {
                if (d.success) {
                    alert('✅ User registered: ' + name + ' (' + phone + ')');
                    document.getElementById('phone-' + deviceId).value = '';
                    document.getElementById('name-' + deviceId).value = '';
                    document.getElementById('userLevel-' + deviceId).value = '0';
                    document.querySelectorAll('input[type="checkbox"][id*="' + deviceId + '"]').forEach(cb => cb.checked = false);
                    document.getElementById('relay1-' + deviceId).checked = true;
                } else {
                    alert('❌ Registration failed');
                }
            })
            .catch(e => alert('❌ Error: ' + e.message));
        }
        
        function renderDevices() {
            const container = document.getElementById('devices');
            if (devices.length === 0) {
                container.innerHTML = '<div class="card"><p>📭 No devices connected yet. Waiting for ESP32 heartbeat...</p></div>';
                return;
            }
            
            container.innerHTML = devices.map(([deviceId, info]) => {
                const isOnline = (Date.now() - new Date(info.lastHeartbeat).getTime()) < 60000;
                return \`
                    <div class="card device \${isOnline ? '' : 'offline'}">
                        <h3>🎛️ \${deviceId} \${isOnline ? '🟢' : '🔴'}</h3>
                        <div class="status">
                            📶 Signal: \${info.signalStrength}dBm | 
                            🔋 Battery: \${info.batteryLevel}% | 
                            ⏱️ Uptime: \${Math.floor(info.uptime / 1000)}s<br>
                            🔄 Last Heartbeat: \${new Date(info.lastHeartbeat).toLocaleTimeString()}
                        </div>
                        
                        <div class="device-controls">
                            <div>
                                <h4>🎮 Device Controls</h4>
                                <div class="controls">
                                    <button class="open" onclick="sendCommand('\${deviceId}', 1, 'OPEN')">🔓 OPEN</button>
                                    <button class="stop" onclick="sendCommand('\${deviceId}', 2, 'STOP')">⏸️ STOP</button>
                                    <button class="close" onclick="sendCommand('\${deviceId}', 3, 'CLOSE')">🔒 CLOSE</button>
                                    <button class="partial" onclick="sendCommand('\${deviceId}', 4, 'PARTIAL')">↗️ PARTIAL</button>
                                </div>
                                <p style="font-size: 0.8em; color: #666; margin-top: 10px;">
                                    🔐 Commands require registered phone number authentication
                                </p>
                            </div>
                            
                            <div class="user-management">
                                <h4>👤 Register New User</h4>
                                <div class="form-grid">
                                    <input type="tel" id="phone-\${deviceId}" placeholder="Phone Number (1234567890)" maxlength="10" required>
                                    <input type="text" id="name-\${deviceId}" placeholder="User Name" required>
                                    <select id="userLevel-\${deviceId}">
                                        <option value="0">👤 Basic User</option>
                                        <option value="1">👔 Manager</option>
                                        <option value="2">🔐 Admin</option>
                                    </select>
                                    <div>
                                        <label style="font-weight: bold; margin-bottom: 5px; display: block;">🔑 Permissions:</label>
                                        <div class="checkbox-group">
                                            <label><input type="checkbox" id="relay1-\${deviceId}" checked> 🔓 OPEN</label>
                                            <label><input type="checkbox" id="relay2-\${deviceId}"> ⏸️ STOP</label>
                                            <label><input type="checkbox" id="relay3-\${deviceId}"> 🔒 CLOSE</label>
                                            <label><input type="checkbox" id="relay4-\${deviceId}"> ↗️ PARTIAL</label>
                                        </div>
                                    </div>
                                    <button class="register" onclick="registerUser('\${deviceId}')">
                                        ➕ Register User
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                \`;
            }).join('');
        }
        
        renderDevices();
    </script>
</body>
</html>`;
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(dashboardHtml);
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
        'POST /dashboard/login',
        'POST /dashboard/logout', 
        'GET /health', 
        'POST /api/device/heartbeat',
        'GET /api/device/{deviceId}/commands',
        'POST /api/device/auth',
        'POST /api/device/{deviceId}/send-command (requires login)',
        'POST /api/device/{deviceId}/register-user (requires login)'
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
    message: '🎉 Railway Gate Controller Server with Authentication',
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
  console.log('🎉 Server successfully listening with Authentication!');
  console.log(`✅ Port: ${addr.port}`);
  console.log(`✅ Address: ${addr.address}`);
  console.log(`🌐 Railway should now be able to route traffic`);
  console.log(`📱 Dashboard: https://gate-controller-system-production.up.railway.app/dashboard`);
  console.log(`🔐 Demo Login: admin/admin123 or manager/gate2024`);
});

// Start server
server.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
  console.log(`💫 Server started on ${PORT} with Authentication`);
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
    }
  }
  
  // Clean up old sessions (older than 24 hours)
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  for (const [sessionToken, session] of activeSessions.entries()) {
    if (new Date(session.loginTime).getTime() < oneDayAgo) {
      console.log(`🗑️ Removing expired session: ${session.username}`);
      activeSessions.delete(sessionToken);
    }
  }
}, 30000);
