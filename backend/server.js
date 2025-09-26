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
        
        /* Manufacturing form */
        .manufacturing-form {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            max-width: 600px;
        }
        .manufacturing-form input, .manufacturing-form select {
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        .manufacturing-form .full-width {
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
        
        /* Modal Styles */
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
        }
        .modal-content {
            background-color: white;
            margin: 2% auto;
            padding: 0;
            border-radius: 8px;
            width: 90%;
            max-width: 900px;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .modal-header {
            background: #667eea;
            color: white;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .modal-header h2 { margin: 0; }
        .close-btn {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .modal-tabs {
            display: flex;
            background: #f8f9fa;
            border-bottom: 1px solid #ddd;
        }
        .tab-btn {
            flex: 1;
            padding: 15px;
            border: none;
            background: none;
            cursor: pointer;
            font-weight: bold;
            border-bottom: 3px solid transparent;
        }
        .tab-btn.active {
            border-bottom-color: #667eea;
            background: white;
            color: #667eea;
        }
        .modal-body {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        
        /* Gate status grid */
        .gate-status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
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
        .status-value { color: #666; font-size: 18px; }
        
        /* Settings form */
        .settings-form {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            font-weight: bold;
            margin-bottom: 5px;
            color: #333;
        }
        .form-group input, .form-group select {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        .form-group .help-text {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
        }
        
        /* Button styles */
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            text-decoration: none;
            display: inline-block;
            text-align: center;
        }
        .btn-primary { background: #007bff; color: white; }
        .btn-success { background: #28a745; color: white; }
        .btn-warning { background: #ffc107; color: black; }
        .btn-danger { background: #dc3545; color: white; }
        .btn-secondary { background: #6c757d; color: white; }
        
        /* Super admin indicator */
        .super-admin-indicator {
            background: linear-gradient(45deg, #ff6b35, #f7931e);
            color: white;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: bold;
            margin-left: 10px;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .device { flex-direction: column; align-items: flex-start; gap: 10px; }
            .device-actions { width: 100%; justify-content: space-between; }
            .modal-content { width: 95%; margin: 5% auto; }
            .top-nav { flex-wrap: wrap; }
            .manufacturing-form { grid-template-columns: 1fr; }
            .settings-form { grid-template-columns: 1fr; }
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
            <button class="logout" onclick="logout()">Logout</button>
        </div>
        
        <!-- Top Navigation -->
        <div class="top-nav">
            <button class="nav-btn active" onclick="showScreen('home')">Home</button>
            <button class="nav-btn" onclick="showScreen('system')">System</button>
            <button class="nav-btn" onclick="showScreen('devices')">Devices</button>
            <button class="nav-btn" onclick="showScreen('manufacturing')" id="manufacturingBtn">Manufacturing DB</button>
        </div>
        
        <!-- HOME SCREEN -->
        <div id="homeScreen" class="screen-section active">
            <div id="devices">
                <!-- Demo devices will be rendered here -->
            </div>
        </div>
        
        <!-- SYSTEM SCREEN -->
        <div id="systemScreen" class="screen-section">
            <div class="card">
                <h3>Server Status</h3>
                <div class="gate-status-grid">
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
                <div class="gate-status-grid">
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
                    <button class="btn btn-primary" onclick="syncFirebase()">🔄 Sync All Users to Firebase</button>
                    <button class="btn btn-secondary" onclick="checkFirebaseStatus()">🔍 Check Firebase Status</button>
                    <button class="btn btn-warning" onclick="resetFirebaseConnection()">⚡ Reset Connection</button>
                </div>
            </div>
        </div>
        
        <!-- DEVICES SCREEN -->
        <div id="devicesScreen" class="screen-section">
            <div class="card">
                <h3>Device Activation</h3>
                <p>Test the device activation endpoint or scan QR code:</p>
                <div style="display: grid; grid-template-columns: 1fr 100px 1fr auto; gap: 10px; margin: 15px 0;">
                    <input type="text" id="deviceSerial" placeholder="ESP32_12345" style="padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                    <input type="text" id="devicePin" placeholder="123456" maxlength="6" style="padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                    <input type="text" id="userPhone" placeholder="972501234567" style="padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                    <button class="btn btn-primary" onclick="testActivation()">Activate</button>
                </div>
                <div style="margin-top: 10px;">
                    <button class="btn btn-secondary" onclick="startQRScanner()">📷 Scan QR Code</button>
                </div>
                <p><strong>Demo Values:</strong> Serial: ESP32_12345, PIN: 123456, Phone: 972501234567</p>
                <p><small>Phone format: 10-14 digits (US: 1234567890, International: 972501234567)</small></p>
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
                    <tbody id="deviceManagementTable">
                        <tr>
                            <td>ESP32_12345</td>
                            <td><span style="color: #28a745;">🟢 Online</span></td>
                            <td>2 minutes ago</td>
                            <td>3</td>
                            <td>v2.1.3</td>
                            <td>
                                <button class="btn btn-secondary btn-sm" onclick="openSettings('ESP32_12345')">⚙️</button>
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
                                <button class="btn btn-secondary btn-sm" onclick="openSettings('ESP32_67890')">⚙️</button>
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
                <div class="manufacturing-form">
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
                    <button class="btn btn-secondary" onclick="loadManufacturingDevices()">🔄 Refresh</button>
                    <button class="btn btn-warning" onclick="exportManufacturingData()">📊 Export CSV</button>
                    <input type="file" id="csvImport" accept=".csv" style="display: none;" onchange="importManufacturingData()">
                    <button class="btn btn-primary" onclick="document.getElementById('csvImport').click()">📁 Import CSV</button>
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
                    <tbody id="manufacturingTable">
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

    <!-- Enhanced Settings Modal -->
    <div id="settingsModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="modalTitle">Device Settings</h2>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            
            <div class="modal-tabs">
                <button class="tab-btn active" onclick="switchTab('users')">👥 Users</button>
                <button class="tab-btn" onclick="switchTab('gate')">🚪 Gate</button>
                <button class="tab-btn" onclick="switchTab('settings')">⚙️ Settings</button>
                <button class="tab-btn" onclick="switchTab('status')">📊 Status</button>
                <button class="tab-btn" onclick="switchTab('logs')">📝 Logs</button>
                <button class="tab-btn" onclick="switchTab('schedules')">⏰ Schedules</button>
            </div>
            
            <div class="modal-body">
                <!-- Users Tab -->
                <div id="users-tab" class="tab-content active">
                    <h3>➕ Add New User</h3>
                    <div style="display: grid; gap: 15px; max-width: 500px;">
                        <input type="email" id="modalEmail" placeholder="Email Address" required>
                        <input type="tel" id="modalPhone" placeholder="Phone Number (10-14 digits)" maxlength="14" required>
                        <input type="text" id="modalName" placeholder="User Name" required>
                        <input type="password" id="modalPassword" placeholder="Password (if login allowed)" minlength="6">
                        <select id="modalUserLevel">
                            <option value="0">👤 Basic User</option>
                            <option value="1">👔 Manager</option>
                            <option value="2">🔐 Admin</option>
                        </select>
                        <button class="btn btn-success" onclick="registerUserModal()">➕ Register User</button>
                    </div>
                    
                    <div style="margin-top: 30px;">
                        <h3>👥 Registered Users</h3>
                        <div id="usersList">
                            <p>Loading users...</p>
                        </div>
                    </div>
                </div>
                
                <!-- Gate Tab -->
                <div id="gate-tab" class="tab-content">
                    <h3>🚪 Gate Status & Control</h3>
                    
                    <div class="gate-status-grid">
                        <div class="status-item">
                            <div class="status-label">Gate Position</div>
                            <div class="status-value">🔓 OPEN</div>
                        </div>
                        <div class="status-item">
                            <div class="status-label">FCC Status</div>
                            <div class="status-value">✅ CLEAR</div>
                        </div>
                        <div class="status-item">
                            <div class="status-label">FCA Status</div>
                            <div class="status-value">✅ CLEAR</div>
                        </div>
                        <div class="status-item">
                            <div class="status-label">Last Command</div>
                            <div class="status-value">OPEN (2 min ago)</div>
                        </div>
                        <div class="status-item">
                            <div class="status-label">Operation Mode</div>
                            <div class="status-value">🤖 AUTO</div>
                        </div>
                        <div class="status-item">
                            <div class="status-label">Loop Status</div>
                            <div class="status-value">📡 ACTIVE</div>
                        </div>
                        <div class="status-item danger">
                            <div class="status-label">Emergency Lock</div>
                            <div class="status-value">🔴 DISABLED</div>
                        </div>
                        <div class="status-item">
                            <div class="status-label">Auto Close</div>
                            <div class="status-value">✅ 15 seconds</div>
                        </div>
                    </div>
                    
                    <h4>Gate Control</h4>
                    <div style="display: flex; gap: 10px; margin: 20px 0;">
                        <button class="btn btn-success" onclick="sendGateCommand('open')">🔓 OPEN</button>
                        <button class="btn btn-warning" onclick="sendGateCommand('stop')">⏸️ STOP</button>
                        <button class="btn btn-danger" onclick="sendGateCommand('close')">🔒 CLOSE</button>
                        <button class="btn btn-secondary" onclick="sendGateCommand('partial')">↗️ PARTIAL</button>
                    </div>
                    
                    <h4>Emergency Controls</h4>
                    <div style="display: flex; gap: 10px; margin: 20px 0;">
                        <button class="btn btn-danger" onclick="emergencyLock()">🚨 EMERGENCY LOCK</button>
                        <button class="btn btn-warning" onclick="toggleManualMode()">🔧 MANUAL MODE</button>
                        <button class="btn btn-secondary" onclick="resetGate()">🔄 RESET GATE</button>
                    </div>
                    
                    <h4>Auto Close Settings</h4>
                    <div style="display: grid; grid-template-columns: 1fr auto auto; gap: 10px; align-items: center; max-width: 400px;">
                        <label>Enable Auto Close:</label>
                        <input type="checkbox" id="autoCloseEnabled" checked>
                        <span></span>
                        <label>Delay Time (seconds):</label>
                        <input type="number" id="autoCloseDelay" value="15" min="5" max="300" style="width: 80px;">
                        <button class="btn btn-primary btn-sm" onclick="updateAutoClose()">Save</button>
                    </div>
                </div>
                
                <!-- Settings Tab -->
                <div id="settings-tab" class="tab-content">
                    <h3>⚙️ Technical Settings</h3>
                    <p style="color: #dc3545; font-weight: bold;">⚠️ Admin Only - Changes require device restart</p>
                    
                    <div class="settings-form">
                        <div class="form-group">
                            <label>Loop Detection Mode</label>
                            <select id="loopDetectionMode">
                                <option value="standard">Standard Detection</option>
                                <option value="sensitive">High Sensitivity</option>
                                <option value="low">Low Sensitivity</option>
                                <option value="disabled">Disabled</option>
                            </select>
                            <div class="help-text">Vehicle detection sensitivity level</div>
                        </div>
                        
                        <div class="form-group">
                            <label>Gate Open Timer (ms)</label>
                            <input type="number" id="openTimer" value="2000" min="1000" max="10000">
                            <div class="help-text">Maximum time for gate to fully open</div>
                        </div>
                        
                        <div class="form-group">
                            <label>Gate Close Timer (ms)</label>
                            <input type="number" id="closeTimer" value="2000" min="1000" max="10000">
                            <div class="help-text">Maximum time for gate to fully close</div>
                        </div>
                        
                        <div class="form-group">
                            <label>Safety Reverse Timer (ms)</label>
                            <input type="number" id="safetyTimer" value="500" min="100" max="2000">
                            <div class="help-text">Delay before reversing on obstruction</div>
                        </div>
                        
                        <div class="form-group">
                            <label>FCC Debounce (ms)</label>
                            <input type="number" id="fccDebounce" value="100" min="50" max="500">
                            <div class="help-text">False Close Contact debounce time</div>
                        </div>
                        
                        <div class="form-group">
                            <label>FCA Debounce (ms)</label>
                            <input type="number" id="fcaDebounce" value="100" min="50" max="500">
                            <div class="help-text">False Open Contact debounce time</div>
                        </div>
                        
                        <div class="form-group">
                            <label>WiFi Timeout (s)</label>
                            <input type="number" id="wifiTimeout" value="30" min="10" max="120">
                            <div class="help-text">WiFi connection timeout period</div>
                        </div>
                        
                        <div class="form-group">
                            <label>Heartbeat Interval (s)</label>
                            <input type="number" id="heartbeatInterval" value="30" min="10" max="300">
                            <div class="help-text">Server heartbeat frequency</div>
                        </div>
                        
                        <div class="form-group">
                            <label>Command Timeout (ms)</label>
                            <input type="number" id="commandTimeout" value="5000" min="1000" max="30000">
                            <div class="help-text">Maximum time to wait for command response</div>
                        </div>
                        
                        <div class="form-group">
                            <label>Debug Level</label>
                            <select id="debugLevel">
                                <option value="0">None</option>
                                <option value="1">Error Only</option>
                                <option value="2">Warning + Error</option>
                                <option value="3">Info + Warning + Error</option>
                                <option value="4">Debug (All)</option>
                            </select>
                            <div class="help-text">Serial console debug output level</div>
                        </div>
                        
                        <div class="form-group">
                            <label>Device Name</label>
                            <input type="text" id="deviceName" placeholder="Main Gate Controller">
                            <div class="help-text">Friendly name for this device</div>
                        </div>
                        
                        <div class="form-group">
                            <label>Location</label>
                            <input type="text" id="deviceLocation" placeholder="Building A Entrance">
                            <div class="help-text">Physical location description</div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 30px; padding: 20px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
                        <h4 style="color: #856404; margin: 0 0 10px 0;">⚠️ Advanced Settings</h4>
                        <p style="color: #856404; margin: 0;">Changes to these settings will be applied immediately but may require device restart for full effect. Make sure you understand the implications before modifying these values.</p>
                    </div>
                    
                    <div style="margin-top: 20px; display: flex; gap: 10px;">
                        <button class="btn btn-success" onclick="saveDeviceSettings()">💾 Save Settings</button>
                        <button class="btn btn-secondary" onclick="resetToDefaults()">🔄 Reset to Defaults</button>
                        <button class="btn btn-warning" onclick="restartDevice()">⚡ Restart Device</button>
                    </div>
                </div>
                
                <!-- Status Tab -->
                <div id="status-tab" class="tab-content">
                    <h3>📊 Device Status</h3>
                    <div class="gate-status-grid">
                        <div class="status-item">
                            <div class="status-label">Connection Status</div>
                            <div class="status-value">🟢 Online</div>
                        </div>
                        <div class="status-item">
                            <div class="status-label">Signal Strength</div>
                            <div class="status-value">-45 dBm</div>
                        </div>
                        <div class="status-item">
                            <div class="status-label">Battery Level</div>
                            <div class="status-value">85%</div>
                        </div>
                        <div class="status-item">
                            <div class="status-label">Uptime</div>
                            <div class="status-value">2d 14h 32m</div>
                        </div>
                        <div class="status-item">
                            <div class="status-label">Free Memory</div>
                            <div class="status-value">245,760 bytes</div>
                        </div>
                        <div class="status-item">
                            <div class="status-label">Last Heartbeat</div>
                            <div class="status-value">30 seconds ago</div>
                        </div>
                        <div class="status-item">
                            <div class="status-label">Firmware Version</div>
                            <div class="status-value">v2.1.3</div>
                        </div>
                        <div class="status-item">
                            <div class="status-label">Connection Type</div>
                            <div class="status-value">WiFi</div>
                        </div>
                        <div class="status-item">
                            <div class="status-label">Temperature</div>
                            <div class="status-value">42°C</div>
                        </div>
                        <div class="status-item">
                            <div class="status-label">Commands Processed</div>
                            <div class="status-value">1,247</div>
                        </div>
                        <div class="status-item">
                            <div class="status-label">Errors Count</div>
                            <div class="status-value">3</div>
                        </div>
                        <div class="status-item">
                            <div class="status-label">Firebase Mode</div>
                            <div class="status-value">🔥 Synced</div>
                        </div>
                    </div>
                </div>
                
                <!-- Logs Tab -->
                <div id="logs-tab" class="tab-content">
                    <h3>📝 Device Logs</h3>
                    <div style="margin-bottom: 20px;">
                        <button class="btn btn-secondary" onclick="refreshLogs()">🔄 Refresh</button>
                        <button class="btn btn-primary" onclick="exportLogs()">📊 Export</button>
                        <button class="btn btn-warning" onclick="clearLogs()">🗑️ Clear Logs</button>
                        <select id="logFilter" onchange="filterLogs()" style="margin-left: 10px; padding: 8px;">
                            <option value="all">All Logs</option>
                            <option value="command">Commands</option>
                            <option value="user">User Activity</option>
                            <option value="system">System Events</option>
                            <option value="error">Errors Only</option>
                        </select>
                    </div>
                    
                    <div id="deviceLogs">
                        <div class="log-item">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                <span style="font-weight: bold; color: #333;">📝 RELAY ACTIVATE</span>
                                <span style="font-size: 12px; color: #666;">2024-01-20 14:30:25</span>
                            </div>
                            <div style="font-size: 12px; color: #666;">
                                👤 User: +972501234567 | Relay: 1 (OPEN) | Duration: 2000ms | Method: Dashboard
                            </div>
                        </div>
                        
                        <div class="log-item">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                <span style="font-weight: bold; color: #333;">👤 USER REGISTERED</span>
                                <span style="font-size: 12px; color: #666;">2024-01-20 12:15:10</span>
                            </div>
                            <div style="font-size: 12px; color: #666;">
                                👤 User: John Doe (+972509876543) | Added by: admin@gatecontroller.com | Role: User
                            </div>
                        </div>
                        
                        <div class="log-item">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                <span style="font-weight: bold; color: #333;">💓 HEARTBEAT</span>
                                <span style="font-size: 12px; color: #666;">2024-01-20 14:29:55</span>
                            </div>
                            <div style="font-size: 12px; color: #666;">
                                👤 User: system | Signal: -45dBm, Battery: 85%, Memory: 245760 bytes
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Schedules Tab -->
                <div id="schedules-tab" class="tab-content">
                    <h3>⏰ Device Schedules</h3>
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <h4>⏰ Advanced Scheduling System</h4>
                        <p>This feature will include:</p>
                        <ul style="text-align: left; max-width: 400px; margin: 0 auto;">
                            <li>📅 Gate-level schedules (facility-wide)</li>
                            <li>👥 Group-based schedules (roles/departments)</li>
                            <li>👤 Individual user schedules</li>
                            <li>🌍 Multi-timezone support</li>
                            <li>📆 Calendar system selection (Sunday/Monday start)</li>
                            <li>🎯 Holiday management</li>
                            <li>⚡ Emergency override capabilities</li>
                        </ul>
                        <p><strong>Coming in Phase 3 implementation!</strong></p>
                        <button class="btn btn-primary" disabled>🚀 Configure Schedules</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let currentDeviceId = null;
        let currentUserLevel = 2; // Demo: Super Admin level
        
        // Demo data
        const demoDevices = [
            {
                id: 'ESP32_12345',
                name: 'Main Gate Controller',
                online: true,
                lastHeartbeat: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
                signalStrength: -45,
                batteryLevel: 85,
                uptime: 150000, // seconds
                firmwareVersion: 'v2.1.3',
                userCount: 3
            },
            {
                id: 'ESP32_67890',
                name: 'Secondary Gate',
                online: false,
                lastHeartbeat: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
                signalStrength: -67,
                batteryLevel: 45,
                uptime: 89000,
                firmwareVersion: 'v2.1.2',
                userCount: 1
            }
        ];
        
        function showScreen(screenName) {
            // Hide all screens
            document.querySelectorAll('.screen-section').forEach(screen => {
                screen.classList.remove('active');
            });
            
            // Remove active from all nav buttons
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Show selected screen
            document.getElementById(screenName + 'Screen').classList.add('active');
            event.target.classList.add('active');
            
            // Hide Manufacturing DB button for non-super-admins
            if (currentUserLevel < 3) {
                document.getElementById('manufacturingBtn').style.display = 'none';
            }
        }
        
        function renderDevices() {
            const container = document.getElementById('devices');
            
            if (demoDevices.length === 0) {
                container.innerHTML = '<div class="card"><p>📭 No devices connected yet. Waiting for ESP32 heartbeat...</p></div>';
                return;
            }
            
            container.innerHTML = demoDevices.map(device => {
                const isOnline = device.online;
                
                return `
                    <div class="card device ${isOnline ? '' : 'offline'}">
                        <div class="device-info">
                            <h3>🎛️ ${device.name} ${isOnline ? '🟢' : '🔴'}</h3>
                            <div class="device-status">
                                📶 Signal: ${device.signalStrength}dBm | 
                                🔋 Battery: ${device.batteryLevel}% | 
                                ⏱️ Uptime: ${Math.floor(device.uptime / 1000)}s |
                                👥 Users: ${device.userCount}<br>
                                🔄 Last Heartbeat: ${device.lastHeartbeat.toLocaleTimeString()}
                            </div>
                        </div>
                        
                        <div class="device-actions">
                            <button class="control-btn open" onclick="sendCommand('${device.id}', 1, 'OPEN')">🔓 OPEN</button>
                            <button class="control-btn stop" onclick="sendCommand('${device.id}', 2, 'STOP')">⏸️ STOP</button>
                            <button class="control-btn close" onclick="sendCommand('${device.id}', 3, 'CLOSE')">🔒 CLOSE</button>
                            <button class="control-btn partial" onclick="sendCommand('${device.id}', 4, 'PARTIAL')">↗️ PARTIAL</button>
                            <button class="settings-btn" onclick="openSettings('${device.id}')" title="Device Settings">⚙️</button>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        function sendCommand(deviceId, relay, action) {
            const userId = prompt("Enter your registered phone number (10-14 digits, numbers only):");
            if (!userId) return;
            
            const cleanUserId = userId.replace(/\D/g, '');
            
            if (!/^\d{10,14}$/.test(cleanUserId)) {
                alert('Please enter a valid phone number (10-14 digits, numbers only)');
                return;
            }
            
            if (!confirm(`Send ${action} command with user ID: ${cleanUserId}?`)) {
                return;
            }
            
            // Simulate command sending
            alert(`✅ Command sent: ${action} to ${deviceId}`);
        }
        
        function openSettings(deviceId) {
            currentDeviceId = deviceId;
            const device = demoDevices.find(d => d.id === deviceId);
            document.getElementById('modalTitle').textContent = `⚙️ ${device.name} Settings`;
            document.getElementById('settingsModal').style.display = 'block';
            
            // Switch to users tab and load data
            switchTab('users');
            loadUsers();
        }
        
        function closeModal() {
            document.getElementById('settingsModal').style.display = 'none';
            currentDeviceId = null;
        }
        
        function switchTab(tabName) {
            // Remove active class from all tabs
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Add active class to selected tab
            event.target.classList.add('active');
            document.getElementById(tabName + '-tab').classList.add('active');
            
            // Load data based on tab
            switch(tabName) {
                case 'users':
                    loadUsers();
                    break;
                case 'gate':
                    loadGateStatus();
                    break;
                case 'settings':
                    loadDeviceSettings();
                    break;
                case 'status':
                    loadStatus();
                    break;
                case 'logs':
                    loadLogs();
                    break;
                case 'schedules':
                    loadSchedules();
                    break;
            }
        }
        
        function loadUsers() {
            // Demo user data
            document.getElementById('usersList').innerHTML = `
                <div style="padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px; background: #f8f9fa; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: bold; color: #333;">John Doe 🌐</div>
                        <div style="font-size: 12px; color: #666;">
                            📧 john@example.com | 📱 +972501234567 | 🔐 Admin | 🌐 Can Login<br>
                            Permissions: 🔓 OPEN, ⏸️ STOP, 🔒 CLOSE, ↗️ PARTIAL |
                            Registered: ${new Date().toLocaleDateString()}
                        </div>
                    </div>
                    <button onclick="deleteUser('+972501234567', 'john@example.com', 'John Doe')" 
                            style="background: #dc3545; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        🗑️ Delete
                    </button>
                </div>
            `;
        }
        
        function loadGateStatus() {
            // Gate status is already loaded in the HTML
            console.log('Gate status loaded for device:', currentDeviceId);
        }
        
        function loadDeviceSettings() {
            // Load current device settings
            if (!currentDeviceId) return;
            
            // Populate form with current values (demo data)
            document.getElementById('loopDetectionMode').value = 'standard';
            document.getElementById('openTimer').value = '2000';
            document.getElementById('closeTimer').value = '2000';
            document.getElementById('safetyTimer').value = '500';
            document.getElementById('deviceName').value = 'Main Gate Controller';
            document.getElementById('deviceLocation').value = 'Building A Entrance';
        }
        
        function loadStatus() {
            console.log('Status loaded for device:', currentDeviceId);
        }
        
        function loadLogs() {
            console.log('Logs loaded for device:', currentDeviceId);
        }
        
        function loadSchedules() {
            console.log('Schedules loaded for device:', currentDeviceId);
        }
        
        // Gate control functions
        function sendGateCommand(action) {
            alert(`🚪 Gate command sent: ${action.toUpperCase()}`);
        }
        
        function emergencyLock() {
            if (confirm('⚠️ Activate Emergency Lock?\n\nThis will immediately lock the gate and disable all user access until manually cleared.')) {
                alert('🚨 Emergency Lock Activated!');
            }
        }
        
        function toggleManualMode() {
            alert('🔧 Gate switched to Manual Mode');
        }
        
        function resetGate() {
            if (confirm('🔄 Reset gate controller?\n\nThis will restart the gate controller and may cause temporary disconnection.')) {
                alert('🔄 Gate controller reset initiated');
            }
        }
        
        function updateAutoClose() {
            const enabled = document.getElementById('autoCloseEnabled').checked;
            const delay = document.getElementById('autoCloseDelay').value;
            alert(`💾 Auto Close Settings Updated:\nEnabled: ${enabled}\nDelay: ${delay} seconds`);
        }
        
        // Settings functions
        function saveDeviceSettings() {
            if (confirm('💾 Save device settings?\n\nSome changes may require device restart to take effect.')) {
                alert('✅ Settings saved successfully!');
            }
        }
        
        function resetToDefaults() {
            if (confirm('🔄 Reset all settings to factory defaults?\n\nThis action cannot be undone.')) {
                alert('🔄 Settings reset to defaults');
                loadDeviceSettings(); // Reload default values
            }
        }
        
        function restartDevice() {
            if (confirm('⚡ Restart device?\n\nThe device will be offline for approximately 30 seconds.')) {
                alert('⚡ Device restart initiated');
            }
        }
        
        // Manufacturing functions
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
            
            alert(`✅ Device Added to Manufacturing DB:\nSerial: ${serial}\nPIN: ${pin}\nModel: ${model}\nVersion: ${swVersion}`);
            
            // Clear form
            document.getElementById('mfgSerial').value = '';
            document.getElementById('mfgPin').value = '';
            document.getElementById('mfgSwVersion').value = '';
            document.getElementById('mfgNotes').value = '';
        }
        
        function loadManufacturingDevices() {
            alert('🔄 Manufacturing database refreshed');
        }
        
        function exportManufacturingData() {
            alert('📊 Manufacturing data exported to CSV');
        }
        
        function importManufacturingData() {
            alert('📁 CSV import feature will be implemented');
        }
        
        function deleteManufacturingDevice(serial) {
            if (confirm(`🗑️ Delete device ${serial} from manufacturing database?\n\nThis action cannot be undone.`)) {
                alert(`✅ Device ${serial} deleted from manufacturing database`);
            }
        }
        
        // System functions
        function syncFirebase() {
            if (confirm('🔥 Sync all local users to Firebase?')) {
                alert('✅ Firebase sync completed successfully!');
            }
        }
        
        function checkFirebaseStatus() {
            alert('🔥 Firebase Status: Connected\n\nProject: gate-controller-prod\nLast Sync: 2 minutes ago');
        }
        
        function resetFirebaseConnection() {
            if (confirm('⚡ Reset Firebase connection?\n\nThis may cause temporary sync interruption.')) {
                alert('⚡ Firebase connection reset');
            }
        }
        
        // Device management functions
        function testActivation() {
            const serial = document.getElementById('deviceSerial').value || 'ESP32_12345';
            const pin = document.getElementById('devicePin').value || '123456';
            const phone = document.getElementById('userPhone').value || '972501234567';
            
            alert(`✅ Device activated successfully!\nSerial: ${serial}\nUser: ${phone}`);
        }
        
        function startQRScanner() {
            alert('📷 QR Scanner would open camera here\n\nImplementation requires camera API access');
        }
        
        function factoryReset(deviceId) {
            if (confirm(`🔄 Factory reset ${deviceId}?\n\nThis will:\n• Remove all users\n• Reset all settings\n• Require re-activation\n\nThis action cannot be undone!`)) {
                alert(`🔄 Factory reset initiated for ${deviceId}`);
            }
        }
        
        function registerUserModal() {
            const email = document.getElementById('modalEmail').value;
            const phone = document.getElementById('modalPhone').value;
            const name = document.getElementById('modalName').value;
            
            if (!email || !phone || !name) {
                alert('Please fill in email, phone, and name fields');
                return;
            }
            
            alert(`✅ User registered: ${name} (${email})\nPhone: ${phone}`);
            
            // Clear form
            document.getElementById('modalEmail').value = '';
            document.getElementById('modalPhone').value = '';
            document.getElementById('modalName').value = '';
            document.getElementById('modalPassword').value = '';
            
            loadUsers();
        }
        
        function deleteUser(phone, email, name) {
            if (confirm(`🗑️ Delete User: ${name}?\n\nThis will remove user from device and Firebase.\n\nThis action cannot be undone!`)) {
                alert(`✅ User Deleted: ${name}`);
                loadUsers();
            }
        }
        
        function logout() {
            if (confirm('🚪 Logout from dashboard?')) {
                alert('👋 Logged out successfully');
            }
        }
        
        // Initialize
        renderDevices();
        
        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('settingsModal');
            if (event.target === modal) {
                closeModal();
            }
        }
    </script>
</body>
</html>
