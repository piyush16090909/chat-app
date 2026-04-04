// ============================================================
// routes/userRoutes.js — User Profile Routes (all protected)
//
// GET /api/users/me           → current user's profile
// GET /api/users              → list all other users
// GET /api/users/search       → search users by name/email
// ============================================================

const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { getMe, getAllUsers, searchUsers, blockUser, unblockUser, deleteChat } = require("../controllers/userController");

router.get("/me", protect, getMe);
router.get("/search", protect, searchUsers);
router.get("/", protect, getAllUsers);
router.put("/block/:userId", protect, blockUser);
router.put("/unblock/:userId", protect, unblockUser);
router.delete("/chat/:chatId", protect, deleteChat);

module.exports = router;
