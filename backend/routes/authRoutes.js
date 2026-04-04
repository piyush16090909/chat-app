// ============================================================
// routes/authRoutes.js — Authentication Routes
//
// POST /api/auth/register  → create a new account
// POST /api/auth/login     → sign in and receive a JWT
// ============================================================

const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);

module.exports = router;
