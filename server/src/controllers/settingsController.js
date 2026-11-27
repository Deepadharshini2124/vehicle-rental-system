
const { ValidationError } = require("sequelize");
const sequelize = require("../config/database");
const Setting = require("../models/Setting");

// ==========================================
// ERROR HANDLING
// ==========================================

function handleError(res, error) {
  if (error instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      message: error.errors
        .map((item) => item.message)
        .join(", "),
    });
  }

  console.error("Settings error:", error.message);

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}

// ==========================================
// PUBLIC SETTINGS FIELDS
// ==========================================

const PUBLIC_SETTINGS_FIELDS = [
  "businessName",
  "businessEmail",
  "businessPhone",
  "businessAddress",
  "minRentalDays",
  "maxRentalDays",
  "allowCancellation",
  "termsAndConditions",
];

// ==========================================
// GET PUBLIC SETTINGS - CUSTOMER
// ==========================================

const getPublicSettings = async (req, res) => {
  try {
    const settings = await Setting.findByPk(1, {
      attributes: PUBLIC_SETTINGS_FIELDS,
    });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "Business settings are unavailable",
      });
    }

    res.set("Cache-Control", "no-store");

    return res.status(200).json({
      success: true,
      message: "Public settings fetched successfully",
      settings,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// ==========================================
// GET SETTINGS - ADMIN
// ==========================================

const getSettings = async (req, res) => {
  try {
    const settings = await Setting.findByPk(1);

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "Settings not found. Run database sync.",
      });
    }

    res.set("Cache-Control", "no-store");

    return res.status(200).json({
      success: true,
      message: "Settings fetched successfully",
      settings,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// ==========================================
// UPDATE SETTINGS - ADMIN
// ==========================================

const updateSettings = async (req, res) => {
  try {
    const body = req.body;

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid settings data",
      });
    }

    const allowedFields = [
      "businessName",
      "businessEmail",
      "businessPhone",
      "businessAddress",
      "minRentalDays",
      "maxRentalDays",
      "allowCancellation",
      "termsAndConditions",
    ];

    const payload = {};

    for (const field of allowedFields) {
      if (
        Object.prototype.hasOwnProperty.call(
          body,
          field
        )
      ) {
        payload[field] = body[field];
      }
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid settings fields provided",
      });
    }

    // ======================================
    // BUSINESS NAME VALIDATION
    // ======================================

    if ("businessName" in payload) {
      if (
        typeof payload.businessName !== "string" ||
        !payload.businessName.trim() ||
        payload.businessName.trim().length > 150
      ) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid business name",
        });
      }

      payload.businessName =
        payload.businessName.trim();
    }

    // ======================================
    // OPTIONAL TEXT FIELDS
    // ======================================

    const optionalFields = {
      businessEmail: 150,
      businessPhone: 20,
      businessAddress: 2000,
      termsAndConditions: 10000,
    };

    for (const [field, maxLength] of Object.entries(
      optionalFields
    )) {
      if (!(field in payload)) continue;

      if (payload[field] === null) continue;

      if (
        typeof payload[field] !== "string" ||
        payload[field].trim().length > maxLength
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid value for ${field}`,
        });
      }

      payload[field] =
        payload[field].trim() || null;
    }

    // ======================================
    // EMAIL VALIDATION
    // ======================================

    if (payload.businessEmail) {
      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(payload.businessEmail)) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid business email",
        });
      }

      payload.businessEmail =
        payload.businessEmail.toLowerCase();
    }

    // ======================================
    // PHONE VALIDATION
    // ======================================

    if (payload.businessPhone) {
      const phoneRegex = /^\+?[0-9]{10,15}$/;

      if (!phoneRegex.test(payload.businessPhone)) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid business phone number",
        });
      }
    }

    // ======================================
    // RENTAL DURATION VALIDATION
    // ======================================

    for (const field of [
      "minRentalDays",
      "maxRentalDays",
    ]) {
      if (!(field in payload)) continue;

      if (
        !Number.isInteger(payload[field]) ||
        payload[field] < 1 ||
        payload[field] > 366
      ) {
        return res.status(400).json({
          success: false,
          message: `${field} must be an integer between 1 and 366`,
        });
      }
    }

    // ======================================
    // CANCELLATION POLICY VALIDATION
    // ======================================

    if (
      "allowCancellation" in payload &&
      typeof payload.allowCancellation !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: "Allow cancellation must be true or false",
      });
    }

    // ======================================
    // SAVE SETTINGS USING TRANSACTION
    // ======================================

    const result = await sequelize.transaction(
      async (transaction) => {
        const settings = await Setting.findByPk(1, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!settings) {
          return {
            status: 404,
            success: false,
            message: "Settings not found",
          };
        }

        const minRentalDays =
          payload.minRentalDays ??
          settings.minRentalDays;

        const maxRentalDays =
          payload.maxRentalDays ??
          settings.maxRentalDays;

        if (minRentalDays > maxRentalDays) {
          return {
            status: 400,
            success: false,
            message:
              "Minimum rental days cannot exceed maximum rental days",
          };
        }

        await settings.update(payload, {
          transaction,
        });

        await settings.reload({
          transaction,
        });

        return {
          status: 200,
          success: true,
          message: "Settings updated successfully",
          settings: settings.toJSON(),
        };
      }
    );

    const { status, ...response } = result;

    return res.status(status).json(response);

  } catch (error) {
    return handleError(res, error);
  }
};

// ==========================================
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
  getPublicSettings,
  getSettings,
  updateSettings,
};
