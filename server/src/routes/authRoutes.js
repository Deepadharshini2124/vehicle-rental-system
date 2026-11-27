
const express = require("express");
const { rateLimit } = require("express-rate-limit");

const router = express.Router();

const {
  register,
  login
} = require("../controllers/authController");

const {
  forgotPassword,
  verifyOTP,
  resetPassword
} = require("../controllers/passwordResetController");

const {
  verifyToken,
  authorizeRoles
} = require("../middleware/authMiddleware");

// ==========================================
// RATE LIMITING
// ==========================================

function createRateLimiter(limit, message) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message
    }
  });
}

const forgotPasswordLimiter = createRateLimiter(
  5,
  "Too many password reset requests. Please try again after 15 minutes."
);

const verifyOTPLimiter = createRateLimiter(
  20,
  "Too many OTP verification requests. Please try again after 15 minutes."
);

const resetPasswordLimiter = createRateLimiter(
  10,
  "Too many password reset attempts. Please try again after 15 minutes."
);

// ==========================================
// PUBLIC AUTHENTICATION ROUTES
// ==========================================

router.post("/register", register);

router.post("/login", login);

// ==========================================
// FORGOT PASSWORD ROUTES
// ==========================================

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  forgotPassword
);

router.post(
  "/verify-otp",
  verifyOTPLimiter,
  verifyOTP
);

router.post(
  "/reset-password",
  resetPasswordLimiter,
  resetPassword
);

// ==========================================
// PROTECTED PROFILE ROUTE
// ==========================================

router.get("/me", verifyToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// ==========================================
// ADMIN-ONLY ROUTE
// ==========================================

router.get(
  "/admin-check",
  verifyToken,
  authorizeRoles("admin"),
  (req, res) => {
    res.json({
      success: true,
      message: "Admin access granted"
    });
  }
);

module.exports = router;
