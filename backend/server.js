const http = require('http');

console.log('🚀 Starting minimal test server...');
console.log('📁 Current working directory:', process.cwd());
console.log('📝 Script path:', __filename);

// More robust port handling
const PORT = process.env.PORT || process.env.RAILWAY_PORT || 3000;

console.log(`🔍 Environment check:`, {
  PORT: process.env.PORT,
  RAILWAY_PORT: process.env.RAILWAY_PORT,
  NODE_ENV: process.env.NODE_ENV,
  RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
  RAILWAY_PROJECT_ID: process.env.RAILWAY_PROJECT_ID,
  'Final PORT': PORT
});

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      message: '✅ Railway test server is working!',
      timestamp: new Date().toISOString(),
      url: req.url,
      method: req.method,
      port: PORT,
      env: {
        PORT: process.env.PORT,
        RAILWAY_PORT: process.env.RAILWAY_PORT,
        NODE_ENV: process.env.NODE_ENV
      }
    }));
    return;
  }
  
  res.writeHead(200);
  res.end(JSON.stringify({
    message: '✅ Railway test server is working!',
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method
  }));
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

server.on('listening', () => {
  const addr = server.address();
  console.log('🎉 Server is listening!');
  console.log(`✅ Test server running on port ${PORT}`);
  console.log(`🌐 Server bound to ${addr.address}:${addr.port}`);
  console.log(`🔗 Railway URL should be accessible now`);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`💫 Listen callback executed - server should be ready on ${PORT}`);
});

console.log('📝 Server listen command executed');

// Keep the process alive and log periodically
setInterval(() => {
  console.log(`💓 Server heartbeat - ${new Date().toISOString()} - Port: ${PORT}`);
}, 30000);