// ============================================================
// controllers/chatController.js — Chat CRUD Logic
//
// accessOrCreateChat  — POST /api/chats
//   Find an existing 1-to-1 chat between req.user and userId,
//   or create one if it doesn't exist yet.
//
// getMyChats          — GET /api/chats
//   Return all chats the current user participates in,
//   sorted by latest activity (most recent message first).
//
// createGroupChat     — POST /api/chats/group
//   Create a group chat with a name and 2+ other members.
//
// renameGroupChat     — PUT /api/chats/group/:chatId
//   Change the chatName of an existing group chat.
//
// addToGroup          — PUT /api/chats/group/:chatId/add
//   Add a new participant to a group chat (admin only).
//
// removeFromGroup     — PUT /api/chats/group/:chatId/remove
//   Remove a participant from a group chat (admin only).
// ============================================================

const Chat = require("../models/Chat");
const User = require("../models/User");

// ── accessOrCreateChat ────────────────────────────────────────
// @route   POST /api/chats
// @body    { userId }   — the OTHER user's MongoDB _id
// @access  Protected
const accessOrCreateChat = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // Look for an existing 1-to-1 chat between the two users
    let chat = await Chat.findOne({
      isGroupChat: false,
      participants: { $all: [req.user._id, userId] },
    })
      .populate("participants", "-password")
      .populate({
        path: "latestMessage",
        populate: { path: "sender", select: "username avatar" },
      });

    if (chat) {
      return res.json(chat);
    }

    // No existing chat — create one
    const newChat = await Chat.create({
      chatName: "direct",
      isGroupChat: false,
      participants: [req.user._id, userId],
    });

    const populated = await Chat.findById(newChat._id).populate(
      "participants",
      "-password"
    );

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── getMyChats ────────────────────────────────────────────────
// @route   GET /api/chats
// @access  Protected
const getMyChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: { $in: [req.user._id] },
      deletedFor: { $nin: [req.user._id] }, // exclude soft-deleted chats
    })
      .populate("participants", "-password")
      .populate("groupAdmin", "-password")
      .populate({
        path: "latestMessage",
        populate: { path: "sender", select: "username avatar email" },
      })
      .sort({ updatedAt: -1 }); // newest activity first

    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── createGroupChat ───────────────────────────────────────────
// @route   POST /api/chats/group
// @body    { name, users }  — users is an array of user IDs
// @access  Protected
const createGroupChat = async (req, res) => {
  try {
    const { name, users } = req.body;

    if (!name || !users || users.length < 2) {
      return res
        .status(400)
        .json({ message: "Group name and at least 2 other users are required" });
    }

    // Include the creator in the participants list
    const allParticipants = [...users, req.user._id];

    const groupChat = await Chat.create({
      chatName: name,
      isGroupChat: true,
      participants: allParticipants,
      groupAdmin: req.user._id,
    });

    const populated = await Chat.findById(groupChat._id)
      .populate("participants", "-password")
      .populate("groupAdmin", "-password");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── renameGroupChat ───────────────────────────────────────────
// @route   PUT /api/chats/group/:chatId
// @body    { name }
// @access  Protected (admin only enforced client-side for now)
const renameGroupChat = async (req, res) => {
  try {
    const { name } = req.body;
    const chat = await Chat.findByIdAndUpdate(
      req.params.chatId,
      { chatName: name },
      { new: true }
    )
      .populate("participants", "-password")
      .populate("groupAdmin", "-password");

    if (!chat) return res.status(404).json({ message: "Chat not found" });

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── addToGroup ────────────────────────────────────────────────
// @route   PUT /api/chats/group/:chatId/add
// @body    { userId }
// @access  Protected
const addToGroup = async (req, res) => {
  try {
    const chat = await Chat.findByIdAndUpdate(
      req.params.chatId,
      { $addToSet: { participants: req.body.userId } }, // $addToSet avoids duplicates
      { new: true }
    )
      .populate("participants", "-password")
      .populate("groupAdmin", "-password");

    if (!chat) return res.status(404).json({ message: "Chat not found" });

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── removeFromGroup ───────────────────────────────────────────
// @route   PUT /api/chats/group/:chatId/remove
// @body    { userId }
// @access  Protected
const removeFromGroup = async (req, res) => {
  try {
    const chat = await Chat.findByIdAndUpdate(
      req.params.chatId,
      { $pull: { participants: req.body.userId } },
      { new: true }
    )
      .populate("participants", "-password")
      .populate("groupAdmin", "-password");

    if (!chat) return res.status(404).json({ message: "Chat not found" });

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  accessOrCreateChat,
  getMyChats,
  createGroupChat,
  renameGroupChat,
  addToGroup,
  removeFromGroup,
};
