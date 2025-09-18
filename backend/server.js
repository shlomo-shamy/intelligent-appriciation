import express from "express";
import bodyParser from "body-parser";
import session from "express-session";

const app = express();
const port = process.env.PORT || 3000;

// In-memory stores (replace with DB in production)
const users = {
  admin: { password: "admin", role: "admin", name: "Administrator" },
};
const connectedDevices = new Map();
const commandQueue = new Map();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Force UTF-8
app.use((req, res, next) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  next();
});

// Sessions
app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true,
  })
);

// Middleware
function requireAuth(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/");
}

// ======================== AUTH ROUTES ========================

// Sign in page
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Gate Controller - Sign In</title>
    </head>
    <body>
      <h2>Sign In</h2>
      <form method="POST" action="/login">
        <label>Username:</label><br>
        <input type="text" name="username" required><br>
        <label>Password:</label><br>
        <input type="password" name="password" required><br><br>
        <button type="submit">Sign In</button>
      </form>
      <p>Don’t have an account? <a href="/signup">Sign Up</a></p>
    </body>
    </html>
  `);
});

// Handle login
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (users[username] && users[username].password === password) {
    req.session.user = { username, role: users[username].role };
    return res.redirect("/dashboard");
  }
  res.send("❌ Invalid credentials. <a href='/'>Try again</a>");
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// ======================== SIGNUP ROUTES ========================

// Sign up page
app.get("/signup", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Gate Controller - Sign Up</title>
    </head>
    <body>
      <h2>Create a New Account</h2>
      <form method="POST" action="/signup">
        <label>Username:</label><br>
        <input type="text" name="username" required><br>

        <label>Password:</label><br>
        <input type="password" name="password" required><br>

        <label>Name:</label><br>
        <input type="text" name="name"><br>

        <label>Role:</label><br>
        <select name="role">
          <option value="user" selected>User</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select><br><br>

        <button type="submit">Sign Up</button>
      </form>
      <p>Already have an account? <a href="/">Sign In</a></p>
    </body>
    </html>
  `);
});

// Handle signup
app.post("/signup", (req, res) => {
  const { username, password, name, role } = req.body;

  if (!username || !password) {
    return res.send("❌ Username and password required. <a href='/signup'>Back</a>");
  }

  if (users[username]) {
    return res.send("❌ User already exists. <a href='/signup'>Try again</a>");
  }

  users[username] = {
    password,
    role: role || "user",
    name: name || username,
  };

  console.log(`✅ New user created: ${username} (${role || "user"})`);
  res.send("✅ Signup successful! <a href='/'>Sign in</a>");
});

// ======================== DASHBOARD ========================

app.get("/dashboard", requireAuth, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Gate Controller - Dashboard</title>
    </head>
    <body>
      <h2>Welcome, ${req.session.user.username}</h2>
      <p>Role: ${req.session.user.role}</p>
      <p><a href="/logout">Logout</a></p>

      <h3>Connected Devices</h3>
      <ul>
        ${Array.from(connectedDevices.entries())
          .map(([id, info]) => `<li>${id} - ${JSON.stringify(info)}</li>`)
          .join("")}
      </ul>
    </body>
    </html>
  `);
});

// ======================== API ========================

// Device heartbeat
app.post("/api/device/heartbeat", (req, res) => {
  const { deviceId, status } = req.body;
  if (!deviceId) return res.status(400).json({ error: "Missing deviceId" });

  connectedDevices.set(deviceId, {
    ...req.body,
    lastSeen: new Date().toISOString(),
  });

  if (!commandQueue.has(deviceId)) commandQueue.set(deviceId, []);
  const queue = commandQueue.get(deviceId);
  const commands = queue.splice(0, queue.length);

  res.json({ message: "✅ Heartbeat received", commands });
});

// Queue command
app.post("/api/device/:id/command", requireAuth, (req, res) => {
  const { id } = req.params;
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: "Missing command" });
  if (!commandQueue.has(id)) commandQueue.set(id, []);
  commandQueue.get(id).push(command);
  res.json({ message: `✅ Command queued for ${id}`, command });
});

// ======================== SERVER START ========================
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
