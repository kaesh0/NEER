// Path → controller wiring only.
const express = require("express");
const controller = require("../controller/geo");

const router = express.Router();
router.get("/search", controller.search);
router.get("/reverse", controller.reverse);

module.exports = router;
