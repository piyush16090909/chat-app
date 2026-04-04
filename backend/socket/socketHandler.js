// ============================================================
// socket/socketHandler.js — Socket.io Real-Time Engine
//
// Called from server.js as:  initSocket(httpServer)
//
// Events (client → server):
//   setup          — join a personal room named after user._id
//   join_chat      — join a specific chat room
//   leave_chat     — leave a specific chat room
//   send_message   — broadcast a new message to a chat room
//   typing         — notify others that the user is typing
//   stop_typing    — notify others that the user stopped typing
//
// Events (server → client):
//   connected         — confirms socket setup
//   message_received  — delivers a new message to room members
//   typing            — forwarded to room (except sender)
//   stop_typing       — forwarded to room (except sender)
//   user_online       — notifies all clients a user came online
//   user_offline      — notifies all clients a user went offline
// ============================================================

const { Server } = require("socket.io");
const User = require("../models/User");

let io; // exported so other modules can emit events if needed

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
    // How long (ms) to wait before giving up on a ping
    pingTimeout: 60000,
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ── setup ───────────────────────────────────────────────
    // The client emits this immediately after connecting,
    // passing the logged-in user object. We join a private room
    // named after the user's MongoDB _id so we can send that
    // user direct notifications even when not in a chat room.
    socket.on("setup", async (userData) => {
      socket.join(userData._id);
      socket.userId = userData._id; // save for disconnect handler

      // Mark user as online in MongoDB
      await User.findByIdAndUpdate(userData._id, { isOnline: true });

      // Notify all connected clients
      socket.broadcast.emit("user_online", userData._id);

      socket.emit("connected");
      console.log(`✅ User ${userData.username} set up (room: ${userData._id})`);
    });

    // ── join_chat ───────────────────────────────────────────
    // Client joins the room for a specific chat so they receive
    // messages and typing indicators scoped to that chat.
    socket.on("join_chat", (chatId) => {
      socket.join(chatId);
      console.log(`📥 Socket ${socket.id} joined chat ${chatId}`);
    });

    // ── leave_chat ──────────────────────────────────────────
    socket.on("leave_chat", (chatId) => {
      socket.leave(chatId);
      console.log(`📤 Socket ${socket.id} left chat ${chatId}`);
    });

    // ── send_message ─────────────────────────────────────────
    // The client has already POSTed the message to the REST API
    // and received the populated message doc. It then emits that
    // doc here so we can broadcast it to all OTHER sockets in
    // the chat room in real time.
    socket.on("send_message", (message) => {
      const chat = message.chat;
      if (!chat || !chat.participants) return;

      // Emit to everyone in the chat room EXCEPT the sender
      socket.to(chat._id).emit("message_received", message);
    });

    // ── typing indicators ────────────────────────────────────
    socket.on("typing", (chatId) => {
      socket.to(chatId).emit("typing", chatId);
    });

    socket.on("stop_typing", (chatId) => {
      socket.to(chatId).emit("stop_typing", chatId);
    });

    // ── disconnect ───────────────────────────────────────────
    socket.on("disconnect", async () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);

      if (socket.userId) {
        // Mark user as offline in MongoDB
        await User.findByIdAndUpdate(socket.userId, { isOnline: false });

        // Notify all clients
        socket.broadcast.emit("user_offline", socket.userId);
      }
    });
  });

  return io;
};

const getIo = () => io;

module.exports = { initSocket, getIo };
