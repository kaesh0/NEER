// Path → controller wiring only.
const express = require("express");
const controller = require("../controller/analysis");

const router = express.Router();
router.get("/", controller.getAnalysis);

module.exports = router;
