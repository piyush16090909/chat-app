// ============================================================
// models/User.js — Mongoose schema for a chat user
//
// Fields:
//   username  — unique display name shown in the chat UI
//   email     — used for login (must be unique)
//   password  — bcrypt-hashed before saving (see pre-save hook)
//   avatar    — URL string; defaults to a DiceBear avatar
//   isOnline  — toggled by Socket.io in Phase 2
//   createdAt — auto-added by { timestamps: true }
// ============================================================

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [20, "Username cannot exceed 20 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      // Never send the password field in query results by default
      select: false,
    },

    avatar: {
      type: String,
      // Generates a unique avatar from the username via DiceBear API
      default: function () {
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.username}`;
      },
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    // Users this person has blocked
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    // Automatically adds createdAt and updatedAt fields
    timestamps: true,
  }
);

// ── Pre-save Hook ─────────────────────────────────────────────
// Hash the password ONLY when it has been modified (new user or
// password change). This prevents double-hashing on other saves.
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  // Salt rounds = 10 is the recommended balance of speed vs security
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance Method ───────────────────────────────────────────
// Compare a plain-text candidate password with the stored hash.
// Used in authController during login.
userSchema.methods.matchPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
