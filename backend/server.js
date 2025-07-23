const http = require('http');

console.log('🚀 Starting minimal test server...');

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
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

const PORT = process.env.PORT || 3001;

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

server.on('listening', () => {
  console.log('🎉 Server is listening!');
  console.log(`✅ Test server running on port ${PORT}`);
  console.log(`🌐 Server bound to 0.0.0.0:${PORT}`);
});

server.listen(PORT, '0.0.0.0');

console.log('📝 Server listen command executed');