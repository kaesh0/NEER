// Path → controller wiring only.
const express = require("express");
const controller = require("../controller/auth");

const router = express.Router();
router.post("/login", controller.login);
router.post("/register", controller.register);
router.post("/persona", controller.updatePersona);
router.get("/me", controller.getMe);

module.exports = router;
