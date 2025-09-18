const http = require('http');

console.log('🚀 Starting Railway server with improved dashboard...');

const PORT = process.env.PORT || 3001;

// Store connected devices and commands
const connectedDevices = new Map();
const deviceCommands = new Map();

// Dashboard authentication users
const DASHBOARD_USERS = new Map([
  ['admin', { password: 'admin123', name: 'Administrator', role: 'admin' }],
  ['manager', { password: 'gate2024', name: 'Gate Manager', role: 'manager' }]
]);

// Store active sessions
const activeSessions = new Map();

function generateSessionToken() {
  return 'session_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function validateSession(sessionToken) {
  return activeSessions.has(sessionToken);
}

const server = http.createServer((req, res) => {
  console.log(`📡 ${req.method} ${req.url}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Helper functions
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
        console.error('JSON Parse Error:', error);
        callback({});
      }
    });
  }

  function getSessionFromCookie(cookieHeader) {
    if (!cookieHeader) return null;
    const sessionMatch = cookieHeader.match(/session=([^;]+)/);
    return sessionMatch ? sessionMatch[1] : null;
  }

  // Dashboard login
  if (req.url === '/dashboard/login' && req.method === 'POST') {
    readBody((data) => {
      const { username, password } = data;
      const user = DASHBOARD_USERS.get(username);
      
      if (user && user.password === password) {
        const sessionToken = generateSessionToken();
        activeSessions.set(sessionToken, {
          username: username,
          name: user.name,
          role: user.role,
          loginTime: new Date().toISOString()
        });
        
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Set-Cookie': `session=${sessionToken}; HttpOnly; Path=/; Max-Age=86400`
        });
        res.end(JSON.stringify({
          success: true,
          message: 'Login successful'
        }));
      } else {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Invalid credentials'
        }));
      }
    });
    return;
  }

  // Dashboard logout
  if (req.url === '/dashboard/logout' && req.method === 'POST') {
    const sessionToken = getSessionFromCookie(req.headers.cookie);
    if (sessionToken && activeSessions.has(sessionToken)) {
      activeSessions.delete(sessionToken);
    }
    
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': 'session=; HttpOnly; Path=/; Max-Age=0'
    });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // Main dashboard
  if ((req.url === '/dashboard' || req.url === '/') && req.method === 'GET') {
    const sessionToken = getSessionFromCookie(req.headers.cookie);
    
    if (sessionToken && validateSession(sessionToken)) {
      // Show dashboard
      const session = activeSessions.get(sessionToken);
      const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Gate Controller Dashboard</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; margin: 0; background: #f5f5f5; }
        .header { background: white; padding: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .logout { background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .nav { background: white; padding: 0; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .nav ul { list-style: none; padding: 0; margin: 0; display: flex; }
        .nav li { flex: 1; }
        .nav a { display: block; padding: 15px; text-decoration: none; color: #333; text-align: center; border-right: 1px solid #eee; }
        .nav a:hover, .nav a.active { background: #667eea; color: white; }
        .nav li:last-child a { border-right: none; }
        .content { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 20px 0; }
        .device-card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .device-card.online { border-left: 4px solid #28a745; }
        .device-card.offline { border-left: 4px solid #dc3545; }
        .controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-top: 15px; }
        .btn { padding: 12px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
        .btn-open { background: #28a745; color: white; }
        .btn-stop { background: #ffc107; color: black; }
        .btn-close { background: #dc3545; color: white; }
        .btn-partial { background: #6f42c1; color: white; }
        .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .status-item { background: #f8f9fa; padding: 15px; border-radius: 6px; }
        .hidden { display: none; }
        .alert { padding: 15px; border-radius: 6px; margin: 10px 0; }
        .alert-warning { background: #fff3cd; color: #856404; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>Gate Controller Dashboard</h1>
            <div>Logged in as: <strong>${session.name}</strong></div>
        </div>
        <button class="logout" onclick="logout()">Logout</button>
    </div>

    <div class="container">
        <nav class="nav">
            <ul>
                <li><a href="#" class="nav-link active" data-section="control">Device Control</a></li>
                <li><a href="#" class="nav-link" data-section="users">User Management</a></li>
                <li><a href="#" class="nav-link" data-section="settings">Settings</a></li>
            </ul>
        </nav>

        <div id="control-section" class="content">
            <h2>Device Control Center</h2>
            <div id="devices-container">
                <div class="alert alert-warning">No devices connected. Waiting for ESP32 heartbeat...</div>
            </div>
        </div>

        <div id="users-section" class="content hidden">
            <h2>User Management</h2>
            <p>Manage device users and permissions from this interface.</p>
        </div>

        <div id="settings-section" class="content hidden">
            <h2>System Settings</h2>
            <div class="status-grid">
                <div class="status-item">Server Status: Running</div>
                <div class="status-item">Devices: ${connectedDevices.size}</div>
                <div class="status-item">Sessions: ${activeSessions.size}</div>
            </div>
        </div>
    </div>

    <script>
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.dataset.section;
                
                document.querySelectorAll('.content').forEach(s => s.classList.add('hidden'));
                document.getElementById(section + '-section').classList.remove('hidden');
                
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        async function logout() {
            await fetch('/dashboard/logout', { method: 'POST' });
            window.location.href = '/dashboard';
        }
    </script>
</body>
</html>`;
      
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }
    
    // Show login page
    const loginHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Gate Controller Login</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { 
            font-family: Arial, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0; padding: 0; min-height: 100vh;
            display: flex; align-items: center; justify-content: center;
        }
        .login-container { 
            background: white; padding: 40px; border-radius: 15px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.3); max-width: 400px; width: 90%;
        }
        .login-header { text-align: center; margin-bottom: 30px; }
        .login-header h1 { margin: 0; font-size: 2em; color: #667eea; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; 
                font-size: 16px; box-sizing: border-box; }
        input:focus { outline: none; border-color: #667eea; }
        button { width: 100%; padding: 12px; background: #667eea; color: white; 
                border: none; border-radius: 8px; font-size: 16px; font-weight: bold; 
                cursor: pointer; margin-bottom: 15px; }
        button:hover { background: #5a6fd8; }
        .error { color: #dc3545; text-align: center; font-weight: bold; }
        .demo-info { background: #f8f9fa; padding: 15px; border-radius: 8px; 
                    margin-top: 20px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-header">
            <h1>Gate Controller</h1>
            <p>Dashboard Login</p>
        </div>
        
        <form id="loginForm">
            <div class="form-group">
                <label for="username">Username:</label>
                <input type="text" id="username" required>
            </div>
            
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" required>
            </div>
            
            <button type="submit">Login</button>
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
                    document.getElementById('error').textContent = data.message;
                }
            } catch (error) {
                document.getElementById('error').textContent = 'Connection error';
            }
        });
    </script>
</body>
</html>`;
    
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(loginHtml);
    return;
  }

  // ESP32 endpoints
  if (req.url === '/api/device/heartbeat' && req.method === 'POST') {
    readBody((data) => {
      const deviceId = data.deviceId || 'unknown';
      connectedDevices.set(deviceId, {
        lastHeartbeat: new Date().toISOString(),
        status: data.status || 'online',
        signalStrength: data.signalStrength || 0,
        batteryLevel: data.batteryLevel || 100,
        uptime: data.uptime || 0
      });
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: "Heartbeat received" }));
    });
    return;
  }

  if (req.url.includes('/commands') && req.method === 'GET') {
    const deviceId = req.url.split('/')[3];
    const commands = deviceCommands.get(deviceId) || [];
    deviceCommands.set(deviceId, []);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(commands));
    return;
  }

  if (req.url === '/api/device/auth' && req.method === 'POST') {
    readBody((data) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        token: "device_token_" + (data.deviceId || 'unknown') + "_" + Date.now(),
        message: "Device authenticated"
      }));
    });
    return;
  }

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Server running',
      timestamp: new Date().toISOString(),
      devices: connectedDevices.size,
      sessions: activeSessions.size
    }));
    return;
  }

  // Default response
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    message: 'Gate Controller Server',
    timestamp: new Date().toISOString()
  }));
});

server.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
  console.log(`Server started on port ${PORT}`);
});

// Cleanup
setInterval(() => {
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  for (const [deviceId, info] of connectedDevices.entries()) {
    if (new Date(info.lastHeartbeat).getTime() < fiveMinutesAgo) {
      connectedDevices.delete(deviceId);
      deviceCommands.delete(deviceId);
    }
  }
  
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  for (const [token, session] of activeSessions.entries()) {
    if (new Date(session.loginTime).getTime() < oneDayAgo) {
      activeSessions.delete(token);
    }
  }
}, 30000);
