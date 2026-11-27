
const bcrypt = require("bcryptjs");

const sequelize = require("../config/database");
const User = require("../models/User");
const Customer = require("../models/Customer");

const { ValidationError } = require("sequelize");

// ==========================================
// FORMAT CUSTOMER PROFILE
// ==========================================

function formatProfile(user, customer) {
  return {
    id: customer.id,
    userId: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: customer.address,
    role: user.role,
    status: user.status,
    createdAt: customer.createdAt
  };
}

// ==========================================
// GET CUSTOMER PROFILE
// ==========================================

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: [
        "id",
        "name",
        "email",
        "phone",
        "role",
        "status"
      ]
    });

    if (
      !user ||
      user.role !== "customer" ||
      user.status !== "active"
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const customer = await Customer.findOne({
      where: {
        userId: user.id
      },
      attributes: [
        "id",
        "userId",
        "address",
        "createdAt"
      ]
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer profile not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      profile: formatProfile(user, customer)
    });

  } catch (error) {
    console.error("Get profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile"
    });
  }
};

// ==========================================
// UPDATE CUSTOMER PROFILE
// ==========================================

exports.updateProfile = async (req, res) => {
  try {
    const body = req.body;

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid profile data"
      });
    }

    const allowedFields = [
      "name",
      "phone",
      "address"
    ];

    const invalidFields = Object.keys(body).filter(
      (field) => !allowedFields.includes(field)
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Only name, phone and address can be updated"
      });
    }

    const { name, phone, address } = body;

    // Validate name.

    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid name"
      });
    }

    // Validate phone number.

    if (
      typeof phone !== "string" ||
      !/^[0-9]{10,15}$/.test(phone.trim())
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enter a valid phone number with 10 to 15 digits"
      });
    }

    // Validate address.

    if (
      address !== undefined &&
      address !== null &&
      (
        typeof address !== "string" ||
        address.trim().length > 2000
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid address"
      });
    }

    const normalizedName = name.trim();
    const normalizedPhone = phone.trim();

    // Update both tables using a transaction.

    const result = await sequelize.transaction(
      async (transaction) => {
        const user = await User.findByPk(
          req.user.id,
          {
            attributes: [
              "id",
              "name",
              "email",
              "phone",
              "role",
              "status"
            ],
            transaction,
            lock: transaction.LOCK.UPDATE
          }
        );

        if (
          !user ||
          user.role !== "customer" ||
          user.status !== "active"
        ) {
          return {
            status: 403,
            success: false,
            message: "Access denied"
          };
        }

        const customer = await Customer.findOne({
          where: {
            userId: user.id
          },
          attributes: [
            "id",
            "userId",
            "name",
            "phone",
            "address",
            "createdAt"
          ],
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (!customer) {
          return {
            status: 404,
            success: false,
            message: "Customer profile not found"
          };
        }

        // Update users table.

        await user.update(
          {
            name: normalizedName,
            phone: normalizedPhone
          },
          { transaction }
        );

        // Update customers table.

        const customerData = {
          name: normalizedName,
          phone: normalizedPhone
        };

        if (address !== undefined) {
          customerData.address =
            address === null
              ? null
              : address.trim() || null;
        }

        await customer.update(
          customerData,
          { transaction }
        );

        return {
          status: 200,
          success: true,
          message: "Profile updated successfully",
          profile: formatProfile(user, customer)
        };
      }
    );

    const { status, ...response } = result;

    return res.status(status).json(response);

  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: error.errors
          .map((item) => item.message)
          .join(", ")
      });
    }

    console.error("Update profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update profile"
    });
  }
};

// ==========================================
// CHANGE CUSTOMER PASSWORD
// ==========================================

exports.changePassword = async (req, res) => {
  try {
    const body = req.body;

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid password data"
      });
    }

    // Allow only password-related fields.

    const allowedFields = [
      "currentPassword",
      "newPassword",
      "confirmPassword"
    ];

    const invalidFields = Object.keys(body).filter(
      (field) => !allowedFields.includes(field)
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid password fields"
      });
    }

    const {
      currentPassword,
      newPassword,
      confirmPassword
    } = body;

    // Validate required fields.

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string" ||
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message: "All password fields are required"
      });
    }

    // Validate new password length.

    if (
      newPassword.length < 8 ||
      !newPassword.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "New password must contain at least 8 characters"
      });
    }

    // bcrypt supports a maximum of 72 bytes.

    if (Buffer.byteLength(newPassword, "utf8") > 72) {
      return res.status(400).json({
        success: false,
        message:
          "New password must not exceed 72 bytes"
      });
    }

    // Limit excessively large current password inputs.

    if (
      Buffer.byteLength(currentPassword, "utf8") > 4096
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid current password"
      });
    }

    // Validate confirmation password.

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New passwords do not match"
      });
    }

    // New password must be different.

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be different from current password"
      });
    }

    // Update both password records atomically.

    const result = await sequelize.transaction(
      async (transaction) => {

        // Find and lock the authenticated user.

        const user = await User.findByPk(
          req.user.id,
          {
            attributes: [
              "id",
              "password",
              "role",
              "status"
            ],
            transaction,
            lock: transaction.LOCK.UPDATE
          }
        );

        if (
          !user ||
          user.role !== "customer" ||
          user.status !== "active"
        ) {
          return {
            status: 403,
            success: false,
            message: "Access denied"
          };
        }

        // Verify current password.

        const isCurrentPasswordValid =
          await bcrypt.compare(
            currentPassword,
            user.password
          );

        if (!isCurrentPasswordValid) {
          return {
            status: 400,
            success: false,
            message: "Current password is incorrect"
          };
        }

        // Prevent reuse of the existing password.

        const isSamePassword =
          await bcrypt.compare(
            newPassword,
            user.password
          );

        if (isSamePassword) {
          return {
            status: 400,
            success: false,
            message:
              "New password must be different from current password"
          };
        }

        // Find linked customer account.

        const customer = await Customer.findOne({
          where: {
            userId: user.id
          },
          attributes: [
            "id",
            "userId"
          ],
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (!customer) {
          return {
            status: 404,
            success: false,
            message: "Customer profile not found"
          };
        }

        // Hash the new password.

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

        return {
          status: 200,
          success: true,
          message: "Password changed successfully"
        };
      }
    );

    const { status, ...response } = result;

    return res.status(status).json(response);

  } catch (error) {
    console.error(
      "Change password error:",
      error.name
    );

    return res.status(500).json({
      success: false,
      message: "Failed to change password"
    });
  }
};
