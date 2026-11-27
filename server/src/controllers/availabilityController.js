
const { Op } = require("sequelize");

const Vehicle = require("../models/Vehicle");
const Booking = require("../models/Booking");
const Setting = require("../models/Setting");

// ==========================================
// CONSTANTS
// ==========================================

const ACTIVE_STATUSES = [
  "pending",
  "confirmed",
  "in_progress",
];

const MAX_RENTAL_DAYS = 366;
const DAY_MS = 86400000;

// ==========================================
// DATE VALIDATION
// ==========================================

const isValidDate = (value) => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = new Date(
    `${value}T00:00:00.000Z`
  );

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

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
// VALIDATE VEHICLE ID
// ==========================================

const isValidId = (id) => {
  return (
    /^[1-9]\d*$/.test(String(id)) &&
    Number.isSafeInteger(Number(id))
  );
};

// ==========================================
// CONVERT DATE TO TIMESTAMP
// ==========================================

const toTimestamp = (date) => {
  return Date.parse(`${date}T00:00:00Z`);
};

// ==========================================
// CHECK DATE OVERLAP
// Return date is exclusive
// ==========================================

const hasDateOverlap = (
  firstStart,
  firstEnd,
  secondStart,
  secondEnd
) => {
  return (
    firstStart < secondEnd &&
    firstEnd > secondStart
  );
};

// ==========================================
// GET ADMIN RENTAL SETTINGS
// ==========================================

const getRentalSettings = async () => {
  const settings = await Setting.findByPk(1, {
    attributes: [
      "minRentalDays",
      "maxRentalDays",
      "allowCancellation",
    ],
  });

  if (!settings) {
    return null;
  }

  const {
    minRentalDays,
    maxRentalDays,
    allowCancellation,
  } = settings;

  // Validate database configuration.

  if (
    !Number.isInteger(minRentalDays) ||
    !Number.isInteger(maxRentalDays) ||
    minRentalDays < 1 ||
    maxRentalDays > MAX_RENTAL_DAYS ||
    minRentalDays > maxRentalDays ||
    typeof allowCancellation !== "boolean"
  ) {
    return null;
  }

  return {
    minRentalDays,
    maxRentalDays,
    allowCancellation,
  };
};

// ==========================================
// GET VEHICLE AVAILABILITY
// GET /api/vehicles/:id/availability
// ==========================================

exports.getVehicleAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    res.set("Cache-Control", "no-store");

    // ======================================
    // VALIDATE VEHICLE ID
    // ======================================

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID",
      });
    }

    // ======================================
    // VALIDATE RENTAL DATES
    // ======================================

    if (
      !isValidDate(startDate) ||
      !isValidDate(endDate) ||
      startDate >= endDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid startDate and endDate are required",
      });
    }

    const startTime = toTimestamp(startDate);
    const endTime = toTimestamp(endDate);

    const totalDays =
      (endTime - startTime) / DAY_MS;

    // ======================================
    // VALIDATE HARD SYSTEM LIMIT
    // ======================================

    if (
      !Number.isInteger(totalDays) ||
      totalDays < 1 ||
      totalDays > MAX_RENTAL_DAYS
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Availability range must be between 1 and ${MAX_RENTAL_DAYS} days`,
      });
    }

    // ======================================
    // GET LATEST ADMIN SETTINGS
    // ======================================

    const settings = await getRentalSettings();

    if (!settings) {
      return res.status(503).json({
        success: false,
        message:
          "Rental settings are unavailable. Please contact support.",
      });
    }

    const {
      minRentalDays,
      maxRentalDays,
      allowCancellation,
    } = settings;

    // ======================================
    // VALIDATE MINIMUM RENTAL DAYS
    // ======================================

    if (totalDays < minRentalDays) {
      return res.status(400).json({
        success: false,
        message:
          `Minimum rental period is ${minRentalDays} day(s)`,

        rentalPolicy: {
          minRentalDays,
          maxRentalDays,
          allowCancellation,
        },
      });
    }

    // ======================================
    // VALIDATE MAXIMUM RENTAL DAYS
    // ======================================

    if (totalDays > maxRentalDays) {
      return res.status(400).json({
        success: false,
        message:
          `Maximum rental period is ${maxRentalDays} day(s)`,

        rentalPolicy: {
          minRentalDays,
          maxRentalDays,
          allowCancellation,
        },
      });
    }

    const today = getToday();

    // ======================================
    // GET VEHICLE DETAILS
    // ======================================

    const vehicle = await Vehicle.findByPk(
      Number(id)
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // ======================================
    // GET CURRENT ACTIVE RENTALS
    // ======================================

    const activeRentals = await Booking.findAll({
      where: {
        vehicleId: vehicle.id,
        status: "in_progress",
      },

      attributes: [
        "id",
        "startDate",
        "endDate",
        "status",
      ],

      order: [["startDate", "ASC"]],
    });

    // ======================================
    // VALIDATE RENTAL STATUS CONSISTENCY
    // ======================================

    const currentRental =
      activeRentals.length === 1
        ? activeRentals[0]
        : null;

    const invalidActiveRental =
      currentRental !== null &&
      (
        !isValidDate(currentRental.startDate) ||
        !isValidDate(currentRental.endDate) ||
        currentRental.startDate >=
          currentRental.endDate ||
        currentRental.startDate > today
      );

    const hasStatusConflict =
      activeRentals.length > 1 ||
      invalidActiveRental ||
      (
        vehicle.status === "rented" &&
        activeRentals.length !== 1
      ) ||
      (
        vehicle.status !== "rented" &&
        activeRentals.length > 0
      );

    // ======================================
    // CHECK OVERDUE RENTAL
    // ======================================

    const isOverdue =
      currentRental !== null &&
      !invalidActiveRental &&
      currentRental.endDate <= today;

    // ======================================
    // CHECK VEHICLE BOOKING ELIGIBILITY
    // ======================================

    let vehicleUnavailable = false;
    let unavailableReason = null;

    if (hasStatusConflict) {
      vehicleUnavailable = true;

      unavailableReason =
        "Vehicle rental status requires admin verification";

    } else if (vehicle.status === "maintenance") {
      vehicleUnavailable = true;

      unavailableReason =
        "Vehicle is currently under maintenance";

    } else if (vehicle.status === "inactive") {
      vehicleUnavailable = true;

      unavailableReason =
        "Vehicle is currently inactive";

    } else if (isOverdue) {
      vehicleUnavailable = true;

      unavailableReason =
        "Vehicle has an overdue rental";

    } else if (
      !["available", "rented"].includes(
        vehicle.status
      )
    ) {
      vehicleUnavailable = true;

      unavailableReason =
        "Vehicle is currently unavailable";
    }

    // ======================================
    // GET OVERLAPPING ACTIVE BOOKINGS
    // ======================================

    const bookings = await Booking.findAll({
      where: {
        vehicleId: vehicle.id,

        status: {
          [Op.in]: ACTIVE_STATUSES,
        },

        startDate: {
          [Op.lt]: endDate,
        },

        endDate: {
          [Op.gt]: startDate,
        },
      },

      attributes: [
        "id",
        "startDate",
        "endDate",
        "status",
      ],

      order: [["startDate", "ASC"]],
    });

    // ======================================
    // GENERATE BLOCKED DATES
    // ======================================

    const blockedDates = new Set();

    for (const booking of bookings) {
      if (
        !isValidDate(booking.startDate) ||
        !isValidDate(booking.endDate) ||
        booking.startDate >= booking.endDate
      ) {
        vehicleUnavailable = true;

        unavailableReason =
          "Vehicle booking dates require admin verification";

        continue;
      }

      if (
        !hasDateOverlap(
          booking.startDate,
          booking.endDate,
          startDate,
          endDate
        )
      ) {
        continue;
      }

      const rangeStart = Math.max(
        toTimestamp(booking.startDate),
        startTime
      );

      const rangeEnd = Math.min(
        toTimestamp(booking.endDate),
        endTime
      );

      for (
        let day = rangeStart;
        day < rangeEnd;
        day += DAY_MS
      ) {
        blockedDates.add(
          new Date(day)
            .toISOString()
            .slice(0, 10)
        );
      }
    }

    // ======================================
    // GENERATE AVAILABILITY CALENDAR
    // ======================================

    const calendar = [];

    for (
      let time = startTime;
      time < endTime;
      time += DAY_MS
    ) {
      const date = new Date(time)
        .toISOString()
        .slice(0, 10);

      const isPast = date < today;

      const isBlocked =
        blockedDates.has(date);

      // Block dates before the current
      // rental's scheduled return date.

      const isCurrentlyRented =
        vehicle.status === "rented" &&
        currentRental !== null &&
        date < currentRental.endDate;

      let status = "available";

      if (isPast) {
        status = "past";

      } else if (vehicleUnavailable) {
        status = "vehicle_unavailable";

      } else if (
        isBlocked ||
        isCurrentlyRented
      ) {
        status = "booked";
      }

      calendar.push({
        date,
        available: status === "available",
        status,
      });
    }

    // ======================================
    // CALCULATE OVERALL AVAILABILITY
    // ======================================

    const unavailableDates = calendar
      .filter((day) => !day.available)
      .map((day) => day.date);

    const available =
      unavailableDates.length === 0;

    let message =
      "Vehicle is available for your selected dates";

    if (!available) {
      if (vehicleUnavailable) {
        message =
          unavailableReason ||
          "Vehicle is currently unavailable";

      } else if (
        calendar.some(
          (day) => day.status === "past"
        )
      ) {
        message =
          "Selected dates cannot be in the past";

      } else {
        message =
          "Vehicle is unavailable for one or more selected dates";
      }
    }

    // ======================================
    // RETURN API RESPONSE
    // ======================================

    return res.status(200).json({
      success: true,

      available,

      message,

      // Vehicle details

      vehicle: {
        id: vehicle.id,
        name: vehicle.name,
        type: vehicle.type,
        pricePerDay: vehicle.pricePerDay,
        status: vehicle.status,
      },

      // Selected rental dates

      dateRange: {
        startDate,
        endDate,
      },

      // Dynamic admin booking policy

      bookingPolicy: {
        activeStatuses: ACTIVE_STATUSES,

        endDateExclusive: true,

        allowFutureBookingsWhileRented: true,

        minRentalDays,

        maxRentalDays,

        allowCancellation,
      },

      // Current rental information

      rentalInfo: {
        isCurrentlyRented:
          vehicle.status === "rented",

        isOverdue,

        hasStatusConflict,

        expectedReturnDate:
          currentRental &&
          !invalidActiveRental
            ? currentRental.endDate
            : null,

        unavailableReason,
      },

      // Rental duration

      totalDays,

      // Unavailable dates

      unavailableDates,

      // Existing booked ranges

      bookedRanges: bookings,

      // Date-wise availability

      calendar,
    });

  } catch (error) {
    console.error(
      "Vehicle availability error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch vehicle availability",
    });
  }
};
