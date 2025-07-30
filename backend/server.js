const http = require('http');

console.log('🚀 Starting Railway server...');

// Let Railway assign the port - don't force 3000
const PORT = process.env.PORT || 3001;

console.log(`🔍 Full Environment check:`, {
  'process.env.PORT': process.env.PORT,
  'process.env.RAILWAY_ENVIRONMENT': process.env.RAILWAY_ENVIRONMENT,
  'Final PORT being used': PORT,
  'All env vars': Object.keys(process.env).filter(key => key.includes('RAILWAY'))
});

const server = http.createServer((req, res) => {
  console.log(`📡 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  if (req.url === '/api/device/heartbeat' && req.method === 'POST') {
  console.log(`💓 Heartbeat from ESP32: ${req.method} ${req.url}`);
  res.writeHead(200);
  res.end(JSON.stringify({
    success: true,
    message: "Heartbeat received",
    timestamp: new Date().toISOString()
  }));
  return;
}
// Add this new endpoint for commands
if (req.url.startsWith('/api/device/') && req.url.endsWith('/commands') && req.method === 'GET') {
  console.log(`📥 Command check from ESP32: ${req.method} ${req.url}`);
  res.writeHead(200);
  res.end(JSON.stringify([])); // Empty commands array for now
  return;
}

// Add device authentication endpoint too
if (req.url === '/api/device/auth' && req.method === 'POST') {
  console.log(`🔐 Auth request from ESP32: ${req.method} ${req.url}`);
  res.writeHead(200);
  res.end(JSON.stringify({
    success: true,
    token: "dummy_token_" + Date.now(),
    message: "Device authenticated"
  }));
  return;
}

if (req.url.startsWith('/api/device/') && req.url.endsWith('/commands') && req.method === 'GET') {
  console.log(`📥 Command check from ESP32: ${req.method} ${req.url}`);
  res.writeHead(200);
  res.end(JSON.stringify([])); // Empty commands for now
  return;
}
  const responseData = {
    message: '🎉 Railway server is working perfectly!',
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method,
    port: PORT,
    server_info: {
      actual_port: PORT,
      railway_env: process.env.RAILWAY_ENVIRONMENT || 'not_set',
      node_env: process.env.NODE_ENV || 'not_set'
    }
  };
  
  res.writeHead(200);
  res.end(JSON.stringify(responseData, null, 2));
});
// Command injection endpoint (for React frontend later)
if (req.url.startsWith('/api/device/') && req.url.includes('/send-command') && req.method === 'POST') {
  console.log(`🎮 Command sent to ESP32: ${req.method} ${req.url}`);
  
  // Here we'd normally store the command in a database/queue
  // For now, just acknowledge receipt
  res.writeHead(200);
  res.end(JSON.stringify({
    success: true,
    message: "Command queued for device",
    timestamp: new Date().toISOString()
  }));
  return;
}
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
  console.log('🎉 Server successfully listening!');
  console.log(`✅ Port: ${addr.port}`);
  console.log(`✅ Address: ${addr.address}`);
  console.log(`🌐 Railway should now be able to route traffic`);
});

// Start server
server.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
  console.log(`💫 Server started on ${PORT}`);
});

// Health check endpoint logging
setInterval(() => {
  console.log(`💓 Server heartbeat - Port: ${PORT} - ${new Date().toISOString()}`);
}, 30000);