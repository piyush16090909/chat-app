// ============================================================
// controllers/authController.js — Register & Login Logic
//
// generateToken(id) — helper that signs a JWT with the user's
//   MongoDB _id as the payload. Expiry is read from .env.
//
// register — POST /api/auth/register
//   1. Check if email already exists
//   2. Create user (password is hashed by the pre-save hook)
//   3. Return the new user + a signed JWT
//
// login — POST /api/auth/login
//   1. Find user by email (explicitly select password field)
//   2. Compare passwords with the matchPassword instance method
//   3. Return the user + a signed JWT
// ============================================================

const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ── Helper ────────────────────────────────────────────────────
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// ── Register ──────────────────────────────────────────────────
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Basic validation — all three fields are required
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Prevent duplicate accounts
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Also check for duplicate username
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: "Username already taken" });
    }

    // Create user — the pre-save hook in User.js hashes the password
    const user = await User.create({ username, email, password });

    // Respond with user data + token (never send the hashed password)
    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      isOnline: user.isOnline,
      token: generateToken(user._id),
    });
  } catch (error) {
    // Mongoose validation errors surface here (e.g. email format)
    res.status(500).json({ message: error.message });
  }
};

// ── Login ─────────────────────────────────────────────────────
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // .select("+password") overrides the { select: false } in the schema
    // so we can run bcrypt.compare against the stored hash
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      isOnline: user.isOnline,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { register, login };
