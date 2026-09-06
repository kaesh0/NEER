const express = require("express");

const analysisController = require("../controller/analysis");
const { handleGetAnalysis } = analysisController;

const router = express.Router();

router.get("/", handleGetAnalysis);

module.exports = router;
