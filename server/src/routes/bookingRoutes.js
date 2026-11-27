const express = require("express");
const router = express.Router();

const {
  createBooking,
  getMyBookings,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
} = require("../controllers/bookingController");

const {
  verifyToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

// ==========================================
// CUSTOMER BOOKING ROUTES
// ==========================================

// Create new booking
router.post(
  "/",
  verifyToken,
  authorizeRoles("customer"),
  createBooking
);

// Get logged-in customer booking history
router.get(
  "/my",
  verifyToken,
  authorizeRoles("customer"),
  getMyBookings
);

// Cancel customer booking
router.patch(
  "/:id/cancel",
  verifyToken,
  authorizeRoles("customer"),
  cancelBooking
);

// ==========================================
// ADMIN BOOKING ROUTES
// ==========================================

// Get all bookings
router.get(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  getAllBookings
);

// Get individual booking details
router.get(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  getBookingById
);

// Update booking status
// Confirm / Reject / Start Rental / Complete Rental
router.patch(
  "/:id/status",
  verifyToken,
  authorizeRoles("admin"),
  updateBookingStatus
);

module.exports = router;