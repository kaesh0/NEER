const express = require("express");

const chatController = require("../controller/chat");
const { handleChatMessage } = chatController;

const router = express.Router();

router.post("/", handleChatMessage);

module.exports = router;
