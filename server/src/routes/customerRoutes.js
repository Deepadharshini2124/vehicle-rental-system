
const express = require("express");

const {
  getAllCustomers,
  getCustomerById,
  updateCustomerStatus
} = require("../controllers/customerController");

const {
  getProfile,
  updateProfile,
  changePassword
} = require("../controllers/profileController");

const {
  verifyToken,
  authorizeRoles
} = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// AUTHENTICATION
// ==========================================

router.use(verifyToken);

// ==========================================
// CUSTOMER PROFILE ROUTES
// ==========================================

// Get logged-in customer profile.

router.get(
  "/profile",
  authorizeRoles("customer"),
  getProfile
);

// Update logged-in customer profile.

router.put(
  "/profile",
  authorizeRoles("customer"),
  updateProfile
);

// Change logged-in customer password.

router.patch(
  "/profile/password",
  authorizeRoles("customer"),
  changePassword
);

// ==========================================
// ADMIN AUTHORIZATION
// ==========================================

router.use(authorizeRoles("admin"));

// ==========================================
// ADMIN CUSTOMER MANAGEMENT
// ==========================================

// Get all customers.

router.get(
  "/",
  getAllCustomers
);

// Get single customer details.

router.get(
  "/:id",
  getCustomerById
);

// Block or unblock customer.

router.patch(
  "/:id/status",
  updateCustomerStatus
);

module.exports = router;
