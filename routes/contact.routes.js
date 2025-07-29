const express = require("express");
const { submitMessage } = require("../controllers/contact.controller");

const router = express.Router();

router.post("/contact", submitMessage);

module.exports = router;