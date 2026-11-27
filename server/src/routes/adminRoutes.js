const express = require("express");
const router = express.Router();

const {
  verifyToken,
  authorizeRoles
} = require("../middleware/authMiddleware");

const {
  getDashboardStats
} = require("../controllers/dashboardController");

const {
  getSettings,
  updateSettings
} = require("../controllers/settingsController");

// ==========================================
// ADMIN AUTHENTICATION
// ==========================================

router.use(
  verifyToken,
  authorizeRoles("admin")
);

// ==========================================
// ADMIN DASHBOARD
// ==========================================

router.get("/dashboard", getDashboardStats);

// ==========================================
// ADMIN SETTINGS
// ==========================================

router.get("/settings", getSettings);

router.put("/settings", updateSettings);

module.exports = router;