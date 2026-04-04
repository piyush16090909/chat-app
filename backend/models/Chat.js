// ============================================================
// models/Chat.js — Mongoose schema for a chat conversation
//
// Supports BOTH one-to-one and group chats with the same schema:
//
//   isGroupChat = false  →  exactly 2 users in `participants`
//   isGroupChat = true   →  2+ users, groupName & groupAdmin set
//
// latestMessage is a reference to the most recent Message doc.
// It is populated on the frontend to show message previews in
// the sidebar without loading the full message history.
// ============================================================

const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    // Display name — only used for group chats
    chatName: {
      type: String,
      trim: true,
    },

    isGroupChat: {
      type: Boolean,
      default: false,
    },

    // All members of this chat (including the creator)
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Denormalized pointer to the last message for sidebar previews.
    // Updated by messageController.sendMessage() after every new message.
    latestMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },

    // Only set for group chats — used to gate admin-only actions
    // like adding/removing members (Phase 5)
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Users who have "deleted" this chat from their view (soft-delete)
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

module.exports = mongoose.model("Chat", chatSchema);
