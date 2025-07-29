const http = require('http');

console.log('🚀 Starting minimal test server...');
console.log('📁 Current working directory:', process.cwd());
console.log('📝 Script path:', __filename);

const PORT = process.env.PORT || 3001;

console.log(`🔍 Environment check:`, {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
  RAILWAY_PROJECT_ID: process.env.RAILWAY_PROJECT_ID
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
      headers: req.headers
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
  console.log('🎉 Server is listening!');
  console.log(`✅ Test server running on port ${PORT}`);
  console.log(`🌐 Server bound to 0.0.0.0:${PORT}`);
  console.log(`🔗 Railway URL should be accessible now`);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`💫 Listen callback executed - server should be ready`);
});

console.log('📝 Server listen command executed');

// Keep the process alive and log periodically
setInterval(() => {
  console.log(`💓 Server heartbeat - ${new Date().toISOString()}`);
}, 30000);