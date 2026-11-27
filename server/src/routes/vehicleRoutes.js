
const express = require("express");
const router = express.Router();

// ==========================================
// VEHICLE CONTROLLER
// ==========================================

const {
  createVehicle,
  getAllVehicles,
  getVehicleById,
  updateVehicle,
  updateVehicleStatus,
} = require("../controllers/vehicleController");

// ==========================================
// AVAILABILITY CONTROLLER
// ==========================================

const {
  getVehicleAvailability,
} = require("../controllers/availabilityController");

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

// GET /api/vehicles
// Get all vehicles
router.get("/", getAllVehicles);

// GET /api/vehicles/:id/availability
// Get vehicle availability calendar
router.get(
  "/:id/availability",
  getVehicleAvailability
);

// GET /api/vehicles/:id
// Get vehicle details
router.get("/:id", getVehicleById);

// ==========================================
// ADMIN ROUTES
// ==========================================

// POST /api/vehicles
// Create new vehicle
router.post(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  createVehicle
);

// PUT /api/vehicles/:id
// Update vehicle details
router.put(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  updateVehicle
);

// PATCH /api/vehicles/:id/status
// Update vehicle status
router.patch(
  "/:id/status",
  verifyToken,
  authorizeRoles("admin"),
  updateVehicleStatus
);

module.exports = router;
