// routes/chatRoutes.js — Chat REST Endpoints

const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  accessOrCreateChat,
  getMyChats,
  createGroupChat,
  renameGroupChat,
  addToGroup,
  removeFromGroup,
} = require("../controllers/chatController");

router.post("/", protect, accessOrCreateChat);
router.get("/", protect, getMyChats);
router.post("/group", protect, createGroupChat);
router.put("/group/:chatId", protect, renameGroupChat);
router.put("/group/:chatId/add", protect, addToGroup);
router.put("/group/:chatId/remove", protect, removeFromGroup);

module.exports = router;
