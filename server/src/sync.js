
require("dotenv").config();

const sequelize = require("./config/database");

// ==========================================
// IMPORT MODELS
// ==========================================

require("./models/User");
require("./models/Location");
require("./models/Vehicle");
require("./models/Customer");
require("./models/Booking");
require("./models/PasswordReset");

const Setting = require("./models/Setting");

// ==========================================
// DATABASE SYNCHRONIZATION
// ==========================================

async function syncDatabase() {
  try {
    await sequelize.authenticate();

    console.log("MySQL connected successfully");

    // ==========================================
    // SYNCHRONIZE ALL REGISTERED MODELS
    // ==========================================

    await sequelize.sync({
      force: false,
      alter: false
    });

    console.log(
      "Database tables synchronized successfully"
    );

    // ==========================================
    // VERIFY LOCATION MIGRATION
    // ==========================================

    const queryInterface =
      sequelize.getQueryInterface();

    const vehicleColumns =
      await queryInterface.describeTable("vehicles");

    if (!vehicleColumns.location_id) {
      throw new Error(
        "location_id column is missing. Run node src/scripts/addVehicleLocations.js first."
      );
    }

    console.log(
      "Location table synchronized successfully"
    );

    console.log(
      "Vehicle location column verified successfully"
    );

    // ==========================================
    // DEFAULT BUSINESS SETTINGS
    // ==========================================

    const [settings, created] =
      await Setting.findOrCreate({
        where: {
          id: 1
        },

        defaults: {
          businessName: "Vehicle Rental System",
          minRentalDays: 1,
          maxRentalDays: 366,
          allowCancellation: true
        }
      });

    console.log(
      created
        ? "Default settings created successfully"
        : "Settings already exist"
    );

    console.log("Settings ID:", settings.id);

    console.log(
      "Password reset table synchronized successfully"
    );

    // ==========================================
    // SUCCESS MESSAGE
    // ==========================================

    console.log("======================================");

    console.log(
      "Database synchronization completed"
    );

    console.log("======================================");

  } catch (error) {

    console.error(
      "Database sync failed:",
      error.message
    );

    process.exitCode = 1;

  } finally {
    await sequelize.close();
  }
}

syncDatabase();
