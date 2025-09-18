const http = require('http');

console.log('🚀 Starting Railway server with enhanced multi-screen dashboard...');

const PORT = process.env.PORT || 3001;

// Store connected devices and commands
const connectedDevices = new Map();
const deviceCommands = new Map();

// Enhanced user management with permissions
const DASHBOARD_USERS = new Map([
  ['admin', { 
    password: 'admin123', 
    name: 'Administrator', 
    role: 'admin',
    authorizedDevices: ['*'], // * means all devices
    buttonMasks: {
      open: true,
      close: true,
      stop: true,
      partial: true,
      lock: true,
      unlock: true
    }
  }],
  ['manager', { 
    password: 'gate2024', 
    name: 'Gate Manager', 
    role: 'manager',
    authorizedDevices: ['device_001', 'device_002', 'device_003'],
    buttonMasks: {
      open: true,
      close: true,
      stop: true,
      partial: true,
      lock: false,
      unlock: false
    }
  }],
  ['operator', {
    password: 'gate123',
    name: 'Gate Operator',
    role: 'operator',
    authorizedDevices: ['device_001', 'device_002'],
    buttonMasks: {
      open: true,
      close: true,
      stop: true,
      partial: false,
      lock: false,
      unlock: false
    }
  }]
]);

// Sample device data with locations and details - these will be populated dynamically
const DEVICE_REGISTRY = new Map();

// Helper function to create or update device in registry
function registerDevice(deviceId, heartbeatData = {}) {
  if (!DEVICE_REGISTRY.has(deviceId)) {
    // Create new device entry
    DEVICE_REGISTRY.set(deviceId, {
      id: deviceId,
      name: heartbeatData.name || `Gate Controller ${deviceId.slice(-3)}`,
      location: heartbeatData.location || `Location ${deviceId.slice(-3)}`,
      type: heartbeatData.deviceType || 'Smart Gate',
      coordinates: { lat: 32.0853 + Math.random() * 0.001, lng: 34.7818 + Math.random() * 0.001 },
      status: 'online'
    });
    
    console.log(`📝 New device registered: ${deviceId}`);
  } else {
    // Update existing device status
    const device = DEVICE_REGISTRY.get(deviceId);
    device.status = 'online';
    if (heartbeatData.name) device.name = heartbeatData.name;
    if (heartbeatData.location) device.location = heartbeatData.location;
    if (heartbeatData.deviceType) device.type = heartbeatData.deviceType;
  }
}

// Store device logs
const deviceLogs = new Map();
const deviceSchedules = new Map();
const systemAlerts = [];

// Store active sessions
const activeSessions = new Map();

function generateSessionToken() {
  return 'session_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function validateSession(sessionToken) {
  return activeSessions.has(sessionToken);
}

function getUserAuthorizedDevices(username) {
  const user = DASHBOARD_USERS.get(username);
  if (!user) return [];
  
  if (user.authorizedDevices.includes('*')) {
    // Admin gets access to all discovered devices
    return Array.from(DEVICE_REGISTRY.keys());
  }
  
  // For specific device lists, filter by what actually exists and what user is authorized for
  const existingAuthorizedDevices = user.authorizedDevices.filter(deviceId => DEVICE_REGISTRY.has(deviceId));
  
  // If no specific devices are authorized but user has role-based access, give access to all discovered devices
  if (existingAuthorizedDevices.length === 0 && user.role === 'manager') {
    return Array.from(DEVICE_REGISTRY.keys());
  }
  
  // Operators with no specific authorization get access to all devices too (for demo purposes)
  if (existingAuthorizedDevices.length === 0 && user.role === 'operator') {
    return Array.from(DEVICE_REGISTRY.keys());
  }
  
  return existingAuthorizedDevices;
}

function addDeviceLog(deviceId, action, user, details = '') {
  if (!deviceLogs.has(deviceId)) {
    deviceLogs.set(deviceId, []);
  }
  
  const logs = deviceLogs.get(deviceId);
  logs.unshift({
    timestamp: new Date().toISOString(),
    action,
    user,
    details,
    id: Date.now() + Math.random()
  });
  
  // Keep only last 100 logs per device
  if (logs.length > 100) {
    logs.splice(100);
  }
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

  function requireAuth(callback) {
    const sessionToken = getSessionFromCookie(req.headers.cookie);
    if (sessionToken && validateSession(sessionToken)) {
      const session = activeSessions.get(sessionToken);
      callback(session);
    } else {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Authentication required' }));
    }
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
          loginTime: new Date().toISOString(),
          authorizedDevices: user.authorizedDevices,
          buttonMasks: user.buttonMasks
        });
        
        addDeviceLog('system', 'login', username, 'User logged in successfully');
        
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Set-Cookie': `session=${sessionToken}; HttpOnly; Path=/; Max-Age=86400`
        });
        res.end(JSON.stringify({
          success: true,
          message: 'Login successful',
          user: {
            name: user.name,
            role: user.role
          }
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
      const session = activeSessions.get(sessionToken);
      addDeviceLog('system', 'logout', session.username, 'User logged out');
      activeSessions.delete(sessionToken);
    }
    
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': 'session=; HttpOnly; Path=/; Max-Age=0'
    });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // Get authorized devices for user
  if (req.url === '/api/user/devices' && req.method === 'GET') {
    requireAuth((session) => {
      const authorizedDevices = getUserAuthorizedDevices(session.username);
      const deviceList = authorizedDevices.map(deviceId => {
        const deviceInfo = DEVICE_REGISTRY.get(deviceId);
        const deviceStatus = connectedDevices.get(deviceId);
        
        return {
          ...deviceInfo,
          status: deviceStatus ? 'online' : 'offline',
          lastHeartbeat: deviceStatus ? deviceStatus.lastHeartbeat : null,
          signalStrength: deviceStatus ? deviceStatus.signalStrength : 0,
          batteryLevel: deviceStatus ? deviceStatus.batteryLevel : 0
        };
      });
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        devices: deviceList,
        buttonMasks: session.buttonMasks
      }));
    });
    return;
  }

  // Send command to device
  if (req.url === '/api/device/command' && req.method === 'POST') {
    requireAuth((session) => {
      readBody((data) => {
        const { deviceId, command } = data;
        const authorizedDevices = getUserAuthorizedDevices(session.username);
        
        if (!authorizedDevices.includes(deviceId)) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Access denied to this device' }));
          return;
        }
        
        if (!session.buttonMasks[command]) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Command not permitted for your role' }));
          return;
        }
        
        // Add command to device queue
        if (!deviceCommands.has(deviceId)) {
          deviceCommands.set(deviceId, []);
        }
        
        deviceCommands.get(deviceId).push({
          command,
          timestamp: new Date().toISOString(),
          user: session.username
        });
        
        addDeviceLog(deviceId, command, session.username, `Command executed: ${command}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: `Command ${command} sent to device ${deviceId}`
        }));
      });
    });
    return;
  }

  // Get device logs
  if (req.url.startsWith('/api/device/') && req.url.endsWith('/logs') && req.method === 'GET') {
    requireAuth((session) => {
      const deviceId = req.url.split('/')[3];
      const authorizedDevices = getUserAuthorizedDevices(session.username);
      
      if (!authorizedDevices.includes(deviceId)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Access denied to this device' }));
        return;
      }
      
      const logs = deviceLogs.get(deviceId) || [];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, logs }));
    });
    return;
  }

  // Get device schedules
  if (req.url.startsWith('/api/device/') && req.url.endsWith('/schedules') && req.method === 'GET') {
    requireAuth((session) => {
      const deviceId = req.url.split('/')[3];
      const authorizedDevices = getUserAuthorizedDevices(session.username);
      
      if (!authorizedDevices.includes(deviceId)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Access denied to this device' }));
        return;
      }
      
      const schedules = deviceSchedules.get(deviceId) || [];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, schedules }));
    });
    return;
  }

  // Admin endpoints (admin role only)
  if (req.url === '/api/admin/users' && req.method === 'GET') {
    requireAuth((session) => {
      if (session.role !== 'admin') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Admin access required' }));
        return;
      }
      
      const users = Array.from(DASHBOARD_USERS.entries()).map(([username, user]) => ({
        username,
        name: user.name,
        role: user.role,
        authorizedDevices: user.authorizedDevices,
        buttonMasks: user.buttonMasks
      }));
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, users }));
    });
    return;
  }

  if (req.url === '/api/admin/fleet' && req.method === 'GET') {
    requireAuth((session) => {
      if (session.role !== 'admin') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Admin access required' }));
        return;
      }
      
      const fleet = Array.from(DEVICE_REGISTRY.entries()).map(([deviceId, device]) => {
        const status = connectedDevices.get(deviceId);
        return {
          ...device,
          isOnline: !!status,
          lastHeartbeat: status ? status.lastHeartbeat : null,
          signalStrength: status ? status.signalStrength : 0,
          batteryLevel: status ? status.batteryLevel : 0,
          uptime: status ? status.uptime : 0
        };
      });
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        fleet,
        stats: {
          total: fleet.length,
          online: fleet.filter(d => d.isOnline).length,
          offline: fleet.filter(d => !d.isOnline).length
        }
      }));
    });
    return;
  }

  // Main dashboard (serves the SPA)
  if ((req.url === '/dashboard' || req.url === '/') && req.method === 'GET') {
    const sessionToken = getSessionFromCookie(req.headers.cookie);
    
    if (sessionToken && validateSession(sessionToken)) {
      // Serve the main application
      const session = activeSessions.get(sessionToken);
      const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Gate Controller Dashboard</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fa; }
        
        .app-container { min-height: 100vh; display: flex; flex-direction: column; }
        
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; padding: 1rem 2rem; display: flex; 
            justify-content: space-between; align-items: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header h1 { font-size: 1.5rem; margin: 0; }
        .user-info { display: flex; align-items: center; gap: 1rem; }
        .user-badge { 
            background: rgba(255,255,255,0.2); padding: 0.5rem 1rem; 
            border-radius: 20px; font-size: 0.9rem;
        }
        .logout-btn { 
            background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3);
            color: white; padding: 0.5rem 1rem; border-radius: 20px; cursor: pointer;
            transition: all 0.3s ease;
        }
        .logout-btn:hover { background: rgba(255,255,255,0.3); }
        
        .main-content { flex: 1; padding: 2rem; max-width: 1200px; margin: 0 auto; width: 100%; }
        
        .screen { display: none; }
        .screen.active { display: block; }
        
        .devices-grid { 
            display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); 
            gap: 1.5rem; margin-top: 2rem;
        }
        
        .device-card { 
            background: white; border-radius: 12px; padding: 1.5rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: all 0.3s ease;
            border-left: 4px solid #ddd;
        }
        .device-card.online { border-left-color: #28a745; }
        .device-card.offline { border-left-color: #dc3545; }
        .device-card:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(0,0,0,0.15); }
        
        .device-header { display: flex; justify-content: between; align-items: flex-start; margin-bottom: 1rem; }
        .device-info h3 { margin: 0 0 0.25rem 0; color: #333; }
        .device-info p { color: #666; font-size: 0.9rem; margin: 0.25rem 0; }
        
        .device-status { 
            display: flex; align-items: center; gap: 0.5rem; margin: 1rem 0;
            padding: 0.5rem; background: #f8f9fa; border-radius: 6px;
        }
        .status-dot { 
            width: 8px; height: 8px; border-radius: 50%; 
            background: #dc3545; animation: pulse 2s infinite;
        }
        .status-dot.online { background: #28a745; }
        
        .device-controls { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); 
            gap: 0.5rem; margin: 1rem 0;
        }
        .control-btn { 
            padding: 0.75rem; border: none; border-radius: 6px; 
            font-weight: 500; cursor: pointer; transition: all 0.3s ease;
        }
        .control-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-open { background: #28a745; color: white; }
        .btn-close { background: #dc3545; color: white; }
        .btn-stop { background: #ffc107; color: black; }
        .btn-partial { background: #6f42c1; color: white; }
        .btn-lock { background: #fd7e14; color: white; }
        .btn-unlock { background: #20c997; color: white; }
        
        .settings-btn { 
            background: #6c757d; color: white; padding: 0.5rem 1rem;
            border: none; border-radius: 6px; cursor: pointer; margin-top: 1rem;
            display: flex; align-items: center; gap: 0.5rem;
        }
        
        .device-settings-screen .nav-tabs {
            display: flex; background: white; border-radius: 8px 8px 0 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 0;
        }
        .nav-tab {
            flex: 1; padding: 1rem; text-align: center; cursor: pointer;
            border-bottom: 3px solid transparent; transition: all 0.3s ease;
            background: #f8f9fa; color: #666;
        }
        .nav-tab.active { background: white; color: #333; border-bottom-color: #667eea; }
        .nav-tab:first-child { border-radius: 8px 0 0 0; }
        .nav-tab:last-child { border-radius: 0 8px 0 0; }
        
        .tab-content {
            background: white; padding: 2rem; border-radius: 0 0 8px 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .back-btn {
            background: #6c757d; color: white; border: none; padding: 0.5rem 1rem;
            border-radius: 6px; cursor: pointer; margin-bottom: 1rem;
        }
        
        .status-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem; margin: 1rem 0;
        }
        .status-item {
            background: #f8f9fa; padding: 1rem; border-radius: 6px;
            text-align: center;
        }
        .status-item h4 { margin: 0 0 0.5rem 0; color: #333; }
        .status-item p { margin: 0; color: #666; font-size: 0.9rem; }
        
        .log-item {
            padding: 1rem; border-bottom: 1px solid #eee; display: flex;
            justify-content: space-between; align-items: center;
        }
        .log-item:last-child { border-bottom: none; }
        
        .alert { 
            padding: 1rem; border-radius: 6px; margin: 1rem 0;
            border-left: 4px solid;
        }
        .alert-warning { background: #fff3cd; color: #856404; border-left-color: #ffc107; }
        .alert-info { background: #d1ecf1; color: #0c5460; border-left-color: #17a2b8; }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        @media (max-width: 768px) {
            .main-content { padding: 1rem; }
            .devices-grid { grid-template-columns: 1fr; }
            .header { padding: 1rem; }
            .header h1 { font-size: 1.2rem; }
        }
    </style>
</head>
<body>
    <div class="app-container">
        <header class="header">
            <h1>🚪 Gate Controller Dashboard</h1>
            <div class="user-info">
                <div class="user-badge">
                    <strong>${session.name}</strong> (${session.role})
                </div>
                <button class="logout-btn" onclick="logout()">Logout</button>
            </div>
        </header>
        
        <main class="main-content">
            <!-- Controllers List Screen -->
            <div id="controllers-screen" class="screen active">
                <h2>Your Authorized Controllers</h2>
                <div style="margin-bottom: 1rem;">
                    <button onclick="createTestDevice()" style="background: #17a2b8; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
                        Create Test Device
                    </button>
                    <button onclick="showDebugInfo()" style="background: #6c757d; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; margin-left: 0.5rem;">
                        Show Debug Info
                    </button>
                </div>
                <div id="devices-container" class="devices-grid">
                    <div class="alert alert-info">Loading your authorized devices...</div>
                </div>
            </div>
            
            <!-- Device Settings Screen -->
            <div id="device-settings-screen" class="screen">
                <button class="back-btn" onclick="showScreen('controllers-screen')">← Back to Controllers</button>
                <h2 id="device-settings-title">Device Settings</h2>
                
                <nav class="nav-tabs">
                    <div class="nav-tab active" onclick="switchTab('status')">Device Status</div>
                    <div class="nav-tab" onclick="switchTab('users')">Users</div>
                    <div class="nav-tab" onclick="switchTab('schedules')">Schedules</div>
                    <div class="nav-tab" onclick="switchTab('logs')">Logs</div>
                    <div class="nav-tab admin-only" onclick="switchTab('admin')">Admin</div>
                </nav>
                
                <div class="tab-content">
                    <div id="status-tab" class="tab-pane active">
                        <h3>Device I/O Parameters</h3>
                        <div id="device-status-content" class="status-grid">
                            <!-- Device status will be loaded here -->
                        </div>
                    </div>
                    
                    <div id="users-tab" class="tab-pane" style="display: none;">
                        <h3>Authorized Users</h3>
                        <div id="users-content">
                            <!-- Users management will be loaded here -->
                        </div>
                    </div>
                    
                    <div id="schedules-tab" class="tab-pane" style="display: none;">
                        <h3>Scheduled Operations</h3>
                        <div id="schedules-content">
                            <!-- Schedules will be loaded here -->
                        </div>
                    </div>
                    
                    <div id="logs-tab" class="tab-pane" style="display: none;">
                        <h3>Activity Logs</h3>
                        <div id="logs-content">
                            <!-- Logs will be loaded here -->
                        </div>
                    </div>
                    
                    <div id="admin-tab" class="tab-pane" style="display: none;">
                        <h3>Administration</h3>
                        <div id="admin-content">
                            <!-- Admin features will be loaded here -->
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <script>
        const USER_ROLE = '${session.role}';
        let devices = [];
        let buttonMasks = {};
        let currentDeviceId = null;
        
        // Hide admin tab if user is not admin
        if (USER_ROLE !== 'admin') {
            document.querySelector('.admin-only').style.display = 'none';
        }
        
        async function loadDevices() {
            try {
                console.log('Loading devices...');
                const response = await fetch('/api/user/devices');
                console.log('Response status:', response.status);
                
                const data = await response.json();
                console.log('Response data:', data);
                
                if (data.success) {
                    devices = data.devices;
                    buttonMasks = data.buttonMasks;
                    console.log('Devices loaded:', devices.length, 'devices');
                    renderDevices();
                } else {
                    console.error('API returned error:', data.message);
                    document.getElementById('devices-container').innerHTML = 
                        '<div class="alert alert-warning">Error loading devices: ' + (data.message || 'Unknown error') + '</div>';
                }
            } catch (error) {
                console.error('Failed to load devices:', error);
                document.getElementById('devices-container').innerHTML = 
                    '<div class="alert alert-warning">Failed to connect to server. Please try refreshing the page.</div>';
            }
        }
        
        function renderDevices() {
            const container = document.getElementById('devices-container');
            
            if (devices.length === 0) {
                container.innerHTML = '<div class="alert alert-warning">No devices authorized for your account.</div>';
                return;
            }
            
            let html = '';
            devices.forEach(device => {
                html += '<div class="device-card ' + device.status + '">';
                html += '<div class="device-header">';
                html += '<div class="device-info">';
                html += '<h3>' + device.name + '</h3>';
                html += '<p><strong>ID:</strong> ' + device.id + '</p>';
                html += '<p><strong>Location:</strong> ' + device.location + '</p>';
                html += '<p><strong>Type:</strong> ' + device.type + '</p>';
                html += '</div></div>';
                
                html += '<div class="device-status">';
                html += '<div class="status-dot ' + device.status + '"></div>';
                html += '<span><strong>Status:</strong> ' + device.status.toUpperCase() + '</span>';
                if (device.status === 'online') {
                    html += '<span style="margin-left: auto;">Signal: ' + device.signalStrength + '% | Battery: ' + device.batteryLevel + '%</span>';
                }
                html += '</div>';
                
                html += '<div class="device-controls">';
                Object.entries(buttonMasks).forEach(([action, enabled]) => {
                    if (enabled) {
                        html += '<button class="control-btn btn-' + action + '" ';
                        html += 'onclick="sendCommand(\'' + device.id + '\', \'' + action + '\')" ';
                        if (device.status === 'offline') {
                            html += 'disabled ';
                        }
                        html += '>' + action.toUpperCase() + '</button>';
                    }
                });
                html += '</div>';
                
                html += '<button class="settings-btn" onclick="openDeviceSettings(\'' + device.id + '\')">';
                html += '⚙️ Settings</button>';
                html += '</div>';
            });
            
            container.innerHTML = html;
        }
        
        async function sendCommand(deviceId, command) {
            try {
                const response = await fetch('/api/device/command', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ deviceId, command })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('Command ' + command + ' sent successfully to ' + deviceId);
                    loadDevices(); // Refresh device list
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (error) {
                alert('Failed to send command');
                console.error(error);
            }
        }
        
        function openDeviceSettings(deviceId) {
            currentDeviceId = deviceId;
            const device = devices.find(d => d.id === deviceId);
            document.getElementById('device-settings-title').textContent = 'Settings - ' + device.name;
            showScreen('device-settings-screen');
            loadDeviceStatus(deviceId);
        }
        
        function showScreen(screenId) {
            document.querySelectorAll('.screen').forEach(screen => {
                screen.classList.remove('active');
            });
            document.getElementById(screenId).classList.add('active');
        }
        
        function switchTab(tabName) {
            // Update tab navigation
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            event.target.classList.add('active');
            
            // Update tab content
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.style.display = 'none';
            });
            document.getElementById(tabName + '-tab').style.display = 'block';
            
            // Load tab-specific content
            switch(tabName) {
                case 'status':
                    loadDeviceStatus(currentDeviceId);
                    break;
                case 'users':
                    loadDeviceUsers(currentDeviceId);
                    break;
                case 'schedules':
                    loadDeviceSchedules(currentDeviceId);
                    break;
                case 'logs':
                    loadDeviceLogs(currentDeviceId);
                    break;
                case 'admin':
                    if (USER_ROLE === 'admin') {
                        loadAdminContent();
                    }
                    break;
            }
        }
        
        async function loadDeviceStatus(deviceId) {
            const device = devices.find(d => d.id === deviceId);
            const statusContent = document.getElementById('device-status-content');
            
            let html = '';
            html += '<div class="status-item"><h4>Connection Status</h4>';
            html += '<p class="' + (device.status === 'online' ? 'text-success' : 'text-danger') + '">';
            html += device.status.toUpperCase() + '</p></div>';
            
            html += '<div class="status-item"><h4>Signal Strength</h4>';
            html += '<p>' + (device.signalStrength || 0) + '%</p></div>';
            
            html += '<div class="status-item"><h4>Battery Level</h4>';
            html += '<p>' + (device.batteryLevel || 0) + '%</p></div>';
            
            html += '<div class="status-item"><h4>Last Heartbeat</h4>';
            html += '<p>' + (device.lastHeartbeat ? new Date(device.lastHeartbeat).toLocaleString() : 'Never') + '</p></div>';
            
            html += '<div class="status-item"><h4>Device Type</h4>';
            html += '<p>' + device.type + '</p></div>';
            
            html += '<div class="status-item"><h4>Location</h4>';
            html += '<p>' + device.location + '</p></div>';
            
            statusContent.innerHTML = html;
        }
        
        async function loadDeviceUsers(deviceId) {
            const usersContent = document.getElementById('users-content');
            
            // Get users who have access to this device
            const authorizedUsers = [];
            
            // This would typically come from an API call
            const mockUsers = [
                { username: 'admin', name: 'Administrator', role: 'admin', hasAccess: true },
                { username: 'manager', name: 'Gate Manager', role: 'manager', hasAccess: true },
                { username: 'operator', name: 'Gate Operator', role: 'operator', hasAccess: deviceId !== 'device_003' }
            ];
            
            let html = '<div class="alert alert-info">Users authorized for this device:</div>';
            mockUsers.filter(user => user.hasAccess).forEach(user => {
                html += '<div class="log-item">';
                html += '<div><strong>' + user.name + '</strong> (' + user.username + ')';
                html += '<br><small>Role: ' + user.role + '</small></div>';
                html += '<div class="user-badge" style="background: #e9ecef; padding: 0.25rem 0.5rem; border-radius: 12px;">';
                html += user.role + '</div></div>';
            });
            
            usersContent.innerHTML = html;
        }
        
        async function loadDeviceSchedules(deviceId) {
            try {
                const response = await fetch('/api/device/' + deviceId + '/schedules');
                const data = await response.json();
                const schedulesContent = document.getElementById('schedules-content');
                
                if (data.success && data.schedules.length > 0) {
                    let html = '';
                    data.schedules.forEach(schedule => {
                        html += '<div class="log-item">';
                        html += '<div><strong>' + schedule.name + '</strong>';
                        html += '<br><small>' + schedule.description + '</small></div>';
                        html += '<div><small>' + schedule.time + ' - ' + schedule.days + '</small></div>';
                        html += '</div>';
                    });
                    schedulesContent.innerHTML = html;
                } else {
                    schedulesContent.innerHTML = '<div class="alert alert-info">No schedules configured for this device.</div>';
                }
            } catch (error) {
                document.getElementById('schedules-content').innerHTML = 
                    '<div class="alert alert-warning">Failed to load schedules.</div>';
            }
        }
        
        async function loadDeviceLogs(deviceId) {
            try {
                const response = await fetch('/api/device/' + deviceId + '/logs');
                const data = await response.json();
                const logsContent = document.getElementById('logs-content');
                
                if (data.success && data.logs.length > 0) {
                    let html = '<div style="max-height: 400px; overflow-y: auto;">';
                    data.logs.forEach(log => {
                        html += '<div class="log-item">';
                        html += '<div><strong>' + log.action + '</strong> by ' + log.user;
                        if (log.details) {
                            html += '<br><small>' + log.details + '</small>';
                        }
                        html += '</div>';
                        html += '<div><small>' + new Date(log.timestamp).toLocaleString() + '</small></div>';
                        html += '</div>';
                    });
                    html += '</div>';
                    logsContent.innerHTML = html;
                } else {
                    logsContent.innerHTML = '<div class="alert alert-info">No activity logs available for this device.</div>';
                }
            } catch (error) {
                document.getElementById('logs-content').innerHTML = 
                    '<div class="alert alert-warning">Failed to load activity logs.</div>';
            }
        }
        
        async function loadAdminContent() {
            if (USER_ROLE !== 'admin') {
                document.getElementById('admin-content').innerHTML = 
                    '<div class="alert alert-warning">Admin access required.</div>';
                return;
            }
            
            try {
                const [usersResponse, fleetResponse] = await Promise.all([
                    fetch('/api/admin/users'),
                    fetch('/api/admin/fleet')
                ]);
                
                const usersData = await usersResponse.json();
                const fleetData = await fleetResponse.json();
                
                const adminContent = document.getElementById('admin-content');
                
                let html = '<div class="status-grid">';
                html += '<div class="status-item"><h4>Total Devices</h4><p>' + fleetData.stats.total + '</p></div>';
                html += '<div class="status-item"><h4>Online Devices</h4><p style="color: #28a745;">' + fleetData.stats.online + '</p></div>';
                html += '<div class="status-item"><h4>Offline Devices</h4><p style="color: #dc3545;">' + fleetData.stats.offline + '</p></div>';
                html += '<div class="status-item"><h4>Total Users</h4><p>' + usersData.users.length + '</p></div>';
                html += '</div>';
                
                html += '<h4 style="margin-top: 2rem;">Fleet Management</h4>';
                html += '<div style="background: #f8f9fa; padding: 1rem; border-radius: 6px; margin: 1rem 0;">';
                fleetData.fleet.forEach(device => {
                    html += '<div class="log-item">';
                    html += '<div><strong>' + device.name + '</strong> (' + device.id + ')';
                    html += '<br><small>' + device.location + '</small></div>';
                    html += '<div><span class="status-dot ' + (device.isOnline ? 'online' : 'offline') + '" style="display: inline-block; margin-right: 0.5rem;"></span>';
                    html += (device.isOnline ? 'Online' : 'Offline');
                    if (device.isOnline) {
                        html += '<br><small>Signal: ' + device.signalStrength + '%</small>';
                    }
                    html += '</div></div>';
                });
                html += '</div>';
                
                html += '<h4 style="margin-top: 2rem;">User Management</h4>';
                html += '<div style="background: #f8f9fa; padding: 1rem; border-radius: 6px; margin: 1rem 0;">';
                usersData.users.forEach(user => {
                    html += '<div class="log-item">';
                    html += '<div><strong>' + user.name + '</strong> (' + user.username + ')';
                    html += '<br><small>Role: ' + user.role + '</small>';
                    html += '<br><small>Devices: ' + (user.authorizedDevices.includes('*') ? 'All' : user.authorizedDevices.length) + '</small></div>';
                    
                    let badgeColor = user.role === 'admin' ? '#dc3545' : user.role === 'manager' ? '#ffc107' : '#28a745';
                    let textColor = user.role === 'manager' ? 'black' : 'white';
                    html += '<div class="user-badge" style="background: ' + badgeColor + '; color: ' + textColor + '; padding: 0.25rem 0.5rem; border-radius: 12px;">';
                    html += user.role.toUpperCase() + '</div>';
                    html += '</div>';
                });
                html += '</div>';
                
                adminContent.innerHTML = html;
            } catch (error) {
                document.getElementById('admin-content').innerHTML = 
                    '<div class="alert alert-warning">Failed to load admin data.</div>';
            }
        }
        
        async function logout() {
            try {
                await fetch('/dashboard/logout', { method: 'POST' });
                window.location.href = '/dashboard';
            } catch (error) {
                window.location.href = '/dashboard';
            }
        }
        
        async function createTestDevice() {
            try {
                const response = await fetch('/api/debug/create-test-device', { method: 'POST' });
                const data = await response.json();
                
                if (data.success) {
                    alert('Test device created: ' + data.deviceId);
                    loadDevices(); // Refresh the device list
                } else {
                    alert('Failed to create test device');
                }
            } catch (error) {
                alert('Error creating test device: ' + error.message);
            }
        }
        
        async function showDebugInfo() {
            try {
                const response = await fetch('/api/debug/status');
                const data = await response.json();
                
                console.log('Debug Info:', data);
                
                let info = 'Debug Information:\n\n';
                info += 'Connected Devices: ' + data.connectedDevices.length + '\n';
                info += 'Registered Devices: ' + data.deviceRegistry.length + '\n';
                info += 'Active Sessions: ' + data.activeSessions + '\n';
                info += 'Available Users: ' + data.users.join(', ') + '\n\n';
                
                if (data.deviceRegistry.length > 0) {
                    info += 'Registered Devices:\n';
                    data.deviceRegistry.forEach(([id, device]) => {
                        info += '- ' + id + ': ' + device.name + ' (' + device.status + ')\n';
                    });
                } else {
                    info += 'No devices registered yet.\n';
                }
                
                alert(info);
            } catch (error) {
                alert('Error getting debug info: ' + error.message);
            }
        }
        loadDevices();
        
        // Auto-refresh devices every 30 seconds
        setInterval(loadDevices, 30000);
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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0; padding: 0; min-height: 100vh;
            display: flex; align-items: center; justify-content: center;
        }
        .login-container { 
            background: white; padding: 3rem; border-radius: 20px; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.3); max-width: 420px; width: 90%;
            position: relative; overflow: hidden;
        }
        .login-container::before {
            content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .login-header { text-align: center; margin-bottom: 2rem; }
        .login-header h1 { margin: 0 0 0.5rem 0; font-size: 2.5em; color: #667eea; font-weight: 600; }
        .login-header p { margin: 0; color: #666; font-size: 1.1rem; }
        .form-group { margin-bottom: 1.5rem; }
        label { display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333; }
        input { 
            width: 100%; padding: 1rem; border: 2px solid #e9ecef; border-radius: 10px; 
            font-size: 1rem; box-sizing: border-box; transition: all 0.3s ease;
            font-family: inherit;
        }
        input:focus { 
            outline: none; border-color: #667eea; 
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        button { 
            width: 100%; padding: 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; border: none; border-radius: 10px; font-size: 1.1rem; 
            font-weight: 600; cursor: pointer; margin-bottom: 1rem; 
            transition: all 0.3s ease; font-family: inherit;
        }
        button:hover { 
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }
        button:active { transform: translateY(0); }
        .error { 
            color: #dc3545; text-align: center; font-weight: 600; 
            margin-top: 1rem; padding: 0.75rem; background: #f8d7da;
            border-radius: 8px; border: 1px solid #f5c6cb;
        }
        .demo-info { 
            background: #f8f9fa; padding: 1.5rem; border-radius: 12px; 
            margin-top: 1.5rem; font-size: 0.95rem; border: 1px solid #e9ecef;
        }
        .demo-info h4 { 
            margin: 0 0 1rem 0; color: #495057; font-size: 1rem;
        }
        .credential-item {
            display: flex; justify-content: space-between; align-items: center;
            padding: 0.5rem 0; border-bottom: 1px solid #dee2e6;
        }
        .credential-item:last-child { border-bottom: none; }
        .credential-item code {
            background: #e9ecef; padding: 0.2rem 0.5rem; border-radius: 4px;
            font-family: 'Monaco', 'Consolas', monospace; font-size: 0.85rem;
        }
        .role-badge {
            font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 10px;
            font-weight: 600; text-transform: uppercase;
        }
        .role-admin { background: #dc3545; color: white; }
        .role-manager { background: #ffc107; color: black; }
        .role-operator { background: #28a745; color: white; }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-header">
            <h1>🚪</h1>
            <h1>Gate Controller</h1>
            <p>Secure Access Dashboard</p>
        </div>
        
        <form id="loginForm">
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" placeholder="Enter your username" required>
            </div>
            
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" placeholder="Enter your password" required>
            </div>
            
            <button type="submit">Sign In</button>
            <div id="error" class="error" style="display: none;"></div>
        </form>
        
        <div class="demo-info">
            <h4>💡 Demo Credentials</h4>
            <div class="credential-item">
                <div>
                    <code>admin</code> / <code>admin123</code>
                </div>
                <span class="role-badge role-admin">Admin</span>
            </div>
            <div class="credential-item">
                <div>
                    <code>manager</code> / <code>gate2024</code>
                </div>
                <span class="role-badge role-manager">Manager</span>
            </div>
            <div class="credential-item">
                <div>
                    <code>operator</code> / <code>gate123</code>
                </div>
                <span class="role-badge role-operator">Operator</span>
            </div>
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
                    errorDiv.textContent = data.message;
                    errorDiv.style.display = 'block';
                    
                    // Hide error after 5 seconds
                    setTimeout(() => {
                        errorDiv.style.display = 'none';
                    }, 5000);
                }
            } catch (error) {
                errorDiv.textContent = 'Connection error. Please try again.';
                errorDiv.style.display = 'block';
            }
        });
        
        // Auto-fill demo credentials on click
        document.querySelectorAll('.credential-item').forEach(item => {
            item.addEventListener('click', () => {
                const codes = item.querySelectorAll('code');
                if (codes.length >= 2) {
                    document.getElementById('username').value = codes[0].textContent;
                    document.getElementById('password').value = codes[1].textContent;
                }
            });
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
      
      // Update device registry status
      if (DEVICE_REGISTRY.has(deviceId)) {
        DEVICE_REGISTRY.get(deviceId).status = 'online';
      }
      
      addDeviceLog(deviceId, 'heartbeat', 'system', `Device heartbeat received`);
      
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
      const deviceId = data.deviceId || 'unknown';
      const deviceType = data.deviceType || 'Smart Gate';
      const firmwareVersion = data.firmwareVersion || '1.0.0';
      
      console.log(`🔐 Authenticating device: ${deviceId} (${deviceType}) v${firmwareVersion}`);
      
      // Register device on authentication
      registerDevice(deviceId, {
        name: data.name,
        location: data.location,
        deviceType: deviceType
      });
      
      addDeviceLog(deviceId, 'auth', 'system', `Device authentication: ${deviceType} v${firmwareVersion}`);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        token: "device_token_" + deviceId + "_" + Date.now(),
        message: "Device authenticated",
        deviceId: deviceId
      }));
    });
    return;
  }

  // Legacy ESP32 command endpoints for backward compatibility
  if (req.url.includes('/send-command') && req.method === 'POST') {
    requireAuth((session) => {
      const urlParts = req.url.split('/');
      const deviceId = urlParts[3];
      
      console.log(`🎮 Legacy command sent to ESP32 device: ${deviceId} by ${session.username}`);
      
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
        
        addDeviceLog(deviceId, command.action, session.username, `Legacy command: ${command.action} relay ${command.relay}`);
        
        console.log(`📝 Legacy command queued for device ${deviceId}:`, command);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
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

  // Legacy user registration endpoint
  if (req.url.includes('/register-user') && req.method === 'POST') {
    requireAuth((session) => {
      const urlParts = req.url.split('/');
      const deviceId = urlParts[3];
      
      console.log(`👤 Legacy user registration for device: ${deviceId} by ${session.username}`);
      
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
        
        addDeviceLog(deviceId, 'register_user', session.username, `User registered: ${data.name} (${data.phone})`);
        
        console.log(`📝 Legacy registration queued for device ${deviceId}:`, registrationCommand);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
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
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Enhanced Gate Controller Server',
      timestamp: new Date().toISOString(),
      devices: connectedDevices.size,
      sessions: activeSessions.size,
      registeredDevices: DEVICE_REGISTRY.size,
      users: DASHBOARD_USERS.size
    }));
    return;
  }

  // Default response
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    message: 'Enhanced Gate Controller Server',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/dashboard - Main dashboard',
      '/api/user/devices - Get authorized devices',
      '/api/device/command - Send device command',
      '/api/device/{id}/logs - Get device logs',
      '/api/device/{id}/schedules - Get device schedules',
      '/api/admin/users - Admin: Get all users',
      '/api/admin/fleet - Admin: Get fleet status',
      '/health - Health check'
    ]
  }));
});

server.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
  console.log(`🚀 Enhanced Gate Controller Server started on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`❤️ Health: http://localhost:${PORT}/health`);
});

// Cleanup routine
setInterval(() => {
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  
  // Clean up offline devices
  for (const [deviceId, info] of connectedDevices.entries()) {
    if (new Date(info.lastHeartbeat).getTime() < fiveMinutesAgo) {
      console.log(`🗑️ Device ${deviceId} went offline (timeout)`);
      connectedDevices.delete(deviceId);
      deviceCommands.delete(deviceId);
      
      // Update registry status
      if (DEVICE_REGISTRY.has(deviceId)) {
        DEVICE_REGISTRY.get(deviceId).status = 'offline';
      }
      
      addDeviceLog(deviceId, 'disconnect', 'system', 'Device went offline (timeout)');
    }
  }
  
  // Clean up expired sessions (24+ hours old)
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  for (const [token, session] of activeSessions.entries()) {
    if (new Date(session.loginTime).getTime() < oneDayAgo) {
      activeSessions.delete(token);
      addDeviceLog('system', 'session_expired', session.username, 'Session expired after 24 hours');
    }
  }
  
  console.log(`🧹 Cleanup: ${connectedDevices.size} devices online, ${activeSessions.size} active sessions, ${DEVICE_REGISTRY.size} total registered devices`);
}, 30000); // Run every 30 seconds
