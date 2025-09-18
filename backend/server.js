const http = require('http');

console.log('🚀 Starting Railway server with improved dashboard structure...');

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
  console.log(`📡 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  
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
        console.error('❌ JSON Parse Error:', error);
        callback({});
      }
    });
  }

  function getSessionFromCookie(cookieHeader) {
    if (!cookieHeader) return null;
    const sessionMatch = cookieHeader.match(/session=([^;]+)/);
    return sessionMatch ? sessionMatch[1] : null;
  }

  function requireAuth(callback) {
    const sessionToken = getSessionFromCookie(req.headers.cookie);
    if (!sessionToken || !validateSession(sessionToken)) {
      return false;
    }
    const session = activeSessions.get(sessionToken);
    callback(session);
    return true;
  }

  // Dashboard login page
  if ((req.url === '/dashboard' || req.url === '/') && req.method === 'GET') {
    const sessionToken = getSessionFromCookie(req.headers.cookie);
    if (sessionToken && validateSession(sessionToken)) {
      // User is logged in, show main dashboard
      const session = activeSessions.get(sessionToken);
      const dashboardHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Gate Controller Dashboard</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; margin: 0; background: #f5f5f5; }
        .header { background: white; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; }
        .user-info { color: #666; }
        .logout { background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
        .nav { background: white; margin: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .nav ul { list-style: none; padding: 0; margin: 0; display: flex; }
        .nav li { flex: 1; }
        .nav a { display: block; padding: 15px; text-decoration: none; color: #333; text-align: center; border-right: 1px solid #eee; }
        .nav a:hover, .nav a.active { background: #667eea; color: white; }
        .nav li:last-child a { border-right: none; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .content { background: white; margin: 20px; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .device-card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .device-card.online { border-left: 4px solid #28a745; }
        .device-card.offline { border-left: 4px solid #dc3545; }
        .controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-top: 15px; }
        button { padding: 12px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; transition: background 0.3s; }
        .btn-open { background: #28a745; color: white; }
        .btn-stop { background: #ffc107; color: black; }
        .btn-close { background: #dc3545; color: white; }
        .btn-partial { background: #6f42c1; color: white; }
        .btn-open:hover { background: #218838; }
        .btn-stop:hover { background: #e0a800; }
        .btn-close:hover { background: #c82333; }
        .btn-partial:hover { background: #5a32a3; }
        .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .status-item { background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #667eea; }
        .status-label { font-weight: bold; color: #495057; margin-bottom: 5px; }
        .status-value { font-size: 1.1em; color: #333; }
        .alert { padding: 15px; border-radius: 6px; margin: 10px 0; }
        .alert-success { background: #d4edda; border-left: 4px solid #28a745; color: #155724; }
        .alert-warning { background: #fff3cd; border-left: 4px solid #ffc107; color: #856404; }
        .alert-danger { background: #f8d7da; border-left: 4px solid #dc3545; color: #721c24; }
        .hidden { display: none; }
        h1, h2, h3 { color: #333; margin: 0 0 15px 0; }
        .refresh-btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; margin-bottom: 20px; }
        .refresh-btn:hover { background: #0056b3; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>Gate Controller Dashboard</h1>
            <div class="user-info">Logged in as: <strong>${session.name}</strong> (${session.username})</div>
        </div>
        <button class="logout" onclick="logout()">Logout</button>
    </div>

    <div class="container">
        <nav class="nav">
            <ul>
                <li><a href="#" class="nav-link active" data-section="control">Device Control</a></li>
                <li><a href="#" class="nav-link" data-section="users">User Management</a></li>
                <li><a href="#" class="nav-link" data-section="settings">Settings</a></li>
                <li><a href="#" class="nav-link" data-section="logs">Activity Logs</a></li>
            </ul>
        </nav>

        <!-- Device Control Section -->
        <div id="control-section" class="content">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h2>Device Control Center</h2>
                <button class="refresh-btn" onclick="refreshDevices()">Refresh Status</button>
            </div>
            <div id="devices-container"></div>
            <div id="system-status"></div>
        </div>

        <!-- User Management Section -->
        <div id="users-section" class="content hidden">
            <h2>User Management</h2>
            <p>Manage device users and permissions from this centralized interface.</p>
            <div id="user-management-content"></div>
        </div>

        <!-- Settings Section -->
        <div id="settings-section" class="content hidden">
            <h2>System Settings</h2>
            <p>Configure system-wide settings and preferences.</p>
            <div class="status-grid">
                <div class="status-item">
                    <div class="status-label">Server Status</div>
                    <div class="status-value">Running on port ${PORT}</div>
                </div>
                <div class="status-item">
                    <div class="status-label">Connected Devices</div>
                    <div class="status-value">${connectedDevices.size}</div>
                </div>
                <div class="status-item">
                    <div class="status-label">Active Sessions</div>
                    <div class="status-value">${activeSessions.size}</div>
                </div>
                <div class="status-item">
                    <div class="status-label">Server Time</div>
                    <div class="status-value">${new Date().toLocaleString()}</div>
                </div>
            </div>
        </div>

        <!-- Activity Logs Section -->
        <div id="logs-section" class="content hidden">
            <h2>Activity Logs</h2>
            <p>View recent system activity and command history.</p>
            <div id="activity-logs">
                <div class="alert alert-success">Device ESP32_GATE_50:78:7D:14:4D:28 connected</div>
                <div class="alert alert-warning">User registration queued for device</div>
                <div class="alert alert-success">Command executed successfully</div>
            </div>
        </div>
    </div>

    <script>
        const devices = ${JSON.stringify(Array.from(connectedDevices.entries()))};

        // Navigation handling
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.dataset.section;
                showSection(section);
                
                // Update active nav
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        function showSection(sectionName) {
            document.querySelectorAll('.content').forEach(section => {
                section.classList.add('hidden');
            });
            document.getElementById(sectionName + '-section').classList.remove('hidden');
        }

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
                    showAlert('Command sent: ' + action, 'success');
                } else {
                    showAlert('Command failed', 'danger');
                }
            })
            .catch(e => showAlert('Error: ' + e.message, 'danger'));
        }

        function showAlert(message, type) {
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-' + type;
            alertDiv.textContent = message;
            document.getElementById('control-section').insertBefore(alertDiv, document.getElementById('devices-container'));
            setTimeout(() => alertDiv.remove(), 5000);
        }

        function refreshDevices() {
            location.reload();
        }

        function renderDevices() {
            const container = document.getElementById('devices-container');
            if (devices.length === 0) {
                container.innerHTML = '<div class="alert alert-warning">No devices connected. Waiting for ESP32 heartbeat...</div>';
                return;
            }
            
            container.innerHTML = devices.map(([deviceId, info]) => {
                const isOnline = (Date.now() - new Date(info.lastHeartbeat).getTime()) < 60000;
                return \`
                    <div class="device-card \${isOnline ? 'online' : 'offline'}">
                        <h3>\${deviceId} <span style="color: \${isOnline ? '#28a745' : '#dc3545'};">(\${isOnline ? 'ONLINE' : 'OFFLINE'})</span></h3>
                        
                        <div class="status-grid">
                            <div class="status-item">
                                <div class="status-label">Signal Strength</div>
                                <div class="status-value">\${info.signalStrength}dBm</div>
                            </div>
                            <div class="status-item">
                                <div class="status-label">Battery Level</div>
                                <div class="status-value">\${info.batteryLevel}%</div>
                            </div>
                            <div class="status-item">
                                <div class="status-label">Uptime</div>
                                <div class="status-value">\${Math.floor(info.uptime / 1000)}s</div>
                            </div>
                            <div class="status-item">
                                <div class="status-label">Last Heartbeat</div>
                                <div class="status-value">\${new Date(info.lastHeartbeat).toLocaleTimeString()}</div>
                            </div>
                        </div>

                        <div class="controls">
                            <button class="btn-open" onclick="sendCommand('\${deviceId}', 1, 'OPEN')">OPEN</button>
                            <button class="btn-stop" onclick="sendCommand('\${deviceId}', 2, 'STOP')">STOP</button>
                            <button class="btn-close" onclick="sendCommand('\${deviceId}', 3, 'CLOSE')">CLOSE</button>
                            <button class="btn-partial" onclick="sendCommand('\${deviceId}', 4, 'PARTIAL')">PARTIAL</button>
                        </div>
                        
                        <div style="margin-top: 15px; font-size: 0.9em; color: #666;">
                            Commands require registered phone number authentication
                        </div>
                    </div>
                \`;
            }).join('');
        }

        function renderUserManagement() {
            const container = document.getElementById('user-management-content');
            container.innerHTML = devices.map(([deviceId, info]) => \`
                <div class="device-card">
                    <h3>Register User for \${deviceId}</h3>
                    <div style="max-width: 400px;">
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Phone Number:</label>
                            <input type="tel" id="phone-\${deviceId}" placeholder="1234567890" maxlength="10" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">User Name:</label>
                            <input type="text" id="name-\${deviceId}" placeholder="User Name" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">User Level:</label>
                            <select id="userLevel-\${deviceId}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                                <option value="0">Basic User</option>
                                <option value="1">Manager</option>
                                <option value="2">Admin</option>
                            </select>
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Permissions:</label>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <label style="display: flex; align-items: center; gap: 5px;"><input type="checkbox" id="relay1-\${deviceId}" checked> OPEN</label>
                                <label style="display: flex; align-items: center; gap: 5px;"><input type="checkbox" id="relay2-\${deviceId}"> STOP</label>
                                <label style="display: flex; align-items: center; gap: 5px;"><input type="checkbox" id="relay3-\${deviceId}"> CLOSE</label>
                                <label style="display: flex; align-items: center; gap: 5px;"><input type="checkbox" id="relay4-\${deviceId}"> PARTIAL</label>
                            </div>
                        </div>
                        <button onclick="registerUser('\${deviceId}')" style="background: #17a2b8; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Register User</button>
                    </div>
                </div>
            \`).join('');
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
                    alert('User registered successfully: ' + name + ' (' + phone + ')');
                    document.getElementById('phone-' + deviceId).value = '';
                    document.getElementById('name-' + deviceId).value = '';
                    document.getElementById('userLevel-' + deviceId).value = '0';
                    document.querySelectorAll('input[type="checkbox"][id*="' + deviceId + '"]').forEach(cb => cb.checked = false);
                    document.getElementById('relay1-' + deviceId).checked = true;
                } else {
                    alert('Registration failed');
                }
            })
            .catch(e => alert('Error: ' + e.message));
        }

        // Initialize dashboard
        renderDevices();
        renderUserManagement();
    </script>
</body>
</html>`;
      
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(dashboardHtml);
      return;
    }
    
    // Show login page
    const loginHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Gate Controller Login</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
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
            margin-bottom: 15px;
        }
        button:hover { background: #5a6fd8; }
        .signup-link {
            text-align: center;
            margin-top: 20px;
        }
        .signup-link a {
            color: #667eea;
            text-decoration: none;
            font-weight: bold;
        }
        .signup-link a:hover {
            text-decoration: underline;
        }
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
            <h1>Gate Controller</h1>
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
            
            <button type="submit">Login</button>
            
            <div id="error" class="error"></div>
        </form>
        
        <div class="signup-link">
            <a href="/signup">Don't have an account? Sign up for dashboard access</a>
        </div>
        
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
    
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(loginHtml);
    return;
  }

  // Signup page
  if (req.url === '/signup' && req.method === 'GET') {
    const signupHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Gate Controller Signup</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
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
        .signup-container { 
            background: white; 
            padding: 40px; 
            border-radius: 15px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            max-width: 500px;
            width: 90%;
        }
        .signup-header { 
            text-align: center; 
            margin-bottom: 30px;
            color: #333;
        }
        .signup-header h1 {
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
        input, select { 
            width: 100%; 
            padding: 12px; 
            border: 2px solid #ddd; 
            border-radius: 8px; 
            font-size: 16px;
            box-sizing: border-box;
        }
        input:focus, select:focus {
            outline: none;
            border-color: #667eea;
        }
        button { 
            width: 100%; 
            padding: 12px; 
            background: #28a745; 
            color: white; 
            border: none; 
            border-radius: 8px; 
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: background 0.3s;
            margin-bottom: 15px;
        }
        button:hover { background: #218838; }
        .login-link {
            text-align: center;
            margin-top: 20px;
        }
        .login-link a {
            color: #667eea;
            text-decoration: none;
            font-weight: bold;
        }
        .login-link a:hover {
            text-decoration: underline;
        }
        .error, .success { 
            margin-top: 10px; 
            text-align: center;
            font-weight: bold;
            padding: 10px;
            border-radius: 6px;
        }
        .error {
            color: #dc3545;
            background: #f8d7da;
        }
        .success {
            color: #155724;
            background: #d4edda;
        }
        .info-box {
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
    <div class="signup-container">
        <div class="signup-header">
            <h1>Dashboard Signup</h1>
            <p>Request access to the Gate Controller Dashboard</p>
        </div>
        
        <form id="signupForm">
            <div class="form-group">
                <label for="fullName">Full Name:</label>
