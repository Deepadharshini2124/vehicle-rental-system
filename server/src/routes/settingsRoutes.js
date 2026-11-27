
const express = require("express");

const {
  getPublicSettings,
} = require("../controllers/settingsController");

const router = express.Router();

// ==========================================
// PUBLIC SETTINGS ROUTE
// ==========================================

// Customer website can access this endpoint
// without login or authentication.

router.get("/public", getPublicSettings);

module.exports = router;
