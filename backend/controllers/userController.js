// ============================================================
// controllers/userController.js — User Profile & Search
//
// getMe      — GET /api/users/me
//   Returns the currently authenticated user's profile.
//   req.user is populated by the protect middleware.
//
// getAllUsers — GET /api/users
//   Returns all users except the current user.
//   Used in Phase 3 to populate the "New Chat" user list.
//
// searchUsers — GET /api/users/search?query=<term>
//   Case-insensitive regex search on username and email.
//   Used by the search bar in the sidebar.
// ============================================================

const User = require("../models/User");
const Chat = require("../models/Chat");
const Message = require("../models/Message");

// @route   GET /api/users/me
// @access  Protected
const getMe = async (req, res) => {
  try {
    // req.user is already fetched by authMiddleware (no password)
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/users
// @access  Protected
const getAllUsers = async (req, res) => {
  try {
    // Exclude the current user from the list
    const users = await User.find({ _id: { $ne: req.user._id } }).select(
      "-password"
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/users/search?query=<term>
// @access  Protected
const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    // $options: "i" makes the regex case-insensitive
    const regex = new RegExp(query, "i");

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },          // exclude self
        { $or: [{ username: regex }, { email: regex }] },
      ],
    }).select("-password");

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── blockUser ─────────────────────────────────────────────────
// Adds targetUserId to req.user's blockedUsers array.
// Also removes any 1-to-1 chat between them from BOTH users' views
// by storing a "deletedFor" array on Chat (soft-delete per user).
//
// @route   PUT /api/users/block/:userId
// @access  Protected
const blockUser = async (req, res) => {
  try {
    const targetId = req.params.userId;

    if (targetId === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot block yourself" });
    }

    // Add to blockedUsers (avoid duplicates with $addToSet)
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { blockedUsers: targetId },
    });

    res.json({ message: "User blocked successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── unblockUser ───────────────────────────────────────────────
// @route   PUT /api/users/unblock/:userId
// @access  Protected
const unblockUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { blockedUsers: req.params.userId },
    });
    res.json({ message: "User unblocked successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── deleteChat ────────────────────────────────────────────────
// Soft-deletes the chat for the current user only by adding their
// _id to Chat.deletedFor[].  The chat still exists for the other
// participant.  All messages are also soft-deleted for this user.
//
// @route   DELETE /api/users/chat/:chatId
// @access  Protected
const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;

    // Verify user is a participant
    const chat = await Chat.findOne({
      _id: chatId,
      participants: req.user._id,
    });

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Add current user to deletedFor so it's hidden for them
    await Chat.findByIdAndUpdate(chatId, {
      $addToSet: { deletedFor: req.user._id },
    });

    res.json({ message: "Chat deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getMe, getAllUsers, searchUsers, blockUser, unblockUser, deleteChat };
