
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const sequelize = require("../config/database");
const User = require("../models/User");
const Customer = require("../models/Customer");
const PasswordReset = require("../models/PasswordReset");

// ==========================================
// CONFIGURATION
// ==========================================

const OTP_EXPIRY_MINUTES = 5;
const OTP_RESEND_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const RESET_TOKEN_EXPIRY_MINUTES = 10;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_REGEX = /^[0-9]{6}$/;
const TOKEN_REGEX = /^[a-f0-9]{64}$/i;

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function normalizeEmail(email) {
  return typeof email === "string"
    ? email.trim().toLowerCase()
    : "";
}

function isValidEmail(email) {
  return email.length <= 150 && EMAIL_REGEX.test(email);
}

function isResetEnabled() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.OTP_DELIVERY_MODE === "console" &&
    typeof process.env.OTP_SECRET === "string" &&
    process.env.OTP_SECRET.length >= 32
  );
}

function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOTP(userId, otp) {
  return crypto
    .createHmac("sha256", process.env.OTP_SECRET)
    .update(`${userId}:${otp}`)
    .digest("hex");
}

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function compareHash(first, second) {
  if (
    typeof first !== "string" ||
    typeof second !== "string" ||
    !TOKEN_REGEX.test(first) ||
    !TOKEN_REGEX.test(second)
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(first, "hex"),
    Buffer.from(second, "hex")
  );
}

function sendError(res, status, message) {
  return res.status(status).json({
    success: false,
    message
  });
}

function unavailable(res) {
  return sendError(
    res,
    503,
    "Password reset service is currently unavailable"
  );
}

function genericOTPResponse(res) {
  return res.status(200).json({
    success: true,
    message:
      "If your email is registered, an OTP will be generated.",
    expiresIn: OTP_EXPIRY_MINUTES * 60,
    resendAfter: OTP_RESEND_SECONDS
  });
}

// ==========================================
// FORGOT PASSWORD
// POST /api/auth/forgot-password
// ==========================================

exports.forgotPassword = async (req, res) => {
  if (!isResetEnabled()) {
    return unavailable(res);
  }

  try {
    const email = normalizeEmail(req.body?.email);

    if (!isValidEmail(email)) {
      return sendError(
        res,
        400,
        "Please provide a valid email address"
      );
    }

    const result = await sequelize.transaction(
      async (transaction) => {
        const user = await User.findOne({
          where: {
            email,
            role: "customer",
            status: "active"
          },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (!user) {
          return null;
        }

        const existingReset = await PasswordReset.findOne({
          where: {
            userId: user.id
          },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        const now = Date.now();

        // Prevent frequent OTP requests.

        if (existingReset) {
          const elapsed =
            now - new Date(existingReset.lastSentAt).getTime();

          if (elapsed < OTP_RESEND_SECONDS * 1000) {
            return null;
          }
        }

        const otp = generateOTP();

        const expiresAt = new Date(
          now + OTP_EXPIRY_MINUTES * 60 * 1000
        );

        const resetData = {
          userId: user.id,
          otpHash: hashOTP(user.id, otp),
          expiresAt,
          attempts: 0,
          lastSentAt: new Date(now),
          resetTokenHash: null,
          resetTokenExpiresAt: null,
          used: false
        };

        if (existingReset) {
          await existingReset.update(resetData, {
            transaction
          });
        } else {
          await PasswordReset.create(resetData, {
            transaction
          });
        }

        return {
          email,
          otp,
          expiresAt
        };
      }
    );

    // Development-only OTP delivery.
    // Never enable console OTP in production.

    if (result) {
      console.log("================================");
      console.log("PASSWORD RESET - DEVELOPMENT OTP");
      console.log("Email:", result.email);
      console.log("OTP:", result.otp);
      console.log("Expires:", result.expiresAt.toISOString());
      console.log("================================");
    }

    // Same response for registered and unknown emails.

    return genericOTPResponse(res);

  } catch (error) {
    console.error("Forgot password error:", error.name);

    return sendError(
      res,
      500,
      "Unable to process password reset request"
    );
  }
};

// ==========================================
// VERIFY OTP
// POST /api/auth/verify-otp
// ==========================================

exports.verifyOTP = async (req, res) => {
  if (!isResetEnabled()) {
    return unavailable(res);
  }

  try {
    const email = normalizeEmail(req.body?.email);
    const otp = req.body?.otp;

    if (
      !isValidEmail(email) ||
      typeof otp !== "string" ||
      !OTP_REGEX.test(otp)
    ) {
      return sendError(
        res,
        400,
        "Valid email and 6-digit OTP are required"
      );
    }

    const result = await sequelize.transaction(
      async (transaction) => {
        const user = await User.findOne({
          where: {
            email,
            role: "customer",
            status: "active"
          },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (!user) {
          return null;
        }

        const reset = await PasswordReset.findOne({
          where: {
            userId: user.id
          },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        const now = Date.now();

        if (
          !reset ||
          reset.used ||
          reset.resetTokenHash ||
          new Date(reset.expiresAt).getTime() <= now ||
          reset.attempts >= OTP_MAX_ATTEMPTS
        ) {
          return null;
        }

        const expectedHash = hashOTP(user.id, otp);

        if (!compareHash(reset.otpHash, expectedHash)) {
          await reset.update(
            {
              attempts: reset.attempts + 1
            },
            { transaction }
          );

          return null;
        }

        // Generate a secure one-time reset token.

        const resetToken = crypto
          .randomBytes(32)
          .toString("hex");

        await reset.update(
          {
            resetTokenHash: hashToken(resetToken),

            resetTokenExpiresAt: new Date(
              now +
                RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000
            ),

            // Invalidate OTP after successful verification.
            expiresAt: new Date(now)
          },
          { transaction }
        );

        return { resetToken };
      }
    );

    if (!result) {
      return sendError(
        res,
        400,
        "Invalid or expired OTP. Request a new OTP if needed."
      );
    }

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      resetToken: result.resetToken,
      expiresIn: RESET_TOKEN_EXPIRY_MINUTES * 60
    });

  } catch (error) {
    console.error("Verify OTP error:", error.name);

    return sendError(
      res,
      500,
      "Unable to verify OTP"
    );
  }
};

// ==========================================
// RESET PASSWORD
// POST /api/auth/reset-password
// ==========================================

exports.resetPassword = async (req, res) => {
  if (!isResetEnabled()) {
    return unavailable(res);
  }

  try {
    const {
      email: rawEmail,
      resetToken,
      newPassword,
      confirmPassword
    } = req.body || {};

    const email = normalizeEmail(rawEmail);

    if (
      !isValidEmail(email) ||
      typeof resetToken !== "string" ||
      !TOKEN_REGEX.test(resetToken)
    ) {
      return sendError(
        res,
        400,
        "Invalid password reset request"
      );
    }

    if (
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string"
    ) {
      return sendError(
        res,
        400,
        "New password and confirm password are required"
      );
    }

    if (
      newPassword.length < 8 ||
      !newPassword.trim()
    ) {
      return sendError(
        res,
        400,
        "Password must contain at least 8 characters"
      );
    }

    if (Buffer.byteLength(newPassword, "utf8") > 72) {
      return sendError(
        res,
        400,
        "Password must not exceed 72 bytes"
      );
    }

    if (newPassword !== confirmPassword) {
      return sendError(
        res,
        400,
        "Passwords do not match"
      );
    }

    const result = await sequelize.transaction(
      async (transaction) => {
        const user = await User.findOne({
          where: {
            email,
            role: "customer",
            status: "active"
          },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (!user) {
          return {
            success: false,
            message: "Invalid or expired reset token"
          };
        }

        const reset = await PasswordReset.findOne({
          where: {
            userId: user.id
          },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (
          !reset ||
          reset.used ||
          !reset.resetTokenHash ||
          !reset.resetTokenExpiresAt ||
          new Date(reset.resetTokenExpiresAt).getTime() <=
            Date.now() ||
          !compareHash(
            reset.resetTokenHash,
            hashToken(resetToken)
          )
        ) {
          return {
            success: false,
            message: "Invalid or expired reset token"
          };
        }

        const customer = await Customer.findOne({
          where: {
            userId: user.id
          },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (!customer) {
          return {
            success: false,
            message:
              "Unable to reset password. Contact support."
          };
        }

        const samePassword = await bcrypt.compare(
          newPassword,
          user.password
        );

        if (samePassword) {
          return {
            success: false,
            message:
              "New password must be different from the current password"
          };
        }

        const hashedPassword = await bcrypt.hash(
          newPassword,
          12
        );

        // Update users table.

        await user.update(
          {
            password: hashedPassword
          },
          { transaction }
        );

        // Update customers table.

        await customer.update(
          {
            password: hashedPassword
          },
          { transaction }
        );

        // Invalidate reset token permanently.

        await reset.update(
          {
            used: true,
            resetTokenHash: null,
            resetTokenExpiresAt: null,
            expiresAt: new Date()
          },
          { transaction }
        );

        return {
          success: true
        };
      }
    );

    if (!result.success) {
      return sendError(
        res,
        400,
        result.message
      );
    }

    return res.status(200).json({
      success: true,
      message: "Password reset successfully"
    });

  } catch (error) {
    console.error("Reset password error:", error.name);

    return sendError(
      res,
      500,
      "Unable to reset password"
    );
  }
};
