
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PasswordReset = sequelize.define(
  "PasswordReset",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },

    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      unique: true,
      field: "user_id"
    },

    otpHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "otp_hash"
    },

    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expires_at"
    },

    attempts: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },

    lastSentAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "last_sent_at"
    },

    resetTokenHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "reset_token_hash"
    },

    resetTokenExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "reset_token_expires_at"
    },

    used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  },
  {
    tableName: "password_resets",
    timestamps: true,
    underscored: true
  }
);

module.exports = PasswordReset;
