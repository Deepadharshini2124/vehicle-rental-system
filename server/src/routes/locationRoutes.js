
const express = require("express");
const router = express.Router();

// ==========================================
// LOCATION CONTROLLER
// ==========================================

const {
  getPublicLocations,
  getAllLocations,
  getLocationById,
  createLocation,
  updateLocation,
  updateLocationStatus,
} = require("../controllers/locationController");

// ==========================================
// AUTH MIDDLEWARE
// ==========================================

const {
  verifyToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

// ==========================================
// PUBLIC ROUTES
// ==========================================

// GET /api/locations/public
// Get active rental locations

router.get(
  "/public",
  getPublicLocations
);

// ==========================================
// ADMIN ROUTES
// ==========================================

router.use(
  verifyToken,
  authorizeRoles("admin")
);

// GET /api/locations
// Get all locations

router.get(
  "/",
  getAllLocations
);

// GET /api/locations/:id
// Get location details

router.get(
  "/:id",
  getLocationById
);

// POST /api/locations
// Create new location

router.post(
  "/",
  createLocation
);

// PUT /api/locations/:id
// Update location details

router.put(
  "/:id",
  updateLocation
);

// PATCH /api/locations/:id/status
// Activate or deactivate location

router.patch(
  "/:id/status",
  updateLocationStatus
);

module.exports = router;
