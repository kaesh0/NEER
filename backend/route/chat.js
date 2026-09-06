// Path → controller wiring only.
const express = require("express");
const controller = require("../controller/chat");

const router = express.Router();
router.post("/", controller.postChat);

module.exports = router;
