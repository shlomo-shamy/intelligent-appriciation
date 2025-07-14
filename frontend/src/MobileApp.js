import React, { useState, useEffect } from 'react';

// Get the correct API URL for GitHub Codespaces
const getApiUrl = () => {
  const hostname = window.location.hostname;
  
  if (hostname.includes('github.dev')) {
    // Replace port 3000 with 3001 for API
    const apiHostname = hostname.replace('-3000', '-3001');
    return `https://${apiHostname}`;
  }
  
  // Fallback for local development
  return 'http://localhost:3001';
};

const API_URL = getApiUrl();

function MobileApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [controllers, setControllers] = useState([]);
  const [loginData, setLoginData] = useState({ phone_number: '', password: '' });
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordChangeData, setPasswordChangeData] = useState({
    phone_number: '',
    old_password: '',
    new_password: '',
    confirm_password: ''
  });

  // Check for existing session on load
  useEffect(() => {
    const token = localStorage.getItem('mobileToken');
    if (token) {
      checkExistingSession(token);
    }
  }, []);

  const checkExistingSession = async (token) => {
    try {
      console.log('Checking session with API:', API_URL);
      const response = await fetch(`${API_URL}/api/mobile/check-session`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.sessionValid) {
        setIsLoggedIn(true);
        setUser(data.user);
        setControllers(data.user.accessible_controllers);
        showFeedback('Welcome back! Ready to control your gates.', 'success');
      } else {
        localStorage.removeItem('mobileToken');
      }
    } catch (error) {
      console.error('Session check failed:', error);
      localStorage.removeItem('mobileToken');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      console.log('Attempting login to:', `${API_URL}/api/mobile/login`);
      
      const response = await fetch(`${API_URL}/api/mobile/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Login response:', data);
      
      if (data.success) {
        if (data.passwordChangeRequired) {
          setPasswordChangeData(prev => ({
            ...prev,
            phone_number: loginData.phone_number,
            old_password: loginData.password
          }));
          setShowPasswordChange(true);
          showFeedback('Password change required before you can access gates.', 'warning');
        } else {
          // Store token and user data
          localStorage.setItem('mobileToken', data.token);
          setUser(data.user);
          setControllers(data.user.accessible_controllers);
          setIsLoggedIn(true);
          showFeedback(data.message, 'success');
        }
      } else {
        showFeedback(data.error || 'Login failed', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      showFeedback(`Connection error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordChangeData.new_password !== passwordChangeData.confirm_password) {
      showFeedback('New passwords do not match', 'error');
      return;
    }
    
    if (passwordChangeData.new_password.length < 6 || passwordChangeData.new_password.length > 20) {
      showFeedback('Password must be 6-20 characters long', 'error');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone_number: passwordChangeData.phone_number,
          old_password: passwordChangeData.old_password,
          new_password: passwordChangeData.new_password
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showFeedback('Password changed successfully! Please login again.', 'success');
        setShowPasswordChange(false);
        setPasswordChangeData({
          phone_number: '',
          old_password: '',
          new_password: '',
          confirm_password: ''
        });
        setLoginData({
          phone_number: passwordChangeData.phone_number,
          password: ''
        });
      } else {
        showFeedback(data.error || 'Password change failed', 'error');
      }
    } catch (error) {
      console.error('Password change error:', error);
      showFeedback(`Connection error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const sendCommand = async (controllerId, relayNumber, buttonName) => {
    setLoading(true);
    
    try {
      const token = localStorage.getItem('mobileToken');
      console.log('Sending command to:', `${API_URL}/api/command`);
      
      const response = await fetch(`${API_URL}/api/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          controller_id: controllerId,
          relay_number: relayNumber,
          button_name: buttonName
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        showFeedback(`✅ ${buttonName} command sent successfully!`, 'success');
      } else {
        showFeedback(`❌ ${data.error}`, 'error');
      }
    } catch (error) {
      console.error('Command error:', error);
      showFeedback(`❌ Command failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (message, type) => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(''), 5000);
  };

  const handleLogout = () => {
    localStorage.removeItem('mobileToken');
    setIsLoggedIn(false);
    setUser(null);
    setControllers([]);
    showFeedback('Logged out successfully', 'info');
  };

  // Check if user has access to a specific relay
  const hasRelayAccess = (relayNumber) => {
    return user && (user.relay_mask & (1 << (relayNumber - 1))) !== 0;
  };

  // Password Change Screen
  if (showPasswordChange) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          maxWidth: '400px',
          width: '100%'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '2.5rem', margin: '0 0 10px 0', color: '#333' }}>🔐</h1>
            <h2 style={{ color: '#333', margin: '0 0 10px 0' }}>Change Password</h2>
            <p style={{ color: '#666', margin: 0 }}>Required for first-time users</p>
          </div>

          <form onSubmit={handlePasswordChange}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontWeight: 'bold' }}>
                Phone Number
              </label>
              <input
                type="tel"
                value={passwordChangeData.phone_number}
                readOnly
                style={{
                  width: '100%',
                  padding: '15px',
                  fontSize: '16px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '10px',
                  backgroundColor: '#f8f9fa',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontWeight: 'bold' }}>
                Current Password
              </label>
              <input
                type="password"
                value={passwordChangeData.old_password}
                onChange={(e) => setPasswordChangeData({...passwordChangeData, old_password: e.target.value})}
                placeholder="Enter current password"
                style={{
                  width: '100%',
                  padding: '15px',
                  fontSize: '16px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '10px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontWeight: 'bold' }}>
                New Password (6-20 characters)
              </label>
              <input
                type="password"
                value={passwordChangeData.new_password}
                onChange={(e) => setPasswordChangeData({...passwordChangeData, new_password: e.target.value})}
                placeholder="Enter new password"
                style={{
                  width: '100%',
                  padding: '15px',
                  fontSize: '16px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '10px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontWeight: 'bold' }}>
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordChangeData.confirm_password}
                onChange={(e) => setPasswordChangeData({...passwordChangeData, confirm_password: e.target.value})}
                placeholder="Confirm new password"
                style={{
                  width: '100%',
                  padding: '15px',
                  fontSize: '16px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '10px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px',
                fontSize: '18px',
                fontWeight: 'bold',
                background: loading ? '#ccc' : 'linear-gradient(45deg, #28a745, #20c997)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                marginBottom: '15px'
              }}
            >
              {loading ? '🔄 Changing Password...' : '✅ Change Password'}
            </button>

            <button
              type="button"
              onClick={() => setShowPasswordChange(false)}
              style={{
                width: '100%',
                padding: '15px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Back to Login
            </button>
          </form>

          {feedback && (
            <div style={{
              marginTop: '20px',
              padding: '15px',
              borderRadius: '10px',
              background: feedback.type === 'success' ? '#d4edda' : 
                         feedback.type === 'error' ? '#f8d7da' : '#fff3cd',
              color: feedback.type === 'success' ? '#155724' : 
                     feedback.type === 'error' ? '#721c24' : '#856404',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              {feedback.message}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          maxWidth: '400px',
          width: '100%'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '2.5rem', margin: '0 0 10px 0', color: '#333' }}>🚪</h1>
            <h2 style={{ color: '#333', margin: '0 0 10px 0' }}>Gate Control</h2>
            <p style={{ color: '#666', margin: 0 }}>Quick Access Login</p>
            <p style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
              API: {API_URL}
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontWeight: 'bold' }}>
                Phone Number
              </label>
              <input
                type="tel"
                value={loginData.phone_number}
                onChange={(e) => setLoginData({...loginData, phone_number: e.target.value})}
                placeholder="+972xxxxxxxxx"
                style={{
                  width: '100%',
                  padding: '15px',
                  fontSize: '16px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '10px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontWeight: 'bold' }}>
                Password
              </label>
              <input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                placeholder="Enter your password"
                style={{
                  width: '100%',
                  padding: '15px',
                  fontSize: '16px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '10px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px',
                fontSize: '18px',
                fontWeight: 'bold',
                background: loading ? '#ccc' : 'linear-gradient(45deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              {loading ? '🔄 Connecting...' : '🔓 Connect'}
            </button>
          </form>

          {feedback && (
            <div style={{
              marginTop: '20px',
              padding: '15px',
              borderRadius: '10px',
              background: feedback.type === 'success' ? '#d4edda' : 
                         feedback.type === 'error' ? '#f8d7da' : '#fff3cd',
              color: feedback.type === 'success' ? '#155724' : 
                     feedback.type === 'error' ? '#721c24' : '#856404',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              {feedback.message}
            </div>
          )}

          <div style={{ marginTop: '30px', fontSize: '14px', color: '#666', textAlign: 'center' }}>
            <p><strong>Demo Accounts:</strong></p>
            <p>User: +972587654321 / user123</p>
            <p style={{ color: '#dc3545', fontWeight: 'bold' }}>
              Manager: +972501234567 / temp123 
              <br />
              <small>(requires password change)</small>
            </p>
            <p>Admin: +972522554743 / admin123</p>
          </div>
        </div>
      </div>
    );
  }

  // Main Control Interface
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '15px',
        padding: '20px',
        marginBottom: '20px',
        textAlign: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
      }}>
        <h1 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '1.8rem' }}>
          🚪 Gate Control
        </h1>
        <p style={{ margin: '0 0 10px 0', color: '#666' }}>
          Welcome, <strong>{user?.user_name}</strong>
        </p>
        <p style={{ margin: '0 0 15px 0', color: '#10b981', fontWeight: 'bold', fontSize: '14px' }}>
          🟢 Connected • Instant Access
        </p>
        <button
          onClick={handleLogout}
          style={{
            background: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div style={{
          background: feedback.type === 'success' ? '#d4edda' : 
                     feedback.type === 'error' ? '#f8d7da' : '#fff3cd',
          color: feedback.type === 'success' ? '#155724' : 
                 feedback.type === 'error' ? '#721c24' : '#856404',
          padding: '15px',
          borderRadius: '10px',
          marginBottom: '20px',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '16px'
        }}>
          {feedback.message}
        </div>
      )}

      {/* Controllers */}
      {controllers.map(controller => (
        <div key={controller.controller_id} style={{
          background: 'white',
          borderRadius: '20px',
          padding: '25px',
          marginBottom: '20px',
          boxShadow: '0 15px 35px rgba(0,0,0,0.2)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <h2 style={{ margin: '0 0 5px 0', color: '#333', fontSize: '1.5rem' }}>
              {controller.controller_name}
            </h2>
            <p style={{ margin: '0 0 5px 0', color: '#666' }}>
              {controller.location}
            </p>
            <span style={{
              background: controller.status === 'online' ? '#d4edda' : '#f8d7da',
              color: controller.status === 'online' ? '#155724' : '#721c24',
              padding: '5px 15px',
              borderRadius: '15px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              {controller.status === 'online' ? '🟢 ONLINE' : '🔴 OFFLINE'}
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '15px'
          }}>
            {Object.entries(controller.relays).map(([relayNum, relay]) => {
              if (!hasRelayAccess(parseInt(relayNum))) return null;

              const getButtonStyle = (relayName) => {
                const baseStyle = {
                  padding: '20px',
                  border: 'none',
                  borderRadius: '15px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  textAlign: 'center',
                  minHeight: '80px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                };

                switch(relayName.toLowerCase()) {
                  case 'open':
                    return { ...baseStyle, background: '#28a745', color: 'white' };
                  case 'close':
                    return { ...baseStyle, background: '#dc3545', color: 'white' };
                  case 'stop':
                    return { ...baseStyle, background: '#ffc107', color: '#333' };
                  default:
                    return { ...baseStyle, background: '#6f42c1', color: 'white' };
                }
              };

              return (
                <button
                  key={relayNum}
                  onClick={() => sendCommand(controller.controller_id, parseInt(relayNum), relay.name)}
                  disabled={loading || controller.status !== 'online'}
                  style={{
                    ...getButtonStyle(relay.name),
                    opacity: (loading || controller.status !== 'online') ? 0.5 : 1
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '5px' }}>
                    {relay.name === 'Open' ? '🔓' : 
                     relay.name === 'Close' ? '🔒' :
                     relay.name === 'Stop' ? '⏹️' : '⚡'}
                  </div>
                  <div>{relay.name.toUpperCase()}</div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {controllers.length === 0 && (
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          textAlign: 'center',
          color: '#666'
        }}>
          <h3>No Controllers Available</h3>
          <p>Contact your administrator for access.</p>
        </div>
      )}
    </div>
  );
}

export default MobileApp;