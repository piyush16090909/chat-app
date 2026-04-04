// routes/messageRoutes.js — Message REST Endpoints

const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { getMessages, sendMessage } = require("../controllers/messageController");

router.get("/:chatId", protect, getMessages);
router.post("/", protect, sendMessage);

module.exports = router;
