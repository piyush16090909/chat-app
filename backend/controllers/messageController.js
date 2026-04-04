// ============================================================
// controllers/messageController.js — Message CRUD Logic
//
// getMessages  — GET /api/messages/:chatId
//   Fetch all messages in a chat, sorted oldest → newest.
//   Also marks all messages as read by the current user.
//
// sendMessage  — POST /api/messages
//   Create a new message and update Chat.latestMessage so the
//   sidebar preview stays current. The Socket.io emit happens
//   in the route handler (Phase 2 socket wiring) so we can
//   pass the io instance without circular dependencies.
// ============================================================

const Message = require("../models/Message");
const Chat = require("../models/Chat");

// ── getMessages ───────────────────────────────────────────────
// @route   GET /api/messages/:chatId
// @access  Protected
const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "username avatar email")
      .populate("chat")
      .sort({ createdAt: 1 }); // oldest first for natural chat flow

    // Mark all messages in this chat as read by the current user
    await Message.updateMany(
      { chat: req.params.chatId, readBy: { $nin: [req.user._id] } },
      { $addToSet: { readBy: req.user._id } }
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── sendMessage ───────────────────────────────────────────────
// @route   POST /api/messages
// @body    { content, chatId }
// @access  Protected
const sendMessage = async (req, res) => {
  try {
    const { content, chatId } = req.body;

    if (!content || !chatId) {
      return res.status(400).json({ message: "content and chatId are required" });
    }

    // Create the message; sender is read from req.user set by authMiddleware
    const message = await Message.create({
      sender: req.user._id,
      content,
      chat: chatId,
      readBy: [req.user._id], // sender has obviously "read" their own message
    });

    // Populate sender details so the frontend can render the bubble immediately
    const populated = await Message.findById(message._id)
      .populate("sender", "username avatar")
      .populate({
        path: "chat",
        populate: { path: "participants", select: "-password" },
      });

    // Update the chat's latestMessage so sidebar previews refresh
    await Chat.findByIdAndUpdate(chatId, { latestMessage: populated._id });

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getMessages, sendMessage };
