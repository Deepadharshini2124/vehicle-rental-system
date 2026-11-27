const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Location = require("./Location");

const Booking = sequelize.define(
  "Booking",
  {
    // ==========================================
    // PRIMARY KEY
    // ==========================================

    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    // ==========================================
    // CUSTOMER AND VEHICLE
    // ==========================================

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "customer_id",
    },

    vehicleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "vehicle_id",
    },

    // ==========================================
    // PICKUP LOCATION REFERENCE
    // ==========================================

    locationId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
      field: "location_id",

      references: {
        model: "locations",
        key: "id",
      },

      onUpdate: "CASCADE",
      onDelete: "RESTRICT",

      validate: {
        isInt: true,
        min: 1,
        max: 4294967295,
      },
    },

    // ==========================================
    // PICKUP LOCATION SNAPSHOT
    // ==========================================

    pickupLocationName: {
      type: DataTypes.STRING(150),
      allowNull: true,
      defaultValue: null,
      field: "pickup_location_name",

      validate: {
        notEmpty: true,
        len: [1, 150],
      },
    },

    pickupLocationCity: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
      field: "pickup_location_city",

      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },

    pickupLocationAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      field: "pickup_location_address",

      validate: {
        notEmpty: true,
        len: [1, 2000],
      },
    },

    // ==========================================
    // RENTAL DATES
    // ==========================================

    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "pickup_date",
    },

    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "return_date",
    },

    // ==========================================
    // RENTAL CALCULATION
    // ==========================================

    totalDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "total_days",

      validate: {
        min: 1,
      },
    },

    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: "total_amount",
    },

    // ==========================================
    // BOOKING STATUS
    // ==========================================

    status: {
      type: DataTypes.ENUM(
        "pending",
        "confirmed",
        "rejected",
        "completed",
        "cancelled",
        "in_progress"
      ),

      allowNull: true,
      defaultValue: "pending",
      field: "booking_status",
    },

    // ==========================================
    // CUSTOMER CONTACT DETAILS
    // ==========================================

    contactName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "contact_name",
    },

    contactPhone: {
      type: DataTypes.STRING(15),
      allowNull: false,
      field: "contact_phone",
    },

    contactEmail: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: "contact_email",
    },

    // ==========================================
    // TIMESTAMPS
    // ==========================================

    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
  },

  // ==========================================
  // MODEL CONFIGURATION
  // ==========================================

  {
    tableName: "bookings",
    timestamps: true,
    createdAt: "createdAt",
    updatedAt: false,
    freezeTableName: true,
  }
);

// ==========================================
// MODEL ASSOCIATIONS
// ==========================================

// Each booking belongs to one pickup location.
// Existing bookings may have no assigned location.

Booking.belongsTo(Location, {
  foreignKey: "locationId",
  as: "location",
  onUpdate: "CASCADE",
  onDelete: "RESTRICT",
});

// Each location can contain multiple bookings.

Location.hasMany(Booking, {
  foreignKey: "locationId",
  as: "bookings",
  onUpdate: "CASCADE",
  onDelete: "RESTRICT",
});

// ==========================================
// EXPORT MODEL
// ==========================================

module.exports = Booking;