const express = require("express");
const { login, register, getMe, logout, resetPasswordController } = require("../controllers/auth.controller");
const authenticate = require("../middleware/auth");

const router = express.Router();

router.post("/auth/login", login);
router.post("/auth/register", register);
router.get("/auth/me", authenticate, getMe);
router.get("/auth/logout", logout);
// router.post('/reset-password/:token', resetPasswordController);

module.exports = router;