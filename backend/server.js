<p><strong>Demo Values:</strong> Serial: ESP32_12345, PIN: 123456, Phone: 972501234567</p>
                <p><small>Phone format: 10-14 digits (US: 1234567890, International: 972501234567)</small></p>
            </div>
        </div>
        
        <!-- MANUFACTURING DB SCREEN -->
        <div id="manufacturingScreen" class="screen-section">
            <div class="card">
                <h3>➕ Add New Manufacturing Device</h3>
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
                    <button onclick="addManufacturingDevice()" style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;" class="full-width">➕ Add Device</button>
                </div>
            </div>
            
            <div class="card">
                <h3>🏭 Manufacturing Database</h3>
                <div style="margin-bottom: 20px;">
                    <button onclick="loadManufacturingDevices()" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-right: 10px;">🔄 Refresh</button>
                    <button onclick="alert('📊 CSV export feature')" style="background: #ffc107; color: black; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-right: 10px;">📊 Export CSV</button>
                    <button onclick="alert('📁 CSV import feature')" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">📁 Import CSV</button>
                </div>
                
                <div id="manufacturingTable">
                    <p>Manufacturing devices will be listed here...</p>
                </div>
            </div>
        </div>

        <!-- Settings Modal - EXISTING MODAL FROM YOUR CODE -->
        <div id="settingsModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="modalTitle">⚙️ Device Settings</h2>
                    <button class="close-btn" onclick="closeModal()">&times;</button>
                </div>
                
                <div class="modal-tabs">
                    <button class="tab-btn active" onclick="switchTab('users')">👥 Users</button>
                    <button class="tab-btn" onclick="switchTab('status')">📊 Status</button>
                    <button class="tab-btn" onclick="switchTab('logs')">📝 Logs</button>
                    <button class="tab-btn" onclick="switchTab('schedules')">⏰ Schedules</button>
                </div>
                
                <div class="modal-body">
                    <!-- Users Tab -->
                    <div id="users-tab" class="tab-content active">
                        <h3>➕ Add New User</h3>
                        <div class="form-grid-modal">
                            <input type="email" id="modalEmail" placeholder="Email Address" required>
                            <input type="tel" id="modalPhone" placeholder="Phone Number (10-14 digits)" maxlength="14" required>
                            <input type="text" id="modalName" placeholder="User Name" required>
                            <input type="password" id="modalPassword" placeholder="Password (if login allowed)" minlength="6">
                            <select id="modalUserLevel">
                                <option value="0">👤 Basic User</option>
                                <option value="1">👔 Manager</option>
                                <option value="2">🔐 Admin</option>
                            </select>
                            <div>
                                <label style="font-weight: bold; margin-bottom: 5px; display: block;">🔑 Permissions:</label>
                                <div class="checkbox-group">
                                    <label><input type="checkbox" id="modalRelay1" checked> 🔓 OPEN</label>
                                    <label><input type="checkbox" id="modalRelay2"> ⏸️ STOP</label>
                                    <label><input type="checkbox" id="modalRelay3"> 🔒 CLOSE</label>
                                    <label><input type="checkbox" id="modalRelay4"> ↗️ PARTIAL</label>
                                </div>
                            </div>
                            <div>
                                <label style="display: flex; align-items: center; gap: 5px; margin: 10px 0;">
                                    <input type="checkbox" id="modalCanLogin"> 🌐 Allow Dashboard Login
                                </label>
                                <small style="color: #666;">If checked, user can log in to this dashboard with email and password</small>
                            </div>
                            <small style="color: #17a2b8; font-weight: bold;">📱 Phone: Enter 10-14 digits (e.g., 1234567890, 972501234567, 447123456789)</small>
                            <button class="register-btn" onclick="registerUserModal()">
                                ➕ Register User
                            </button>
                        </div>
                        
                        <div class="users-list">
                            <h3>👥 Registered Users</h3>
                            <div id="usersList">
                                <p>Loading users...</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Status Tab -->
                    <div id="status-tab" class="tab-content">
                        <h3>📊 Device Status</h3>
                        <div id="deviceStatus">
                            <p>Loading status...</p>
                        </div>
                    </div>
                    
                    <!-- Logs Tab -->
                    <div id="logs-tab" class="tab-content">
                        <h3>📝 Device Logs</h3>
                        <div id="deviceLogs">
                            <p>Loading logs...</p>
                        </div>
                    </div>
                    
                    <!-- Schedules Tab -->
                    <div id="schedules-tab" class="tab-content">
                        <h3>⏰ Device Schedules</h3>
                        <div id="deviceSchedules">
                            <p>Schedules feature coming in Phase 3...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Global variables - keep existing data structure
        const devices = ${JSON.stringify(Array.from(connectedDevices.entries()))};
        const registeredUsers = ${JSON.stringify(Array.from(registeredUsers.entries()))};
        let currentDeviceId = null;
        
        // NEW NAVIGATION FUNCTION
        function showScreen(screenName, buttonElement) {
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
            if (buttonElement) {
                buttonElement.classList.add('active');
            }
        }
        
        // NEW MANUFACTURING FUNCTIONS
        async function addManufacturingDevice() {
            const serial = document.getElementById('mfgSerial').value;
            const pin = document.getElementById('mfgPin').value;
            const model = document.getElementById('mfgModel').value;
            const swVersion = document.getElementById('mfgSwVersion').value;
            const notes = document.getElementById('mfgNotes').value;
            
            if (!serial || !pin || !swVersion) {
                alert('Please fill in all required fields');
                return;
            }
            
            if (pin.length !== 6 || !/^\\d{6}$/.test(pin)) {
                alert('PIN must be exactly 6 digits');
                return;
            }
            
            try {
                const response = await fetch('/api/manufacturing/devices', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        serial: serial,
                        pin: pin,
                        model: model,
                        swVersion: swVersion,
                        notes: notes
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('✅ Device Added to Manufacturing DB:\\nSerial: ' + serial + '\\nPIN: ' + pin + '\\nModel: ' + model + '\\nVersion: ' + swVersion);
                    
                    // Clear form
                    document.getElementById('mfgSerial').value = '';
                    document.getElementById('mfgPin').value = '';
                    document.getElementById('mfgSwVersion').value = '';
                    document.getElementById('mfgNotes').value = '';
                } else {
                    alert('❌ Failed to add device: ' + result.error);
                }
            } catch (error) {
                alert('❌ Error: ' + error.message);
            }
        }
        
        function loadManufacturingDevices() {
            alert('🔄 Manufacturing database would be refreshed here');
        }
        
        // EXISTING FUNCTIONS - keep all your original functions
        async function logout() {
            try {
                await fetch('/dashboard/logout', { method: 'POST' });
                window.location.href = '/dashboard';
            } catch (error) {
                alert('Logout error: ' + error.message);
            }
        }
        
        function sendCommand(deviceId, relay, action) {
            const userId = prompt("Enter your registered phone number (10-14 digits, numbers only):");
            if (!userId) return;
            
            const cleanUserId = userId.replace(/\\D/g, '');
            
            if (!/^\\d{10,14}$/.test(cleanUserId)) {
                alert('Please enter a valid phone number (10-14 digits, numbers only)\\n\\nExamples:\\n• US: 1234567890\\n• International: 972501234567');
                return;
            }
            
            if (!confirm('Send ' + action + ' command with user ID: ' + cleanUserId + '?')) {
                return;
            }
            
            fetch('/api/device/' + deviceId + '/send-command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: JSON.stringify({
                    id: 'web_' + Date.now(),
                    action: 'relay_activate',
                    relay: relay,
                    duration: 2000,
                    user: 'dashboard',
                    user_id: cleanUserId
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
        
        function openSettings(deviceId) {
            currentDeviceId = deviceId;
            document.getElementById('modalTitle').textContent = '⚙️ Settings - ' + deviceId;
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
        
        async function loadUsers() {
            if (!currentDeviceId) return;
            
            try {
                const response = await fetch('/api/device/' + currentDeviceId + '/users');
                const users = await response.json();
                
                const usersList = document.getElementById('usersList');
                
                if (users.length === 0) {
                    usersList.innerHTML = '<p style="color: #666;">No users registered yet.</p>';
                    return;
                }
                
                usersList.innerHTML = users.map(user => {
                    const permissions = [];
                    if (user.relayMask & 1) permissions.push('🔓 OPEN');
                    if (user.relayMask & 2) permissions.push('⏸️ STOP');
                    if (user.relayMask & 4) permissions.push('🔒 CLOSE');
                    if (user.relayMask & 8) permissions.push('↗️ PARTIAL');
                    
                    const userLevelText = ['👤 Basic', '👔 Manager', '🔐 Admin'][user.userLevel] || '👤 Basic';
                    const loginStatus = user.canLogin ? '🌐 Can Login' : '🚫 No Login';
                    
                    return \`
                        <div class="user-item">
                            <div class="user-info">
                                <div class="user-name">\${user.name} \${user.canLogin ? '🌐' : ''}</div>
                                <div class="user-details">
                                    📧 \${user.email} | 📱 \${user.phone} | \${userLevelText} | \${loginStatus}<br>
                                    Permissions: \${permissions.join(', ')} |
                                    Registered: \${new Date(user.registeredAt).toLocaleDateString()}
                                </div>
                            </div>
                            <button onclick="deleteUser('\${user.phone}', '\${user.email}', '\${user.name}')" 
                                    style="background: #dc3545; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;"
                                    title="Delete User">
                                🗑️ Delete
                            </button>
                        </div>
                    \`;
                }).join('');
                
            } catch (error) {
                document.getElementById('usersList').innerHTML = '<p style="color: #dc3545;">Error loading users: ' + error.message + '</p>';
            }
        }
        
        async function loadStatus() {
            if (!currentDeviceId) return;
            
            const device = devices.find(([id]) => id === currentDeviceId);
            if (!device) return;
            
            const [deviceId, info] = device;
            const isOnline = (Date.now() - new Date(info.lastHeartbeat).getTime()) < 60000;
            
            document.getElementById('deviceStatus').innerHTML = \`
                <div class="status-grid">
                    <div class="status-item">
                        <div class="status-label">🌐 Connection Status</div>
                        <div class="status-value">\${isOnline ? '🟢 Online' : '🔴 Offline'}</div>
                    </div>
                    <div class="status-item">
                        <div class="status-label">📶 Signal Strength</div>
                        <div class="status-value">\${info.signalStrength} dBm</div>
                    </div>
                    <div class="status-item">
                        <div class="status-label">🔋 Battery Level</div>
                        <div class="status-value">\${info.batteryLevel}%</div>
                    </div>
                    <div class="status-item">
                        <div class="status-label">⏱️ Uptime</div>
                        <div class="status-value">\${Math.floor(info.uptime / 1000)} seconds</div>
                    </div>
                    <div class="status-item">
                        <div class="status-label">🧠 Free Memory</div>
                        <div class="status-value">\${info.freeHeap} bytes</div>
                    </div>
                    <div class="status-item">
                        <div class="status-label">🔄 Last Heartbeat</div>
                        <div class="status-value">\${new Date(info.lastHeartbeat).toLocaleString()}</div>
                    </div>
                    <div class="status-item">
                        <div class="status-label">📱 Firmware Version</div>
                        <div class="status-value">\${info.firmwareVersion}</div>
                    </div>
                    <div class="status-item">
                        <div class="status-label">🌐 Connection Type</div>
                        <div class="status-value">\${info.connectionType}</div>
                    </div>
                </div>
            \`;
        }

        async function testActivation() {
            const serial = document.getElementById('deviceSerial').value || 'ESP32_12345';
            const pin = document.getElementById('devicePin').value || '123456';
            const phone = document.getElementById('userPhone').value || '972501234567';
            
            const cleanPhone = phone.replace(/\\D/g, '');
            console.log("Test activation - Clean phone:", cleanPhone, "Length:", cleanPhone.length);
            
            if (!/^\\d{10,14}$/.test(cleanPhone)) {
                alert('Please enter a valid phone number (10-14 digits)\\nReceived: ' + cleanPhone + ' (' + cleanPhone.length + ' digits)');
                return;
            }
            
            try {
                const response = await fetch('/api/device/activate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        serial: serial,
                        pin: pin,
                        activating_user: cleanPhone
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('✅ Device activated successfully!\\nSerial: ' + serial + '\\nUser: ' + cleanPhone + '\\nFirebase: ' + data.firebase_status);
                    location.reload();
                } else {
                    alert('❌ Activation failed: ' + data.error);
                }
            } catch (error) {
                alert('❌ Error: ' + error.message);
            }
        }

        async function syncFirebase() {
            if (!confirm('🔥 Sync all local users to Firebase?\\n\\nThis will update Firebase with all locally registered users.')) {
                return;
            }
            
            try {
                const response = await fetch('/api/firebase/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('✅ Firebase Sync Complete!\\n\\nDevices: ' + result.syncedDevices + '\\nUsers: ' + result.syncedUsers);
                } else {
                    alert('❌ Firebase Sync Failed: ' + (result.error || 'Unknown error'));
                }
            } catch (error) {
                alert('❌ Sync Error: ' + error.message);
            }
        }
        
        function checkFirebaseStatus() {
            alert('🔥 Firebase Status Check would show detailed connection info');
        }
        
        async function loadLogs() {
            if (!currentDeviceId) return;
            
            try {
                const response = await fetch('/api/device/' + currentDeviceId + '/logs');
                const logs = await response.json();
                
                const logsContainer = document.getElementById('deviceLogs');
                
                if (logs.length === 0) {
                    logsContainer.innerHTML = '<p style="color: #666;">No logs available.</p>';
                    return;
                }
                
                logsContainer.innerHTML = logs.map(log => \`
                    <div class="log-item">
                        <div class="log-header">
                            <span class="log-action">📝 \${log.action.replace('_', ' ').toUpperCase()}</span>
                            <span class="log-time">\${new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <div class="log-details">
                            👤 User: \${log.user} | \${log.details}
                        </div>
                    </div>
                \`).join('');
                
            } catch (error) {
                document.getElementById('deviceLogs').innerHTML = '<p style="color: #dc3545;">Error loading logs: ' + error.message + '</p>';
            }
        }
        
        function loadSchedules() {
            document.getElementById('deviceSchedules').innerHTML = \`
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
                </div>
            \`;
        }
        
        async function registerUserModal() {
            if (!currentDeviceId) return;
            
            const email = document.getElementById('modalEmail').value;
            const phoneRaw = document.getElementById('modalPhone').value;
            const name = document.getElementById('modalName').value;
            const password = document.getElementById('modalPassword').value;
            const userLevel = parseInt(document.getElementById('modalUserLevel').value);
            const canLogin = document.getElementById('modalCanLogin').checked;
            
            console.log("Raw phone input:", JSON.stringify(phoneRaw));
            
            let relayMask = 0;
            if (document.getElementById('modalRelay1').checked) relayMask |= 1;
            if (document.getElementById('modalRelay2').checked) relayMask |= 2;
            if (document.getElementById('modalRelay3').checked) relayMask |= 4;
            if (document.getElementById('modalRelay4').checked) relayMask |= 8;
            
            if (!email || !phoneRaw || !name) {
                alert('Please fill in email, phone, and name fields');
                return;
            }
            
            const cleanPhone = phoneRaw.toString().replace(/\\D/g, '');
            console.log("Cleaned phone:", cleanPhone, "Length:", cleanPhone.length);
            
            if (cleanPhone.length < 10) {
                alert(\`Phone number too short: \${cleanPhone} (\${cleanPhone.length} digits)\\nMinimum: 10 digits\`);
                return;
            }
            
            if (cleanPhone.length > 14) {
                alert(\`Phone number too long: \${cleanPhone} (\${cleanPhone.length} digits)\\nMaximum: 14 digits\`);
                return;
            }
            
            if (!/^\\d{10,14}$/.test(cleanPhone)) {
                alert(\`Invalid phone format: \${cleanPhone}\\nMust be 10-14 digits only\`);
                return;
            }
            
            if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
                alert('Please enter a valid email address');
                return;
            }
            
            if (canLogin && (!password || password.length < 6)) {
                alert('Password must be at least 6 characters if login is allowed');
                return;
            }
            
            console.log("Sending registration with phone:", cleanPhone);
            
            try {
                const response = await fetch('/api/device/' + currentDeviceId + '/register-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json; charset=utf-8' },
                    body: JSON.stringify({
                        email: email,
                        phone: cleanPhone,
                        name: name,
                        password: password,
                        relayMask: relayMask,
                        userLevel: userLevel,
                        canLogin: canLogin
                    })
                });
                
                const result = await response.json();
                console.log("Registration response:", result);
                
                if (result.success) {
                    alert('✅ User registered: ' + name + ' (' + email + ')\\nPhone: ' + result.phone);
                    
                    // Clear form
                    document.getElementById('modalEmail').value = '';
                    document.getElementById('modalPhone').value = '';
                    document.getElementById('modalName').value = '';
                    document.getElementById('modalPassword').value = '';
                    document.getElementById('modalUserLevel').value = '0';
                    document.getElementById('modalCanLogin').checked = false;
                    document.querySelectorAll('#settingsModal input[type="checkbox"]').forEach(cb => cb.checked = false);
                    document.getElementById('modalRelay1').checked = true;
                    
                    // Reload users list
                    loadUsers();
                } else {
                    alert('❌ Registration failed: ' + (result.error || 'Unknown error'));
                    console.error("Registration error:", result);
                }
            } catch (error) {
                alert('❌ Error: ' + error.message);
                console.error("Network error:", error);
            }
        }
        
        // User deletion function
        async function deleteUser(phone, email, name) {
            if (!currentDeviceId) return;
            
            if (!confirm('🗑️ Delete User: ' + name + '?\\n\\nThis will:\\n• Remove user from device\\n• Delete Firebase records\\n• Remove dashboard access (if enabled)\\n\\nThis action cannot be undone!')) {
                return;
            }
            
            try {
                const response = await fetch('/api/device/' + currentDeviceId + '/delete-user', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json; charset=utf-8' },
                    body: JSON.stringify({
                        phone: phone,
                        email: email
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('✅ User Deleted Successfully!\\n\\nUser: ' + result.deletedUser.name + '\\nPhone: ' + result.deletedUser.phone + '\\nFirebase: ' + result.firebase_status);
                    
                    // Reload users list
                    loadUsers();
                } else {
                    alert('❌ Delete Failed: ' + (result.error || 'Unknown error'));
                }
            } catch (error) {
                alert('❌ Delete Error: ' + error.message);
            }
        }
        
        function renderDevices() {
            const container = document.getElementById('devices');
            if (devices.length === 0) {
                container.innerHTML = '<div class="card"><p>📭 No devices connected yet. Waiting for ESP32 heartbeat...</p></div>';
                return;
            }
            
            container.innerHTML = devices.map(([deviceId, info]) => {
                const isOnline = (Date.now() - new Date(info.lastHeartbeat).getTime()) < 60000;
                const deviceUsers = registeredUsers.find(([id]) => id === deviceId);
                const userCount = deviceUsers ? deviceUsers[1].length : 0;
                
                return \`
                    <div class="card device \${isOnline ? '' : 'offline'}">
                        <div class="device-info">
                            <h3>🎛️ \${deviceId} \${isOnline ? '🟢' : '🔴'}</h3>
                            <div class="device-status">
                                📶 Signal: \${info.signalStrength}dBm | 
                                🔋 Battery: \${info.batteryLevel}% | 
                                ⏱️ Uptime: \${Math.floor(info.uptime / 1000)}s |
                                👥 Users: \${userCount}<br>
                                🔄 Last Heartbeat: \${new Date(info.lastHeartbeat).toLocaleTimeString()}
                            </div>
                        </div>
                        
                        <div class="device-actions">
                            <button class="control-btn open" onclick="sendCommand('\${deviceId}', 1, 'OPEN')">🔓 OPEN</button>
                            <button class="control-btn stop" onclick="sendCommand('\${deviceId}', 2, 'STOP')">⏸️ STOP</button>
                            <button class="control-btn close" onclick="sendCommand('\${deviceId}', 3, 'CLOSE')">🔒 CLOSE</button>
                            <button class="control-btn partial" onclick="sendCommand('\${deviceId}', 4, 'PARTIAL')">↗️ PARTIAL</button>
                            <button class="settings-btn" onclick="openSettings('\${deviceId}')" title="Device Settings">⚙️</button>
                        </div>
                    </div>
                \`;
            }).join('');
        }
        
        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('settingsModal');
            if (event.target === modal) {
                closeModal();
            }
        }
        
        // Initialize on page load
        renderDevices();
    </script>
</body>
</html>`;
      
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
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
        'POST /api/device/activate',
        'POST /api/device/{deviceId}/send-command (requires login)',
        'POST /api/device/{deviceId}/register-user (requires login)',
        'DELETE /api/device/{deviceId}/delete-user (requires login)',
        'GET /api/device/{deviceId}/users (requires login)',
        'GET /api/device/{deviceId}/logs (requires login)',
        'GET /api/device/{deviceId}/schedules (requires login)',
        'POST /api/firebase/sync (requires admin)',
        'POST /api/manufacturing/devices (requires super admin)'
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
  console.log(`🔐 Demo Login: admin@gatecontroller.com/admin123 or manager@gatecontroller.com/gate2024`);
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
      deviceLogs.delete(deviceId);
      registeredUsers.delete(deviceId);
      deviceSchedules.delete(deviceId);
    }
  }
  
  // Clean up old sessions (older than 24 hours)
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  for (const [sessionToken, session] of activeSessions.entries()) {
    if (new Date(session.loginTime).getTime() < oneDayAgo) {
      console.log(`🗑️ Removing expired session: ${session.email}`);
      activeSessions.delete(sessionToken);
    }
  }
}, 30000);console.log('=== SERVER STARTUP DEBUG ===');
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

console.log('Current working directory:', process.cwd());
console.log('Files in current directory:', require('fs').readdirSync('.'));

try {
  const packageJson = require('./package.json');
  console.log('Package.json found:', packageJson.dependencies);
} catch (error) {
  console.log('Package.json not found in current directory');
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

manufacturingDevices.set('ESP32_12345', {
  pin: '123456',
  activated: false
});

// Simple dashboard authentication - Default admin users - UPDATED to userLevel 3 for super admin
const DASHBOARD_USERS = new Map([
  ['admin@gatecontroller.com', { password: 'admin123', name: 'Administrator', userLevel: 3, phone: '0000000000' }],
  ['manager@gatecontroller.com', { password: 'gate2024', name: 'Gate Manager', userLevel: 1, phone: '0000000001' }]
]);

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
        }
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
  
  // Keep only last 100 logs per device
  if (logs.length > 100) {
    logs.splice(100);
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

// UPDATED DEVICE ACTIVATION ENDPOINT - add phone validation
if (req.url === '/api/device/activate' && req.method === 'POST') {
  readBody(async (data) => {
    const { serial, pin, activating_user } = data;
    
    // ADDED: Clean the activating_user phone number
    const phoneValidation = validatePhoneNumber(activating_user);
    if (!phoneValidation.valid) {
      res.writeHead(400);
      res.end(JSON.stringify({ success: false, error: phoneValidation.message }));
      return;
    }
    
    const cleanActivatingUser = phoneValidation.cleanPhone;
    
    // Validate device exists
    const device = manufacturingDevices.get(serial);
    if (!device || device.pin !== pin) {
      res.writeHead(400);
      res.end(JSON.stringify({ success: false, error: 'Invalid device credentials' }));
      return;
    }
    
    // UPDATED: Validate user authorized with cleaned phone
    const user = authorizedUsers.get(cleanActivatingUser);
    if (!user || !user.canActivateDevices) {
      res.writeHead(403);
      res.end(JSON.stringify({ success: false, error: 'User not authorized' }));
      return;
    }
    
    // Mark device as activated locally
    device.activated = true;
    
    // Add to local registered users
    if (!registeredUsers.has(serial)) {
      registeredUsers.set(serial, []);
    }
    registeredUsers.get(serial).push({
      email: user.email,
      phone: cleanActivatingUser, // UPDATED: use cleaned phone
      name: user.name,
      relayMask: 15,
      userLevel: 2
    });
    
    // CREATE FIREBASE DOCUMENTS
    if (firebaseInitialized) {
      try {
        // Create gate document
        const gateData = {
          serial: serial,
          name: `Gate ${serial}`,
          location: 'Location not specified',
          timezone: 'Asia/Jerusalem',
          activatedBy: cleanActivatingUser, // UPDATED: use cleaned phone
          activationDate: admin.firestore.FieldValue.serverTimestamp(),
          admins: [cleanActivatingUser], // UPDATED: use cleaned phone
          users: {
            [cleanActivatingUser]: { // UPDATED: use cleaned phone
              name: user.name,
              relayMask: 15,
              role: 'admin',
              addedBy: 'system',
              addedDate: admin.firestore.FieldValue.serverTimestamp()
            }
          }
        };
        
        await db.collection('gates').doc(serial).set(gateData);
        console.log('Firebase gate document created:', serial);
        
        // Create user permissions document
        await db.collection('userPermissions').doc(cleanActivatingUser).set({ // UPDATED: use cleaned phone
          gates: {
            [serial]: {
              name: gateData.name,
              relayMask: 15,
              role: 'admin',
              addedBy: 'system',
              addedDate: admin.firestore.FieldValue.serverTimestamp()
            }
          }
        }, { merge: true });
        
        console.log('Firebase user permissions created:', cleanActivatingUser);
        
      } catch (firebaseError) {
        console.error('Firebase write error:', firebaseError);
      }
    }
    
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      message: 'Device activated successfully',
      firebase_status: firebaseInitialized ? 'connected' : 'local_mode'
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
        activeSessions.set(sessionToken, {
          email: email,
          name: user.name,
          userLevel: user.userLevel,
          phone: user.phone,
          loginTime: new Date().toISOString()
        });
        
        console.log(`🔐 Dashboard login successful: ${email}`);
        
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Set-Cookie': `session=${sessionToken}; HttpOnly; Path=/; Max-Age=86400` // 24 hours
        });
        res.end(JSON.stringify({
          success: true,
          message: 'Login successful',
          user: { email, name: user.name, userLevel: user.userLevel }
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
      
      // Add log entry
      addDeviceLog(deviceId, 'heartbeat', 'system', `Signal: ${data.signalStrength}dBm, Battery: ${data.batteryLevel}%`);
      
      console.log(`💓 Device ${deviceId} heartbeat received:`, connectedDevices.get(deviceId));
      
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

  // Get device users endpoint
  if (req.url.startsWith('/api/device/') && req.url.endsWith('/users') && req.method === 'GET') {
    requireAuth((session) => {
      const urlParts = req.url.split('/');
      const deviceId = urlParts[3];
      
      const users = registeredUsers.get(deviceId) || [];
      
      res.writeHead(200);
      res.end(JSON.stringify(users));
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
