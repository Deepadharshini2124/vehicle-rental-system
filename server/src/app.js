
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const sequelize = require("./config/database");

// ==========================================
// IMPORT ROUTES
// ==========================================

const authRoutes = require("./routes/authRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const customerRoutes = require("./routes/customerRoutes");
const adminRoutes = require("./routes/adminRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const locationRoutes = require("./routes/locationRoutes");

const app = express();

// ==========================================
// CORS CONFIGURATION
// ==========================================

const allowedOrigins = [
  "http://localhost:3000", // Admin Panel
  "http://localhost:3001", // Customer Panel
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

// ==========================================
// GLOBAL MIDDLEWARE
// ==========================================

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

// ==========================================
// ROOT ROUTE
// ==========================================

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Welcome to Car & Bike Rental System API",
    version: "1.0.0",
  });
});

// ==========================================
// HEALTH CHECK API
// ==========================================

app.get("/api/health", async (req, res) => {
  try {
    await sequelize.authenticate();

    return res.status(200).json({
      success: true,
      message: "Vehicle Rental API is running",
      database: "connected",
    });

  } catch (error) {
    console.error(
      "Health Check Error:",
      error.message
    );

    return res.status(503).json({
      success: false,
      message: "Database connection unavailable",
      database: "disconnected",
    });
  }
});

// ==========================================
// API ROUTES
// ==========================================

// Authentication APIs
app.use("/api/auth", authRoutes);

// Vehicle Management APIs
app.use("/api/vehicles", vehicleRoutes);

// Booking Management APIs
app.use("/api/bookings", bookingRoutes);

// Customer Management APIs
app.use("/api/customers", customerRoutes);

// Admin Management APIs
app.use("/api/admin", adminRoutes);

// Public Business Settings APIs
app.use("/api/settings", settingsRoutes);

// Location Management APIs
app.use("/api/locations", locationRoutes);

// ==========================================
// 404 ROUTE HANDLER
// ==========================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  // Invalid JSON Request
  if (
    err instanceof SyntaxError &&
    err.status === 400 &&
    "body" in err
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body",
    });
  }

  // Request Body Too Large
  if (err.status === 413) {
    return res.status(413).json({
      success: false,
      message: "Request body is too large",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// ==========================================
// SERVER CONFIGURATION
// ==========================================

const PORT = Number(process.env.PORT) || 5000;

// ==========================================
// START SERVER
// ==========================================

async function startServer() {
  try {
    // Verify MySQL Connection
    await sequelize.authenticate();

    console.log("MySQL connected successfully");

    // Start Express Server
    const server = app.listen(PORT, () => {
      console.log(
        "======================================"
      );

      console.log("Car & Bike Rental System API");

      console.log(
        `Server: http://localhost:${PORT}`
      );

      console.log(
        `Health: http://localhost:${PORT}/api/health`
      );

      console.log(
        `Auth: http://localhost:${PORT}/api/auth`
      );

      console.log(
        `Vehicles: http://localhost:${PORT}/api/vehicles`
      );

      console.log(
        `Bookings: http://localhost:${PORT}/api/bookings`
      );

      console.log(
        `Customers: http://localhost:${PORT}/api/customers`
      );

      console.log(
        `Admin: http://localhost:${PORT}/api/admin`
      );

      console.log(
        `Dashboard: http://localhost:${PORT}/api/admin/dashboard`
      );

      console.log(
        `Admin Settings: http://localhost:${PORT}/api/admin/settings`
      );

      console.log(
        `Public Settings: http://localhost:${PORT}/api/settings/public`
      );

      // Location Management
      console.log(
        `Locations: http://localhost:${PORT}/api/locations`
      );

      console.log(
        `Public Locations: http://localhost:${PORT}/api/locations/public`
      );

      console.log(
        "======================================"
      );
    });

    server.on("error", (error) => {
      console.error(
        "Server startup error:",
        error.message
      );

      process.exit(1);
    });

  } catch (error) {
    console.error(
      "Database connection failed:",
      error.message
    );

    process.exit(1);
  }
}

startServer();

module.exports = app;
