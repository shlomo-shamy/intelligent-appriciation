// Common JavaScript functions for all pages

// Global variables
let currentDeviceId = null;

// Navigation functions
function navigateTo(path) {
    window.location.href = path;
}

// Authentication functions
async function logout() {
    try {
        await fetch('/dashboard/logout', { method: 'POST' });
        window.location.href = '/dashboard';
    } catch (error) {
        alert('Logout error: ' + error.message);
    }
}

// Phone number validation
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

// Device command functions
function sendCommand(deviceId, relay, action) {
    const userId = prompt("Enter your registered phone number (10-14 digits, numbers only):");
    if (!userId) return;
    
    const cleanUserId = userId.replace(/\D/g, '');
    
    if (!/^\d{10,14}$/.test(cleanUserId)) {
        alert('Please enter a valid phone number (10-14 digits, numbers only)\n\nExamples:\n• US: 1234567890\n• International: 972501234567');
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
            showNotification('Command sent: ' + action, 'success');
        } else {
            showNotification('Command failed', 'error');
        }
    })
    .catch(e => showNotification('Error: ' + e.message, 'error'));
}

// Modal functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId = null) {
    if (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    } else {
        // Close any open modal
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
    }
    document.body.style.overflow = 'auto';
    currentDeviceId = null;
}

// Tab switching
function switchTab(tabName, event = null) {
    if (event) {
        // Remove active class from all tabs
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to selected tab
        event.target.classList.add('active');
        document.getElementById(tabName + '-tab').classList.add('active');
    }
    
    // Load data based on tab
    switch(tabName) {
        case 'users': loadUsers(); break;
        case 'status': loadStatus(); break;
        case 'logs': loadLogs(); break;
        case 'schedules': loadSchedules(); break;
    }
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 15px;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideInRight 0.3s ease;
    `;
    
    // Set background color based on type
    switch(type) {
        case 'success': notification.style.background = '#28a745'; break;
        case 'error': notification.style.background = '#dc3545'; break;
        case 'warning': notification.style.background = '#ffc107'; notification.style.color = '#212529'; break;
        default: notification.style.background = '#17a2b8'; break;
    }
    
    // Style the close button
    const closeBtn = notification.querySelector('button');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: inherit;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Loading state management
function setLoading(elementId, isLoading = true) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    if (isLoading) {
        element.classList.add('loading');
        element.style.opacity = '0.6';
        element.style.pointerEvents = 'none';
    } else {
        element.classList.remove('loading');
        element.style.opacity = '1';
        element.style.pointerEvents = 'auto';
    }
}

// Form utilities
function clearForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if (input.type === 'checkbox' || input.type === 'radio') {
            input.checked = false;
        } else {
            input.value = '';
        }
    });
}

function validateForm(formId, rules = {}) {
    const form = document.getElementById(formId);
    if (!form) return false;
    
    let isValid = true;
    const errors = [];
    
    Object.keys(rules).forEach(fieldName => {
        const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
        if (!field) return;
        
        const rule = rules[fieldName];
        const value = field.value.trim();
        
        // Required validation
        if (rule.required && !value) {
            isValid = false;
            errors.push(`${rule.label || fieldName} is required`);
            field.classList.add('error');
        } else {
            field.classList.remove('error');
        }
        
        // Pattern validation
        if (value && rule.pattern && !rule.pattern.test(value)) {
            isValid = false;
            errors.push(rule.message || `${rule.label || fieldName} format is invalid`);
            field.classList.add('error');
        }
        
        // Min length validation
        if (value && rule.minLength && value.length < rule.minLength) {
            isValid = false;
            errors.push(`${rule.label || fieldName} must be at least ${rule.minLength} characters`);
            field.classList.add('error');
        }
    });
    
    if (!isValid) {
        showNotification(errors.join('\n'), 'error');
    }
    
    return isValid;
}

// Date formatting utilities
function formatDate(dateString, options = {}) {
    if (!dateString) return 'Not set';
    
    const date = new Date(dateString);
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
}

function timeAgo(dateString) {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return diffSec + 's ago';
    if (diffMin < 60) return diffMin + 'm ago';
    if (diffHour < 24) return diffHour + 'h ago';
    if (diffDay < 7) return diffDay + 'd ago';
    
    return formatDate(dateString, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Local storage utilities (with fallback)
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.warn('Could not save to localStorage:', error);
        return false;
    }
}

function loadFromStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.warn('Could not load from localStorage:', error);
        return defaultValue;
    }
}

// API utilities
async function apiCall(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json; charset=utf-8'
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, mergedOptions);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Set active navigation based on current page
    const currentPage = window.location.pathname.replace('/', '') || 'dashboard';
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.page === currentPage) {
            btn.classList.add('active');
        }
    });
    
    // Close modals when clicking outside
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            closeModal();
        }
    };
    
    // Handle escape key to close modals
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeModal();
        }
    });
    
    // Add error styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        .error {
            border-color: #dc3545 !important;
            box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.2) !important;
        }
        
        .loading {
            position: relative;
        }
        
        .loading::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 20px;
            height: 20px;
            margin: -10px 0 0 -10px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
});

// ==================== SCHEDULE FUNCTIONS ====================

function loadSchedules() {
    if (!currentDeviceId) return;
    
    setLoading('schedulesContainer', true);
    
    fetch('/api/device/' + currentDeviceId + '/schedules')
        .then(response => response.json())
        .then(data => {
            window.schedules = data || [];
            displaySchedules();
        })
        .catch(error => {
            console.error('Error loading schedules:', error);
            document.getElementById('schedulesContainer').innerHTML = 
                '<p style="color: #dc3545;">Failed to load schedules</p>';
        })
        .finally(() => {
            setLoading('schedulesContainer', false);
        });
}

function displaySchedules() {
    const container = document.getElementById('schedulesContainer');
    const schedules = window.schedules || [];
    
    if (schedules.length === 0) {
        container.innerHTML = '<p style="color: #666;">No schedules configured. Click "Add Schedule" to create your first schedule.</p>';
        return;
    }
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    let html = '<div style="display: grid; gap: 15px;">';
    schedules.forEach(schedule => {
        const typeLabel = schedule.type === 1 ? 'Automation' : 
                         schedule.type === 2 ? 'Group Block' : 'User Block';
        const typeBadge = schedule.type === 1 ? '#28a745' : '#ffc107';
        
        let timeInfo = '';
        if (schedule.type === 1) {
            const action = schedule.action === 1 ? 'ON' : 'OFF';
            const relay = ['OPEN', 'STOP', 'CLOSE', 'PARTIAL'][schedule.relayNumber - 1];
            timeInfo = `${days[schedule.triggerDay]} ${String(schedule.triggerHour).padStart(2,'0')}:${String(schedule.triggerMinute).padStart(2,'0')} → ${relay} ${action}`;
        } else {
            timeInfo = `${days[schedule.triggerDay]} ${String(schedule.triggerHour).padStart(2,'0')}:${String(schedule.triggerMinute).padStart(2,'0')} → ${days[schedule.endDay]} ${String(schedule.endHour).padStart(2,'0')}:${String(schedule.endMinute).padStart(2,'0')}`;
        }
        
        html += `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid ${typeBadge};">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 5px 0;">${schedule.name}</h4>
                        <div style="display: flex; gap: 10px; margin-bottom: 5px;">
                            <span style="background: ${typeBadge}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${typeLabel}</span>
                            <span style="background: ${schedule.enabled ? '#28a745' : '#6c757d'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${schedule.enabled ? 'ENABLED' : 'DISABLED'}</span>
                        </div>
                        <small style="color: #666;">${timeInfo}</small>
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <button onclick="editSchedule(${schedule.id})" class="btn btn-primary" style="padding: 8px 12px; font-size: 12px;">
                            Edit
                        </button>
                        <button onclick="deleteSchedule(${schedule.id})" class="btn btn-danger" style="padding: 8px 12px; font-size: 12px;">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

function showAddScheduleModal() {
    document.getElementById('scheduleForm').reset();
    document.getElementById('scheduleId').value = '';
    document.getElementById('scheduleModalTitle').textContent = '➕ Add Schedule';
    document.getElementById('scheduleEnabled').checked = true;
    updateScheduleFormFields();
    document.getElementById('scheduleModal').style.display = 'block';
}

function closeScheduleModal() {
    document.getElementById('scheduleModal').style.display = 'none';
}

function updateScheduleFormFields() {
    const type = parseInt(document.getElementById('scheduleType').value);
    
    if (type === 1) {
        document.getElementById('automationFields').style.display = 'block';
        document.getElementById('blockingFields').style.display = 'none';
    } else {
        document.getElementById('automationFields').style.display = 'none';
        document.getElementById('blockingFields').style.display = 'block';
        document.getElementById('userSelectField').style.display = type === 3 ? 'block' : 'none';
        
        if (type === 3) {
            loadUsersForSchedule();
        }
    }
}

function loadUsersForSchedule() {
    fetch('/api/gates/' + currentDeviceId + '/users')
        .then(response => response.json())
        .then(users => {
            const select = document.getElementById('scheduleUserId');
            select.innerHTML = '<option value="0">Select user...</option>';
            
            const usersArray = Array.isArray(users) ? users : Object.values(users);
            usersArray.forEach(user => {
                select.innerHTML += `<option value="${user.phone}">${user.name}</option>`;
            });
        });
}

function saveSchedule(event) {
    event.preventDefault();
    
    const type = parseInt(document.getElementById('scheduleType').value);
    const scheduleId = document.getElementById('scheduleId').value;
    
    console.log('=== SAVE SCHEDULE START ===');
    console.log('Type:', type, 'Schedule ID:', scheduleId);
    console.log('Current Device ID:', currentDeviceId);
    
    // Validate currentDeviceId exists
    if (!currentDeviceId) {
        alert('❌ Error: No device selected');
        console.error('No currentDeviceId set!');
        return;
    }
    
    let scheduleData = {
        name: document.getElementById('scheduleName').value.trim(),
        type: type,
        enabled: document.getElementById('scheduleEnabled').checked
    };
    
    // Validate name
    if (!scheduleData.name) {
        alert('Please enter a schedule name');
        return;
    }
    
    if (type === 1) {
        // Gate Automation
        const time = document.getElementById('triggerTime').value;
        if (!time) {
            alert('Please select a time');
            return;
        }
        
        const timeParts = time.split(':');
        scheduleData.action = parseInt(document.getElementById('scheduleAction').value);
        scheduleData.triggerDay = parseInt(document.getElementById('triggerDay').value);
        scheduleData.triggerHour = parseInt(timeParts[0]);
        scheduleData.triggerMinute = parseInt(timeParts[1]);
        scheduleData.relayNumber = parseInt(document.getElementById('relayNumber').value);
        scheduleData.userId = 0;
        scheduleData.endDay = 0;
        scheduleData.endHour = 0;
        scheduleData.endMinute = 0;
    } else {
        // Group Block or User Block
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;
        
        if (!startTime || !endTime) {
            alert('Please fill in both start and end times');
            return;
        }
        
        const startParts = startTime.split(':');
        const endParts = endTime.split(':');
        
        scheduleData.action = 3;
        scheduleData.triggerDay = parseInt(document.getElementById('startDay').value);
        scheduleData.triggerHour = parseInt(startParts[0]);
        scheduleData.triggerMinute = parseInt(startParts[1]);
        scheduleData.endDay = parseInt(document.getElementById('endDay').value);
        scheduleData.endHour = parseInt(endParts[0]);
        scheduleData.endMinute = parseInt(endParts[1]);
        
        let relayMask = 0;
        if (document.getElementById('blockRelay1').checked) relayMask |= 1;
        if (document.getElementById('blockRelay2').checked) relayMask |= 2;
        if (document.getElementById('blockRelay3').checked) relayMask |= 4;
        if (document.getElementById('blockRelay4').checked) relayMask |= 8;
        
        if (relayMask === 0) {
            alert('Please select at least one relay to block');
            return;
        }
        
        scheduleData.relayNumber = relayMask;
        
        if (type === 3) {
            scheduleData.userId = parseInt(document.getElementById('scheduleUserId').value) || 0;
            if (scheduleData.userId === 0) {
                alert('Please select a user');
                return;
            }
        } else {
            scheduleData.userId = 0;
        }
    }
    
    console.log('Schedule data prepared:', JSON.stringify(scheduleData, null, 2));
    
    const method = scheduleId ? 'PUT' : 'POST';
    const url = scheduleId 
        ? '/api/device/' + currentDeviceId + '/schedules/' + scheduleId
        : '/api/device/' + currentDeviceId + '/schedules';
    
    console.log('Request URL:', url);
    console.log('Request Method:', method);
    
    // Show loading state
    const form = document.getElementById('scheduleForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Saving...';
    
    fetch(url, {
        method: method,
        headers: { 
            'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(scheduleData)
    })
    .then(response => {
        console.log('HTTP Status:', response.status);
        console.log('Response OK:', response.ok);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response.text().then(text => {
            console.log('Raw response text:', text);
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error('JSON parse error:', e);
                throw new Error('Server returned invalid JSON: ' + text);
            }
        });
    })
    .then(result => {
        console.log('Parsed server response:', result);
        
        if (result.success) {
            console.log('✅ Save confirmed by server');
            
            // Close modal
            closeScheduleModal();
            
            // Reload schedules with a small delay
            console.log('Reloading schedules...');
            setTimeout(() => {
                loadSchedules();
            }, 500);
            
            // Show success message
            setTimeout(() => {
                if (typeof showNotification === 'function') {
                    showNotification('Schedule saved successfully!', 'success');
                } else {
                    alert('✅ Schedule saved successfully!');
                }
            }, 600);
            
        } else {
            console.error('❌ Server returned success=false:', result);
            throw new Error(result.error || result.message || 'Server rejected the schedule');
        }
    })
    .catch(error => {
        console.error('❌ SAVE ERROR:', error);
        console.error('Error stack:', error.stack);
        
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        
        // Show error
        if (typeof showNotification === 'function') {
            showNotification('Failed to save schedule: ' + error.message, 'error');
        } else {
            alert('❌ Failed to save schedule:\n\n' + error.message);
        }
    });
}

function editSchedule(scheduleId) {
    const schedule = (window.schedules || []).find(s => s.id === scheduleId);
    if (!schedule) return;
    
    document.getElementById('scheduleId').value = schedule.id;
    document.getElementById('scheduleName').value = schedule.name;
    document.getElementById('scheduleType').value = schedule.type;
    document.getElementById('scheduleEnabled').checked = schedule.enabled;
    
    if (schedule.type === 1) {
        document.getElementById('triggerDay').value = schedule.triggerDay;
        document.getElementById('triggerTime').value = 
            `${String(schedule.triggerHour).padStart(2,'0')}:${String(schedule.triggerMinute).padStart(2,'0')}`;
        document.getElementById('scheduleAction').value = schedule.action;
        document.getElementById('relayNumber').value = schedule.relayNumber;
    } else {
        document.getElementById('startDay').value = schedule.triggerDay;
        document.getElementById('startTime').value = 
            `${String(schedule.triggerHour).padStart(2,'0')}:${String(schedule.triggerMinute).padStart(2,'0')}`;
        document.getElementById('endDay').value = schedule.endDay;
        document.getElementById('endTime').value = 
            `${String(schedule.endHour).padStart(2,'0')}:${String(schedule.endMinute).padStart(2,'0')}`;
        
        document.getElementById('blockRelay1').checked = !!(schedule.relayNumber & 1);
        document.getElementById('blockRelay2').checked = !!(schedule.relayNumber & 2);
        document.getElementById('blockRelay3').checked = !!(schedule.relayNumber & 4);
        document.getElementById('blockRelay4').checked = !!(schedule.relayNumber & 8);
        
        if (schedule.type === 3) {
            document.getElementById('scheduleUserId').value = schedule.userId;
        }
    }
    
    updateScheduleFormFields();
    document.getElementById('scheduleModalTitle').textContent = '✏️ Edit Schedule';
    document.getElementById('scheduleModal').style.display = 'block';
}

function deleteSchedule(scheduleId) {
    if (!confirm('Delete this schedule? This action cannot be undone.')) return;
    
    fetch('/api/device/' + currentDeviceId + '/schedules/' + scheduleId, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            loadSchedules();
            showNotification('Schedule deleted successfully!', 'success');
        } else {
            showNotification('Failed to delete schedule', 'error');
        }
    })
    .catch(error => {
        console.error('Error deleting schedule:', error);
        showNotification('Error deleting schedule: ' + error.message, 'error');
    });
}

// Export functions for use in other scripts
window.GateController = {
    navigateTo,
    logout,
    validatePhoneNumber,
    sendCommand,
    openModal,
    closeModal,
    switchTab,
    showNotification,
    setLoading,
    clearForm,
    validateForm,
    formatDate,
    timeAgo,
    saveToStorage,
    loadFromStorage,
    apiCall,
    // Schedule functions
    loadSchedules,
    displaySchedules,
    showAddScheduleModal,
    closeScheduleModal,
    saveSchedule,
    editSchedule,
    deleteSchedule
};
