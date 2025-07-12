console.log("🚀 Server starting...");
const http = require("http");
http.createServer((req, res) => {
  res.end("Gate Controller API Works!");
}).listen(3001, () => {
  console.log("✅ Server running on port 3001");
});
