const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Setting = sequelize.define(
  "Setting",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      defaultValue: 1,
      validate: {
        isIn: [[1]]
      }
    },

    businessName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      defaultValue: "Vehicle Rental System",
      field: "business_name"
    },

    businessEmail: {
      type: DataTypes.STRING(150),
      allowNull: true,
      validate: {
        isEmail: true
      },
      field: "business_email"
    },

    businessPhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "business_phone"
    },

    businessAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "business_address"
    },

    minRentalDays: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 366
      },
      field: "min_rental_days"
    },

    maxRentalDays: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 366,
      validate: {
        min: 1,
        max: 366
      },
      field: "max_rental_days"
    },

    allowCancellation: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "allow_cancellation"
    },

    termsAndConditions: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "terms_and_conditions"
    }
  },
  {
    tableName: "settings",
    timestamps: true,
    underscored: true,

    validate: {
      validRentalDuration() {
        if (this.minRentalDays > this.maxRentalDays) {
          throw new Error(
            "Minimum rental days cannot exceed maximum rental days"
          );
        }
      }
    }
  }
);

module.exports = Setting;