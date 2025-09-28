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
        body: JSON
