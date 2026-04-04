// ============================================================
// server.js — Entry point for the Real-Time Chat Application
// Sets up Express, connects to MongoDB, registers all routes,
// and initializes Socket.io (wired up fully in Phase 2).
// ============================================================

const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

// Load environment variables from .env
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// ── Middleware ────────────────────────────────────────────────
// Parse incoming JSON bodies
app.use(express.json());

// Allow requests from the React dev server (port 3000)
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// ── Routes ───────────────────────────────────────────────────
app.use("/api/auth",     require("./routes/authRoutes"));
app.use("/api/users",    require("./routes/userRoutes"));
app.use("/api/chats",    require("./routes/chatRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));

// Health-check endpoint — handy for verifying the server is up
app.get("/", (req, res) => {
  res.json({ message: "Chat App API is running 🚀" });
});

// ── HTTP Server ───────────────────────────────────────────────
// We wrap Express in a plain http.Server so Socket.io can
// attach to the same port in Phase 2.
const server = http.createServer(app);

// Initialise Socket.io
const { initSocket } = require("./socket/socketHandler");
initSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
