// ============================================================
// models/Message.js — Mongoose schema for a single chat message
//
// Each message belongs to one Chat and has one sender.
// readBy tracks which participants have seen the message —
// used to show unread counts in the sidebar (Phase 4).
// ============================================================

const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    // The user who sent this message
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Plain-text message content
    content: {
      type: String,
      required: [true, "Message content cannot be empty"],
      trim: true,
    },

    // The chat this message belongs to
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },

    // Array of user IDs who have read this message.
    // The sender is added automatically on creation.
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true, // createdAt is used as the message timestamp
  }
);

module.exports = mongoose.model("Message", messageSchema);
