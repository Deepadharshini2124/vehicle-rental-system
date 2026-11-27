
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Location = require("./Location");

const Vehicle = sequelize.define(
  "Vehicle",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },

    // ======================================
    // VEHICLE INFORMATION
    // ======================================

    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },

    type: {
      type: DataTypes.ENUM("car", "bike"),
      allowNull: false
    },

    brand: {
      type: DataTypes.STRING(100),
      allowNull: false
    },

    model: {
      type: DataTypes.STRING(100),
      allowNull: false
    },

    registrationNumber: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true
    },

    // ======================================
    // VEHICLE LOCATION
    // ======================================

    locationId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: "location_id",

      references: {
        model: "locations",
        key: "id"
      },

      onUpdate: "CASCADE",
      onDelete: "RESTRICT"
    },

    // ======================================
    // VEHICLE SPECIFICATIONS
    // ======================================

    fuelType: {
      type: DataTypes.ENUM(
        "petrol",
        "diesel",
        "electric",
        "cng"
      ),
      allowNull: false
    },

    transmission: {
      type: DataTypes.ENUM(
        "manual",
        "automatic"
      ),
      allowNull: true
    },

    seatingCapacity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    // ======================================
    // RENTAL INFORMATION
    // ======================================

    pricePerDay: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },

    status: {
      type: DataTypes.ENUM(
        "available",
        "rented",
        "maintenance",
        "inactive"
      ),
      defaultValue: "available"
    },

    // ======================================
    // ADDITIONAL INFORMATION
    // ======================================

    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    image: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  },
  {
    tableName: "vehicles",
    timestamps: true
  }
);

// ==========================================
// MODEL ASSOCIATIONS
// ==========================================

// Each vehicle belongs to one location

Vehicle.belongsTo(Location, {
  foreignKey: "locationId",
  as: "location",
  onUpdate: "CASCADE",
  onDelete: "RESTRICT"
});

// Each location can contain multiple vehicles

Location.hasMany(Vehicle, {
  foreignKey: "locationId",
  as: "vehicles",
  onUpdate: "CASCADE",
  onDelete: "RESTRICT"
});

module.exports = Vehicle;
