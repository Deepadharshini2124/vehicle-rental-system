
const { Op } = require("sequelize");

const Customer = require("../models/Customer");
const Vehicle = require("../models/Vehicle");
const Booking = require("../models/Booking");

// ==========================================
// GET TODAY - INDIA TIMEZONE
// ==========================================

const getToday = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );

  return `${values.year}-${values.month}-${values.day}`;
};

// ==========================================
// NORMALIZE RENTAL AMOUNT
// ==========================================

const normalizeAmount = (amount) => {
  const value = Number(amount || 0);

  return Number.isFinite(value)
    ? Math.round(value * 100) / 100
    : 0;
};

// ==========================================
// ATTACH VEHICLE DETAILS TO BOOKINGS
// ==========================================

const attachVehicleDetails = async (bookings) => {
  if (!bookings.length) {
    return [];
  }

  const vehicleIds = [
    ...new Set(
      bookings.map((booking) => booking.vehicleId)
    ),
  ];

  const vehicles = await Vehicle.findAll({
    where: {
      id: {
        [Op.in]: vehicleIds,
      },
    },

    attributes: [
      "id",
      "name",
      "type",
      "brand",
      "model",
      "registrationNumber",
      "status",
    ],
  });

  const vehicleMap = new Map(
    vehicles.map((vehicle) => [
      vehicle.id,
      vehicle.toJSON(),
    ])
  );

  return bookings.map((booking) => ({
    ...booking.toJSON(),

    vehicle:
      vehicleMap.get(booking.vehicleId) || null,
  }));
};

// ==========================================
// ADMIN DASHBOARD STATISTICS
// GET /api/admin/dashboard
// ==========================================

exports.getDashboardStats = async (req, res) => {
  try {
    const today = getToday();

    // ======================================
    // VEHICLE STATISTICS
    // ======================================

    const [
      totalVehicles,
      availableVehicles,
      rentedVehicles,
      maintenanceVehicles,
      inactiveVehicles,
      totalCars,
      totalBikes,
    ] = await Promise.all([
      Vehicle.count(),

      Vehicle.count({
        where: {
          status: "available",
        },
      }),

      Vehicle.count({
        where: {
          status: "rented",
        },
      }),

      Vehicle.count({
        where: {
          status: "maintenance",
        },
      }),

      Vehicle.count({
        where: {
          status: "inactive",
        },
      }),

      Vehicle.count({
        where: {
          type: "car",
        },
      }),

      Vehicle.count({
        where: {
          type: "bike",
        },
      }),
    ]);

    // ======================================
    // CUSTOMER STATISTICS
    // ======================================

    const totalCustomers = await Customer.count();

    // ======================================
    // BOOKING STATISTICS
    // ======================================

    const [
      totalBookings,
      pendingBookings,
      confirmedBookings,
      inProgressBookings,
      completedBookings,
      cancelledBookings,
      rejectedBookings,
    ] = await Promise.all([
      Booking.count(),

      Booking.count({
        where: {
          status: "pending",
        },
      }),

      Booking.count({
        where: {
          status: "confirmed",
        },
      }),

      Booking.count({
        where: {
          status: "in_progress",
        },
      }),

      Booking.count({
        where: {
          status: "completed",
        },
      }),

      Booking.count({
        where: {
          status: "cancelled",
        },
      }),

      Booking.count({
        where: {
          status: "rejected",
        },
      }),
    ]);

    // ======================================
    // TODAY'S PICKUPS
    // Confirmed bookings waiting for pickup
    // ======================================

    const todayPickups = await Booking.findAll({
      where: {
        status: "confirmed",

        startDate: today,
      },

      order: [["id", "ASC"]],
    });

    // ======================================
    // TODAY'S RETURNS
    // Active rentals due for return today
    // ======================================

    const todayReturns = await Booking.findAll({
      where: {
        status: "in_progress",

        endDate: today,
      },

      order: [["id", "ASC"]],
    });

    // ======================================
    // OVERDUE RENTALS
    // Return date has already passed
    // ======================================

    const overdueRentals = await Booking.findAll({
      where: {
        status: "in_progress",

        endDate: {
          [Op.lt]: today,
        },
      },

      order: [
        ["endDate", "ASC"],
        ["id", "ASC"],
      ],
    });

    // ======================================
    // MISSED PICKUPS
    // Confirmed bookings not started
    // ======================================

    const missedPickups = await Booking.findAll({
      where: {
        status: "confirmed",

        startDate: {
          [Op.lt]: today,
        },
      },

      order: [
        ["startDate", "ASC"],
        ["id", "ASC"],
      ],
    });

    // ======================================
    // ACTIVE RENTALS
    // ======================================

    const activeRentals = await Booking.findAll({
      where: {
        status: "in_progress",
      },

      order: [
        ["endDate", "ASC"],
        ["id", "ASC"],
      ],
    });

    // ======================================
    // RENTAL VALUE
    // Not actual payment or collected revenue
    // ======================================

    const [
      pendingAmount,
      confirmedAmount,
      inProgressAmount,
      completedAmount,
    ] = await Promise.all([
      Booking.sum("totalAmount", {
        where: {
          status: "pending",
        },
      }),

      Booking.sum("totalAmount", {
        where: {
          status: "confirmed",
        },
      }),

      Booking.sum("totalAmount", {
        where: {
          status: "in_progress",
        },
      }),

      Booking.sum("totalAmount", {
        where: {
          status: "completed",
        },
      }),
    ]);

    // ======================================
    // RECENT BOOKINGS
    // ======================================

    const recentBookings = await Booking.findAll({
      attributes: [
        "id",
        "userId",
        "vehicleId",
        "startDate",
        "endDate",
        "totalDays",
        "totalAmount",
        "status",
        "contactName",
        "createdAt",
      ],

      order: [
        ["createdAt", "DESC"],
        ["id", "DESC"],
      ],

      limit: 5,
    });

    // ======================================
    // ATTACH VEHICLE INFORMATION
    // ======================================

    const [
      recentBookingDetails,
      todayPickupDetails,
      todayReturnDetails,
      overdueRentalDetails,
      missedPickupDetails,
      activeRentalDetails,
    ] = await Promise.all([
      attachVehicleDetails(recentBookings),

      attachVehicleDetails(todayPickups),

      attachVehicleDetails(todayReturns),

      attachVehicleDetails(overdueRentals),

      attachVehicleDetails(missedPickups),

      attachVehicleDetails(activeRentals),
    ]);

    // ======================================
    // CALCULATE TOTAL RENTAL VALUE
    // ======================================

    const rentalValue = {
      pending: normalizeAmount(pendingAmount),

      confirmed: normalizeAmount(confirmedAmount),

      in_progress: normalizeAmount(inProgressAmount),

      completed: normalizeAmount(completedAmount),

      total: normalizeAmount(
        normalizeAmount(confirmedAmount) +
          normalizeAmount(inProgressAmount) +
          normalizeAmount(completedAmount)
      ),
    };

    // ======================================
    // DASHBOARD RESPONSE
    // ======================================

    return res.status(200).json({
      success: true,

      message:
        "Dashboard statistics fetched successfully",

      dashboard: {
        date: today,

        // Vehicle statistics

        vehicles: {
          total: totalVehicles,

          available: availableVehicles,

          rented: rentedVehicles,

          maintenance: maintenanceVehicles,

          inactive: inactiveVehicles,

          cars: totalCars,

          bikes: totalBikes,
        },

        // Customer statistics

        customers: {
          total: totalCustomers,
        },

        // Booking statistics

        bookings: {
          total: totalBookings,

          pending: pendingBookings,

          confirmed: confirmedBookings,

          in_progress: inProgressBookings,

          completed: completedBookings,

          cancelled: cancelledBookings,

          rejected: rejectedBookings,
        },

        // Rental operations

        operations: {
          todayPickups: todayPickups.length,

          todayReturns: todayReturns.length,

          activeRentals: activeRentals.length,

          overdueRentals: overdueRentals.length,

          missedPickups: missedPickups.length,
        },

        // Rental amount statistics

        rentalValue,

        // Booking lists

        recentBookings: recentBookingDetails,

        todayPickups: todayPickupDetails,

        todayReturns: todayReturnDetails,

        activeRentals: activeRentalDetails,

        overdueRentals: overdueRentalDetails,

        missedPickups: missedPickupDetails,
      },
    });
  } catch (error) {
    console.error(
      "Dashboard statistics error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch dashboard statistics",
    });
  }
};
