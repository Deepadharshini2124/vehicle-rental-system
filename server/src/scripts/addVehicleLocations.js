
require("dotenv").config();

const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Location = require("../models/Location");

// ==========================================
// LOCATION DATABASE MIGRATION
// ==========================================

async function migrateVehicleLocations() {
  try {
    await sequelize.authenticate();

    console.log("MySQL connected successfully");

    const queryInterface = sequelize.getQueryInterface();

    // ==========================================
    // CHECK EXISTING VEHICLES TABLE
    // ==========================================

    const vehicleColumns =
      await queryInterface.describeTable("vehicles");

    // ==========================================
    // CREATE LOCATIONS TABLE
    // ==========================================

    await Location.sync();

    console.log("Locations table ready");

    // ==========================================
    // ADD LOCATION ID COLUMN
    // ==========================================

    if (!vehicleColumns.location_id) {
      await queryInterface.addColumn(
        "vehicles",
        "location_id",
        {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: true,
          defaultValue: null
        }
      );

      console.log(
        "location_id column added successfully"
      );

    } else {
      console.log(
        "location_id column already exists"
      );
    }

    // ==========================================
    // CHECK EXISTING FOREIGN KEYS
    // ==========================================

    const [foreignKeys] = await sequelize.query(`
      SELECT
        CONSTRAINT_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'vehicles'
        AND COLUMN_NAME = 'location_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    const existingForeignKey = foreignKeys.find(
      (key) =>
        key.REFERENCED_TABLE_NAME === "locations" &&
        key.REFERENCED_COLUMN_NAME === "id"
    );

    // ==========================================
    // ADD FOREIGN KEY CONSTRAINT
    // ==========================================

    if (!existingForeignKey) {

      if (foreignKeys.length > 0) {
        throw new Error(
          "location_id already has an unexpected foreign key"
        );
      }

      await queryInterface.addConstraint(
        "vehicles",
        {
          fields: ["location_id"],
          type: "foreign key",
          name: "fk_vehicles_location_id",

          references: {
            table: "locations",
            field: "id"
          },

          onUpdate: "CASCADE",
          onDelete: "RESTRICT"
        }
      );

      console.log(
        "Location foreign key added successfully"
      );

    } else {
      console.log(
        "Location foreign key already exists"
      );
    }

    // ==========================================
    // MIGRATION SUMMARY
    // ==========================================

    const [summary] = await sequelize.query(`
      SELECT
        COUNT(*) AS totalVehicles,
        COUNT(location_id) AS assignedVehicles,
        COUNT(*) - COUNT(location_id)
          AS unassignedVehicles
      FROM vehicles
    `);

    console.log("======================================");
    console.log("Location migration completed");
    console.table(summary);
    console.log("======================================");

  } catch (error) {

    console.error(
      "Location migration failed:",
      error.message
    );

    process.exitCode = 1;

  } finally {
    await sequelize.close();
  }
}

migrateVehicleLocations();
