<!DOCTYPE html>
<html>
<head>
    <title>Gate Controller Dashboard</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; 
            margin: 0; 
            background: #f5f5f5; 
            font-size: 14px;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { 
            background: white; 
            padding: 20px; 
            margin-bottom: 20px; 
            border-radius: 8px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
        }
        .user-info { color: #666; }
        .logout { background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
        
        /* Top Navigation */
        .top-nav {
            background: white;
            padding: 10px 20px;
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            display: flex;
            gap: 10px;
        }
        .nav-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            background: #f8f9fa;
            color: #333;
            transition: all 0.3s;
        }
        .nav-btn.active {
            background: #667eea;
            color: white;
        }
        .nav-btn:hover {
            background: #5a6fd8;
            color: white;
        }
        
        .card { 
            background: white; 
            padding: 20px; 
            margin-bottom: 20px; 
            border-radius: 8px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
        }
        .device { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            border-left: 4px solid #28a745; 
            padding: 15px 20px;
        }
        .device.offline { border-left-color: #dc3545; }
        .device-info h3 { margin: 0 0 5px 0; color: #333; }
        .device-status { font-size: 12px; color: #666; }
        .device-actions { display: flex; gap: 10px; align-items: center; }
        .control-btn { 
            padding: 8px 15px; 
            border: none; 
            border-radius: 4px; 
            cursor: pointer; 
            font-weight: bold; 
            font-size: 12px;
        }
        .open { background: #28a745; color: white; }
        .stop { background: #ffc107; color: black; }
        .close { background: #dc3545; color: white; }
        .partial { background: #6f42c1; color: white; }
        .settings-btn { 
            background: #6c757d; 
            color: white; 
            padding: 8px 12px; 
            border: none; 
            border-radius: 4px; 
            cursor: pointer; 
            font-size: 18px;
        }
        .settings-btn:hover { background: #5a6268; }
        h1 { color: #333; margin: 0; }
        
        /* Screen sections */
        .screen-section {
            display: none;
        }
        .screen-section.active {
            display: block;
        }
        
        /* Status grid */
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }
        .status-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #28a745;
        }
        .status-item.warning { border-left-color: #ffc107; }
        .status-item.danger { border-left-color: #dc3545; }
        .status-label { font-weight: bold; color: #333; margin-bottom: 5px; }
        .status-value { color: #666; font-size: 16px; }
        
        /* Manufacturing form */
        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            max-width: 600px;
        }
        .form-grid input, .form-grid select, .form-grid textarea {
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        .form-grid .full-width {
            grid-column: span 2;
        }
        
        /* Device table */
        .device-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        .device-table th, .device-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .device-table th {
            background: #f8f9fa;
            font-weight: bold;
        }
        .device-table tr:hover {
            background: #f8f9fa;
        }
        
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            text-decoration: none;
            display: inline-block;
            text-align: center;
            margin: 5px;
        }
        .btn-primary { background: #007bff; color: white; }
        .btn-success { background: #28a745; color: white; }
        .btn-warning { background: #ffc107; color: black; }
        .btn-danger { background: #dc3545; color: white; }
        .btn-secondary { background: #6c757d; color: white; }
        .btn-sm { padding: 6px 12px; font-size: 12px; margin: 2px; }
        
        .super-admin-indicator {
            background: linear-gradient(45deg, #ff6b35, #f7931e);
            color: white;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: bold;
            margin-left: 10px;
        }
        
        @media (max-width: 768px) {
            .device { flex-direction: column; align-items: flex-start; gap: 10px; }
            .device-actions { width: 100%; justify-content: space-between; }
            .top-nav { flex-wrap: wrap; }
            .form-grid { grid-template-columns: 1fr; }
            .status-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div>
                <h1>Gate Controller Dashboard</h1>
                <div class="user-info">
                    Logged in as: <strong>Demo Admin</strong> (admin@gatecontroller.com)
                    <span class="super-admin-indicator">SUPER ADMIN</span>
                </div>
            </div>
            <button class="logout" onclick="alert('Logout functionality')">Logout</button>
        </div>
        
        <!-- Top Navigation -->
        <div class="top-nav">
            <button class="nav-btn active" onclick="showScreen('home', this)">Home</button>
            <button class="nav-btn" onclick="showScreen('system', this)">System</button>
            <button class="nav-btn" onclick="showScreen('devices', this)">Devices</button>
            <button class="nav-btn" onclick="showScreen('manufacturing', this)">Manufacturing DB</button>
        </div>
        
        <!-- HOME SCREEN -->
        <div id="homeScreen" class="screen-section active">
            <div class="card">
                <h3>Connected Devices</h3>
                <div class="device">
                    <div class="device-info">
                        <h3>Main Gate Controller 🟢</h3>
                        <div class="device-status">
                            📶 Signal: -45dBm | 🔋 Battery: 85% | ⏱️ Uptime: 150s | 👥 Users: 3<br>
                            🔄 Last Heartbeat: 2 minutes ago
                        </div>
                    </div>
                    <div class="device-actions">
                        <button class="control-btn open" onclick="sendCommand('ESP32_12345', 'OPEN')">🔓 OPEN</button>
                        <button class="control-btn stop" onclick="sendCommand('ESP32_12345', 'STOP')">⏸️ STOP</button>
                        <button class="control-btn close" onclick="sendCommand('ESP32_12345', 'CLOSE')">🔒 CLOSE</button>
                        <button class="control-btn partial" onclick="sendCommand('ESP32_12345', 'PARTIAL')">↗️ PARTIAL</button>
                        <button class="settings-btn" onclick="alert('Device settings for ESP32_12345')">⚙️</button>
                    </div>
                </div>
                
                <div class="device offline">
                    <div class="device-info">
                        <h3>Secondary Gate 🔴</h3>
                        <div class="device-status">
                            📶 Signal: -67dBm | 🔋 Battery: 45% | ⏱️ Uptime: 89s | 👥 Users: 1<br>
                            🔄 Last Heartbeat: 1 hour ago
                        </div>
                    </div>
                    <div class="device-actions">
                        <button class="control-btn open" onclick="sendCommand('ESP32_67890', 'OPEN')">🔓 OPEN</button>
                        <button class="control-btn stop" onclick="sendCommand('ESP32_67890', 'STOP')">⏸️ STOP</button>
                        <button class="control-btn close" onclick="sendCommand('ESP32_67890', 'CLOSE')">🔒 CLOSE</button>
                        <button class="control-btn partial" onclick="sendCommand('ESP32_67890', 'PARTIAL')">↗️ PARTIAL</button>
                        <button class="settings-btn" onclick="alert('Device settings for ESP32_67890')">⚙️</button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- SYSTEM SCREEN -->
        <div id="systemScreen" class="screen-section">
            <div class="card">
                <h3>Server Status</h3>
                <div class="status-grid">
                    <div class="status-item">
                        <div class="status-label">Server Status</div>
                        <div class="status-value">✅ Running</div>
                    </div>
                    <div class="status-item">
                        <div class="status-label">Server Port</div>
                        <div class="status-value">3001</div>
                    </div>
                    <div class="status-item">
                        <div class="status-label">Connected Devices</div>
                        <div class="status-value">2</div>
                    </div>
                    <div class="status-item">
                        <div class="status-label">Active Sessions</div>
                        <div class="status-value">1</div>
                    </div>
                    <div class="status-item">
                        <div class="status-label">Uptime</div>
                        <div class="status-value">2h 34m</div>
                    </div>
                    <div class="status-item">
                        <div class="status-label">Memory Usage</div>
                        <div class="status-value">145 MB</div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <h3>Firebase Status</h3>
                <div class="status-grid">
                    <div class="status-item">
                        <div class="status-label">Connection Status</div>
                        <div class="status-value">✅ Connected</div>
                    </div>
                    <div class="status-item">
                        <div class="status-label">Project ID</div>
                        <div class="status-value">gate-controller-prod</div>
                    </div>
                    <div class="status-item">
                        <div class="status-label">Authentication</div>
                        <div class="status-value">✅ Active</div>
                    </div>
                    <div class="status-item">
                        <div class="status-label">Firestore</div>
                        <div class="status-value">✅ Connected</div>
                    </div>
                    <div class="status-item">
                        <div class="status-label">Last Sync</div>
                        <div class="status-value">2 minutes ago</div>
                    </div>
                    <div class="status-item warning">
                        <div class="status-label">Rate Limits</div>
                        <div class="status-value">⚠️ 85% used</div>
                    </div>
                </div>
                
                <div style="margin-top: 20px;">
                    <button class="btn btn-primary" onclick="alert('🔄 Sync all users to Firebase')">🔄 Sync Firebase</button>
                    <button class="btn btn-secondary" onclick="alert('🔍 Firebase status checked')">🔍 Check Status</button>
                    <button class="btn btn-warning" onclick="alert('⚡ Firebase connection reset')">⚡ Reset Connection</button>
                </div>
            </div>
        </div>
        
        <!-- DEVICES SCREEN -->
        <div id="devicesScreen" class="screen-section">
            <div class="card">
                <h3>Device Activation</h3>
                <p>Test the device activation endpoint or scan QR code:</p>
                <div style="display: grid; grid-template-columns: 1fr 100px 1fr auto; gap: 10px; margin: 15px 0; max-width: 800px;">
                    <input type="text" id="deviceSerial" placeholder="ESP32_12345" style="padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                    <input type="text" id="devicePin" placeholder="123456" maxlength="6" style="padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                    <input type="text" id="userPhone" placeholder="972501234567" style="padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                    <button class="btn btn-primary" onclick="testActivation()">Activate</button>
                </div>
                <div style="margin-top: 10px;">
                    <button class="btn btn-secondary" onclick="alert('📷 QR Scanner would open here')">📷 Scan QR Code</button>
                </div>
                <p><strong>Demo Values:</strong> Serial: ESP32_12345, PIN: 123456, Phone: 972501234567</p>
            </div>
            
            <div class="card">
                <h3>Device Management</h3>
                <table class="device-table">
                    <thead>
                        <tr>
                            <th>Serial</th>
                            <th>Status</th>
                            <th>Last Seen</th>
                            <th>Users</th>
                            <th>Firmware</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>ESP32_12345</td>
                            <td><span style="color: #28a745;">🟢 Online</span></td>
                            <td>2 minutes ago</td>
                            <td>3</td>
                            <td>v2.1.3</td>
                            <td>
                                <button class="btn btn-secondary btn-sm" onclick="alert('Settings for ESP32_12345')">⚙️</button>
                                <button class="btn btn-danger btn-sm" onclick="factoryReset('ESP32_12345')">🔄</button>
                            </td>
                        </tr>
                        <tr>
                            <td>ESP32_67890</td>
                            <td><span style="color: #dc3545;">🔴 Offline</span></td>
                            <td>1 hour ago</td>
                            <td>1</td>
                            <td>v2.1.2</td>
                            <td>
                                <button class="btn btn-secondary btn-sm" onclick="alert('Settings for ESP32_67890')">⚙️</button>
                                <button class="btn btn-danger btn-sm" onclick="factoryReset('ESP32_67890')">🔄</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- MANUFACTURING DB SCREEN -->
        <div id="manufacturingScreen" class="screen-section">
            <div class="card">
                <h3>Add New Manufacturing Device</h3>
                <div class="form-grid">
                    <input type="text" id="mfgSerial" placeholder="Device Serial (ESP32_XXXXX)" required>
                    <input type="text" id="mfgPin" placeholder="6-Digit PIN" maxlength="6" required>
                    <select id="mfgModel">
                        <option value="GC-2024-S3">GC-2024-S3</option>
                        <option value="GC-2024-S3-CELLULAR">GC-2024-S3-CELLULAR</option>
                        <option value="GC-2024-C6">GC-2024-C6</option>
                    </select>
                    <input type="text" id="mfgSwVersion" placeholder="Software Version (2.1.3)" required>
                    <textarea id="mfgNotes" placeholder="Manufacturing Notes" class="full-width" rows="3"></textarea>
                    <button class="btn btn-success full-width" onclick="addManufacturingDevice()">➕ Add Device</button>
                </div>
            </div>
            
            <div class="card">
                <h3>Manufacturing Database</h3>
                <div style="margin-bottom: 20px;">
                    <button class="btn btn-secondary" onclick="alert('🔄 Database refreshed')">🔄 Refresh</button>
                    <button class="btn btn-warning" onclick="alert('📊 CSV exported')">📊 Export CSV</button>
                    <button class="btn btn-primary" onclick="alert('📁 CSV import')">📁 Import CSV</button>
                </div>
                
                <table class="device-table">
                    <thead>
                        <tr>
                            <th>Serial Number</th>
                            <th>PIN</th>
                            <th>Model</th>
                            <th>SW Version</th>
                            <th>Status</th>
                            <th>Manufacturing Date</th>
                            <th>Activation Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>ESP32_12345</td>
                            <td>123456</td>
                            <td>GC-2024-S3</td>
                            <td>2.1.3</td>
                            <td><span style="color: #28a745;">✅ Activated</span></td>
                            <td>2024-01-15</td>
                            <td>2024-01-20</td>
                            <td>
                                <button class="btn btn-danger btn-sm" onclick="deleteManufacturingDevice('ESP32_12345')">🗑️</button>
                            </td>
                        </tr>
                        <tr>
                            <td>ESP32_67890</td>
                            <td>789012</td>
                            <td>GC-2024-S3</td>
                            <td>2.1.3</td>
                            <td><span style="color: #6c757d;">⏳ Pending</span></td>
                            <td>2024-01-16</td>
                            <td>-</td>
                            <td>
                                <button class="btn btn-danger btn-sm" onclick="deleteManufacturingDevice('ESP32_67890')">🗑️</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        function showScreen(screenName, buttonElement) {
            // Hide all screens
            const screens = document.querySelectorAll('.screen-section');
            screens.forEach(screen => screen.classList.remove('active'));
            
            // Remove active from all nav buttons
            const buttons = document.querySelectorAll('.nav-btn');
            buttons.forEach(btn => btn.classList.remove('active'));
            
            // Show selected screen
            document.getElementById(screenName + 'Screen').classList.add('active');
            buttonElement.classList.add('active');
        }
        
        function sendCommand(deviceId, action) {
            const userId = prompt("Enter your registered phone number:");
            if (userId) {
                alert(`✅ ${action} command sent to ${deviceId} by user ${userId}`);
            }
        }
        
        function testActivation() {
            const serial = document.getElementById('deviceSerial').value || 'ESP32_12345';
            const pin = document.getElementById('devicePin').value || '123456';
            const phone = document.getElementById('userPhone').value || '972501234567';
            
            alert(`✅ Device activated successfully!\nSerial: ${serial}\nPIN: ${pin}\nUser: ${phone}`);
        }
        
        function factoryReset(deviceId) {
            if (confirm(`🔄 Factory reset ${deviceId}?\n\nThis action cannot be undone!`)) {
                alert(`🔄 Factory reset initiated for ${deviceId}`);
            }
        }
        
        function addManufacturingDevice() {
            const serial = document.getElementById('mfgSerial').value;
            const pin = document.getElementById('mfgPin').value;
            const model = document.getElementById('mfgModel').value;
            const swVersion = document.getElementById('mfgSwVersion').value;
            
            if (!serial || !pin || !swVersion) {
                alert('Please fill in all required fields');
                return;
            }
            
            if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
                alert('PIN must be exactly 6 digits');
                return;
            }
            
            alert(`✅ Device Added:\nSerial: ${serial}\nPIN: ${pin}\nModel: ${model}\nVersion: ${swVersion}`);
            
            // Clear form
            document.getElementById('mfgSerial').value = '';
            document.getElementById('mfgPin').value = '';
            document.getElementById('mfgSwVersion').value = '';
            document.getElementById('mfgNotes').value = '';
        }
        
        function deleteManufacturingDevice(serial) {
            if (confirm(`🗑️ Delete device ${serial}?\n\nThis action cannot be undone.`)) {
                alert(`✅ Device ${serial} deleted`);
            }
        }
    </script>
</body>
</html>
