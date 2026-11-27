const { Op, ValidationError } = require("sequelize");

const sequelize = require("../config/database");

const Booking = require("../models/Booking");
const Customer = require("../models/Customer");
const Vehicle = require("../models/Vehicle");
const Setting = require("../models/Setting");
const Location = require("../models/Location");

// ==========================================
// BOOKING CONFIGURATION
// ==========================================

const ACTIVE_STATUSES = [
  "pending",
  "confirmed",
  "in_progress",
];

const MAX_RENTAL_DAYS = 366;
const MAX_UNSIGNED_ID = 4294967295;
const DAY_MS = 86400000;

const STATUS_TRANSITIONS = {
  pending: ["confirmed", "rejected"],
  confirmed: ["in_progress"],
  in_progress: ["completed"],
  rejected: [],
  completed: [],
  cancelled: [],
};

const LOCATION_ATTRIBUTES = [
  "id",
  "name",
  "city",
  "address",
  "status",
];

// ==========================================
// HELPER FUNCTIONS
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

const getTotalDays = (startDate, endDate) => {
  const start = Date.parse(
    `${startDate}T00:00:00.000Z`
  );

  const end = Date.parse(
    `${endDate}T00:00:00.000Z`
  );

  return (end - start) / DAY_MS;
};

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

const isValidBookingId = (id) => {
  if (
    typeof id !== "number" &&
    typeof id !== "string"
  ) {
    return false;
  }

  return (
    /^[1-9]\d*$/.test(String(id)) &&
    Number.isSafeInteger(Number(id)) &&
    Number(id) <= MAX_UNSIGNED_ID
  );
};

const isValidLocationId = (id) => {
  return isValidBookingId(id);
};

// ==========================================
// CUSTOM API ERROR
// ==========================================

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);

    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

// ==========================================
// COMMON ERROR HANDLER
// ==========================================

const handleError = (
  res,
  error,
  logMessage,
  fallbackMessage
) => {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  if (error instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      message: "Booking validation failed",

      errors: error.errors.map((item) => ({
        field: item.path,
        message: item.message,
      })),
    });
  }

  const databaseErrorCode =
    error.original?.code ||
    error.parent?.code;

  if (
    [
      "ER_LOCK_DEADLOCK",
      "ER_LOCK_WAIT_TIMEOUT",
    ].includes(databaseErrorCode)
  ) {
    return res.status(409).json({
      success: false,
      message:
        "Another operation is updating this booking or vehicle. Please retry.",
    });
  }

  console.error(logMessage, error);

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
};

// ==========================================
// GET ADMIN RENTAL SETTINGS
// ==========================================

const getRentalSettings = async (transaction) => {
  const settings = await Setting.findByPk(1, {
    attributes: [
      "minRentalDays",
      "maxRentalDays",
      "allowCancellation",
    ],

    transaction,

    lock: transaction.LOCK.SHARE,
  });

  if (!settings) {
    throw new ApiError(
      503,
      "Rental settings are unavailable. Please contact support."
    );
  }

  const minRentalDays = settings.minRentalDays;
  const maxRentalDays = settings.maxRentalDays;
  const allowCancellation = settings.allowCancellation;

  if (
    !Number.isInteger(minRentalDays) ||
    !Number.isInteger(maxRentalDays) ||
    minRentalDays < 1 ||
    maxRentalDays > MAX_RENTAL_DAYS ||
    minRentalDays > maxRentalDays ||
    typeof allowCancellation !== "boolean"
  ) {
    throw new ApiError(
      503,
      "Rental settings require admin verification"
    );
  }

  return {
    minRentalDays,
    maxRentalDays,
    allowCancellation,
  };
};

// ==========================================
// VALIDATE ADMIN RENTAL DURATION
// ==========================================

const validateRentalDuration = (
  totalDays,
  settings
) => {
  if (
    !Number.isInteger(totalDays) ||
    totalDays < 1 ||
    totalDays > MAX_RENTAL_DAYS
  ) {
    throw new ApiError(
      400,
      "Invalid rental duration"
    );
  }

  if (totalDays < settings.minRentalDays) {
    throw new ApiError(
      400,
      `Minimum rental period is ${settings.minRentalDays} day(s)`
    );
  }

  if (totalDays > settings.maxRentalDays) {
    throw new ApiError(
      400,
      `Maximum rental period is ${settings.maxRentalDays} day(s)`
    );
  }
};

// ==========================================
// VALIDATE CANCELLATION POLICY
// ==========================================

const validateCancellationPolicy = (settings) => {
  if (settings.allowCancellation !== true) {
    throw new ApiError(
      403,
      "Booking cancellation is currently disabled. Please contact support."
    );
  }
};

// ==========================================
// GET CUSTOMER PROFILE
// ==========================================

const getCustomerProfile = async (userId) => {
  const customer = await Customer.findOne({
    where: {
      userId,
    },
  });

  if (!customer) {
    throw new ApiError(
      403,
      "Customer profile is not linked. Please contact support."
    );
  }

  return customer;
};

// ==========================================
// LOCK PICKUP LOCATION
// ==========================================

const lockLocation = async (
  locationId,
  transaction
) => {
  if (!isValidLocationId(locationId)) {
    throw new ApiError(
      400,
      "Valid pickup location ID is required"
    );
  }

  const location = await Location.findByPk(
    Number(locationId),
    {
      transaction,

      lock: transaction.LOCK.UPDATE,
    }
  );

  if (!location) {
    throw new ApiError(
      404,
      "Pickup location not found"
    );
  }

  return location;
};

// ==========================================
// VALIDATE ACTIVE PICKUP LOCATION
// ==========================================

const validateActiveLocation = (location) => {
  if (!location) {
    throw new ApiError(
      404,
      "Pickup location not found"
    );
  }

  if (location.status !== "active") {
    throw new ApiError(
      409,
      "Selected pickup location is currently inactive"
    );
  }
};

// ==========================================
// LOCK VEHICLE
// ==========================================

const lockVehicle = async (
  vehicleId,
  transaction
) => {
  const vehicle = await Vehicle.findByPk(
    Number(vehicleId),
    {
      transaction,

      lock: transaction.LOCK.UPDATE,
    }
  );

  if (!vehicle) {
    throw new ApiError(
      404,
      "Vehicle not found"
    );
  }

  return vehicle;
};

// ==========================================
// VALIDATE VEHICLE PICKUP LOCATION
// ==========================================

const validateVehicleLocation = (
  vehicle,
  location
) => {
  validateActiveLocation(location);

  if (
    vehicle.locationId == null ||
    !isValidLocationId(vehicle.locationId)
  ) {
    throw new ApiError(
      409,
      "Vehicle has no assigned pickup location. Please contact support."
    );
  }

  if (
    Number(vehicle.locationId) !==
    Number(location.id)
  ) {
    throw new ApiError(
      409,
      "Vehicle is not assigned to the selected pickup location"
    );
  }
};

// ==========================================
// CREATE PICKUP LOCATION SNAPSHOT
// ==========================================

const createLocationSnapshot = (location) => {
  validateActiveLocation(location);

  const name =
    typeof location.name === "string"
      ? location.name.trim()
      : "";

  const city =
    typeof location.city === "string"
      ? location.city.trim()
      : "";

  const address =
    typeof location.address === "string"
      ? location.address.trim()
      : "";

  if (
    !name ||
    name.length > 150 ||
    !city ||
    city.length > 100 ||
    !address ||
    address.length > 2000
  ) {
    throw new ApiError(
      409,
      "Pickup location details require admin verification"
    );
  }

  return {
    locationId: Number(location.id),
    pickupLocationName: name,
    pickupLocationCity: city,
    pickupLocationAddress: address,
  };
};

// ==========================================
// GET BOOKING PICKUP LOCATION
// Historical snapshot is the source of truth.
// ==========================================

const getBookingPickupLocation = (booking) => {
  const hasCompleteSnapshot =
    isValidLocationId(booking.locationId) &&
    typeof booking.pickupLocationName === "string" &&
    booking.pickupLocationName.trim() !== "" &&
    typeof booking.pickupLocationCity === "string" &&
    booking.pickupLocationCity.trim() !== "" &&
    typeof booking.pickupLocationAddress === "string" &&
    booking.pickupLocationAddress.trim() !== "";

  if (!hasCompleteSnapshot) {
    return null;
  }

  return {
    id: Number(booking.locationId),
    name: booking.pickupLocationName,
    city: booking.pickupLocationCity,
    address: booking.pickupLocationAddress,
  };
};

// ==========================================
// FORMAT BOOKING RESPONSE
// ==========================================

const formatBookingResponse = (booking) => {
  const data =
    typeof booking.toJSON === "function"
      ? booking.toJSON()
      : booking;

  return {
    ...data,

    pickupLocation:
      getBookingPickupLocation(data),
  };
};

// ==========================================
// VALIDATE EXISTING BOOKING LOCATION
// ==========================================

const validateExistingBookingLocation = ({
  booking,
  vehicle,
  location,
}) => {
  // Legacy bookings were created before
  // pickup location integration.
  // Preserve their existing lifecycle.

  const isLegacyBooking =
    booking.locationId == null &&
    booking.pickupLocationName == null &&
    booking.pickupLocationCity == null &&
    booking.pickupLocationAddress == null;

  if (isLegacyBooking) {
    return;
  }

  // Do not treat incomplete new booking
  // location records as legacy bookings.

  if (!getBookingPickupLocation(booking)) {
    throw new ApiError(
      409,
      "Booking pickup location details require admin verification"
    );
  }

  if (
    !location ||
    Number(location.id) !==
      Number(booking.locationId)
  ) {
    throw new ApiError(
      409,
      "Booking pickup location could not be verified"
    );
  }

  validateVehicleLocation(vehicle, location);
};

// ==========================================
// GET ACTIVE RENTALS
// ==========================================

const getActiveRentals = async (
  vehicleId,
  transaction
) => {
  return Booking.findAll({
    where: {
      vehicleId,
      status: "in_progress",
    },

    order: [["id", "ASC"]],

    transaction,

    lock: transaction.LOCK.UPDATE,
  });
};

// ==========================================
// VALIDATE VEHICLE RENTAL CONSISTENCY
// ==========================================

const validateRentalConsistency = (
  vehicle,
  activeRentals,
  today
) => {
  if (activeRentals.length > 1) {
    throw new ApiError(
      409,
      "Vehicle has multiple active rentals. Please contact admin."
    );
  }

  const currentRental =
    activeRentals.length === 1
      ? activeRentals[0]
      : null;

  if (
    vehicle.status === "rented" &&
    !currentRental
  ) {
    throw new ApiError(
      409,
      "Vehicle rental status requires admin verification"
    );
  }

  if (
    vehicle.status !== "rented" &&
    currentRental
  ) {
    throw new ApiError(
      409,
      "Vehicle status conflicts with an active rental"
    );
  }

  if (
    currentRental &&
    (
      !isValidDate(currentRental.startDate) ||
      !isValidDate(currentRental.endDate) ||
      currentRental.startDate >=
        currentRental.endDate ||
      currentRental.startDate > today
    )
  ) {
    throw new ApiError(
      409,
      "Active rental dates require admin verification"
    );
  }

  return currentRental;
};

// ==========================================
// CHECK OVERLAPPING BOOKINGS
// Return date is exclusive.
// ==========================================

const findOverlappingBooking = async ({
  vehicleId,
  startDate,
  endDate,
  excludeBookingId,
  transaction,
  statuses = ACTIVE_STATUSES,
}) => {
  const where = {
    vehicleId,

    status: {
      [Op.in]: statuses,
    },

    startDate: {
      [Op.lt]: endDate,
    },

    endDate: {
      [Op.gt]: startDate,
    },
  };

  if (excludeBookingId != null) {
    where.id = {
      [Op.ne]: excludeBookingId,
    };
  }

  return Booking.findOne({
    where,

    transaction,

    lock: transaction.LOCK.UPDATE,
  });
};

// ==========================================
// VALIDATE VEHICLE BOOKING ELIGIBILITY
// ==========================================

const validateVehicleAvailability = async ({
  vehicle,
  startDate,
  endDate,
  excludeBookingId,
  transaction,
}) => {
  const today = getToday();

  if (
    !isValidDate(startDate) ||
    !isValidDate(endDate) ||
    startDate < today ||
    startDate >= endDate
  ) {
    throw new ApiError(
      409,
      "Booking dates are no longer valid"
    );
  }

  const activeRentals = await getActiveRentals(
    vehicle.id,
    transaction
  );

  const currentRental =
    validateRentalConsistency(
      vehicle,
      activeRentals,
      today
    );

  // Maintenance vehicles cannot accept bookings.

  if (vehicle.status === "maintenance") {
    throw new ApiError(
      409,
      "Vehicle is currently under maintenance"
    );
  }

  // Inactive vehicles cannot accept bookings.

  if (vehicle.status === "inactive") {
    throw new ApiError(
      409,
      "Vehicle is currently inactive"
    );
  }

  if (
    !["available", "rented"].includes(
      vehicle.status
    )
  ) {
    throw new ApiError(
      409,
      "Vehicle is currently unavailable"
    );
  }

  // Allow future bookings for rented vehicles
  // after their expected return date.

  if (currentRental) {
    const isOverdue =
      currentRental.endDate <= today;

    if (isOverdue) {
      throw new ApiError(
        409,
        "Vehicle has an overdue rental. New bookings are temporarily unavailable."
      );
    }

    if (startDate < currentRental.endDate) {
      throw new ApiError(
        409,
        `Vehicle is currently rented. Select a pickup date on or after ${currentRental.endDate}`
      );
    }
  }

  // Check pending, confirmed and
  // in-progress bookings.

  const overlappingBooking =
    await findOverlappingBooking({
      vehicleId: vehicle.id,
      startDate,
      endDate,
      excludeBookingId,
      transaction,
    });

  if (overlappingBooking) {
    throw new ApiError(
      409,
      "Vehicle is already booked for the selected dates"
    );
  }

  return true;
};

// ==========================================
// CREATE BOOKING - CUSTOMER
// POST /api/bookings
// ==========================================

exports.createBooking = async (req, res) => {
  const {
    vehicleId,
    locationId,
    startDate,
    endDate,
    contactName,
    contactPhone,
    contactEmail,
  } = req.body || {};

  // Validate vehicle and dates.

  if (
    !isValidBookingId(vehicleId) ||
    !isValidDate(startDate) ||
    !isValidDate(endDate)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Valid vehicle ID and dates are required",
    });
  }

  // Pickup location is mandatory
  // for all new bookings.

  if (!isValidLocationId(locationId)) {
    return res.status(400).json({
      success: false,
      message:
        "Valid pickup location ID is required",
    });
  }

  if (
    startDate < getToday() ||
    startDate >= endDate
  ) {
    return res.status(400).json({
      success: false,
      message: "Select valid booking dates",
    });
  }

  const totalDays = getTotalDays(
    startDate,
    endDate
  );

  // Hard system limit.

  if (
    !Number.isInteger(totalDays) ||
    totalDays < 1 ||
    totalDays > MAX_RENTAL_DAYS
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid rental duration",
    });
  }

  // Validate contact details.

  if (
    typeof contactName !== "string" ||
    !contactName.trim() ||
    contactName.trim().length > 100 ||

    typeof contactPhone !== "string" ||
    !/^[0-9]{10,15}$/.test(
      contactPhone.trim()
    ) ||

    (
      contactEmail != null &&
      (
        typeof contactEmail !== "string" ||
        contactEmail.trim().length > 150 ||
        (
          contactEmail.trim() !== "" &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            contactEmail.trim()
          )
        )
      )
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "Valid contact details are required",
    });
  }

  try {
    const customer =
      await getCustomerProfile(req.user.id);

    const booking = await sequelize.transaction(
      async (transaction) => {
        // Lock order:
        // Location -> Vehicle -> Settings -> Bookings

        const location = await lockLocation(
          locationId,
          transaction
        );

        validateActiveLocation(location);

        const vehicle = await lockVehicle(
          vehicleId,
          transaction
        );

        // Verify selected vehicle belongs
        // to the selected pickup location.

        validateVehicleLocation(
          vehicle,
          location
        );

        // Fetch latest admin rental settings.

        const settings =
          await getRentalSettings(transaction);

        validateRentalDuration(
          totalDays,
          settings
        );

        // Validate date-wise availability.

        await validateVehicleAvailability({
          vehicle,
          startDate,
          endDate,
          transaction,
        });

        // Validate rental price.

        const pricePerDay = Number(
          vehicle.pricePerDay
        );

        if (
          !Number.isFinite(pricePerDay) ||
          pricePerDay <= 0
        ) {
          throw new ApiError(
            409,
            "Vehicle rental price is invalid"
          );
        }

        const totalAmount =
          Math.round(
            pricePerDay * totalDays * 100
          ) / 100;

        // DECIMAL(10, 2) maximum value.

        if (
          !Number.isFinite(totalAmount) ||
          totalAmount <= 0 ||
          totalAmount > 99999999.99
        ) {
          throw new ApiError(
            400,
            "Total rental amount exceeds the allowed limit"
          );
        }

        // Generate pickup location snapshot
        // from trusted database values.
        //
        // Never trust customer-provided
        // location name, city or address.

        const locationSnapshot =
          createLocationSnapshot(location);

        // Create pending booking.
        // No online payment required.
        // Vehicle status remains unchanged.

        return Booking.create(
          {
            userId: customer.id,
            vehicleId: vehicle.id,

            ...locationSnapshot,

            startDate,
            endDate,
            totalDays,
            totalAmount,

            status: "pending",

            contactName:
              contactName.trim(),

            contactPhone:
              contactPhone.trim(),

            contactEmail:
              contactEmail?.trim()
                ? contactEmail.trim().toLowerCase()
                : null,
          },
          {
            transaction,
          }
        );
      }
    );

    return res.status(201).json({
      success: true,
      message:
        "Booking request submitted successfully",

      booking: formatBookingResponse(booking),
    });

  } catch (error) {
    return handleError(
      res,
      error,
      "Create booking error:",
      "Failed to create booking"
    );
  }
};

// ==========================================
// GET MY BOOKINGS - CUSTOMER
// GET /api/bookings/my
// ==========================================

exports.getMyBookings = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      where: {
        userId: req.user.id,
      },
    });

    if (!customer) {
      return res.json({
        success: true,
        count: 0,
        bookings: [],
      });
    }

    const bookings = await Booking.findAll({
      where: {
        userId: customer.id,
      },

      order: [
        ["createdAt", "DESC"],
        ["id", "DESC"],
      ],
    });

    // Get unique vehicle IDs.

    const vehicleIds = [
      ...new Set(
        bookings.map(
          (booking) => booking.vehicleId
        )
      ),
    ];

    // Fetch vehicle details and current
    // vehicle location in a single query.

    const vehicles =
      vehicleIds.length > 0
        ? await Vehicle.findAll({
            where: {
              id: {
                [Op.in]: vehicleIds,
              },
            },

            include: [
              {
                model: Location,
                as: "location",
                attributes: LOCATION_ATTRIBUTES,
                required: false,
              },
            ],
          })
        : [];

    const vehicleMap = new Map(
      vehicles.map((vehicle) => [
        Number(vehicle.id),
        vehicle.toJSON(),
      ])
    );

    const bookingList = bookings.map(
      (booking) => ({
        ...formatBookingResponse(booking),

        vehicle:
          vehicleMap.get(
            Number(booking.vehicleId)
          ) || null,
      })
    );

    return res.json({
      success: true,
      count: bookingList.length,
      bookings: bookingList,
    });

  } catch (error) {
    return handleError(
      res,
      error,
      "Get my bookings error:",
      "Failed to fetch bookings"
    );
  }
};

// ==========================================
// GET ALL BOOKINGS - ADMIN
// GET /api/bookings
// ==========================================

exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      order: [
        ["createdAt", "DESC"],
        ["id", "DESC"],
      ],
    });

    const bookingList = bookings.map(
      formatBookingResponse
    );

    return res.json({
      success: true,
      count: bookingList.length,
      bookings: bookingList,
    });

  } catch (error) {
    return handleError(
      res,
      error,
      "Get all bookings error:",
      "Failed to fetch bookings"
    );
  }
};

// ==========================================
// GET BOOKING DETAILS - ADMIN
// GET /api/bookings/:id
// ==========================================

exports.getBookingById = async (req, res) => {
  try {
    if (!isValidBookingId(req.params.id)) {
      throw new ApiError(
        400,
        "Invalid booking ID"
      );
    }

    const booking = await Booking.findByPk(
      Number(req.params.id)
    );

    if (!booking) {
      throw new ApiError(
        404,
        "Booking not found"
      );
    }

    return res.json({
      success: true,

      booking: formatBookingResponse(booking),
    });

  } catch (error) {
    return handleError(
      res,
      error,
      "Get booking error:",
      "Failed to fetch booking"
    );
  }
};

// ==========================================
// UPDATE BOOKING STATUS - ADMIN
// PATCH /api/bookings/:id/status
// ==========================================

exports.updateBookingStatus = async (
  req,
  res
) => {
  const { status } = req.body || {};

  if (!isValidBookingId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid booking ID",
    });
  }

  const allowedStatuses = [
    "confirmed",
    "rejected",
    "in_progress",
    "completed",
  ];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid booking status",
    });
  }

  try {
    const bookingId = Number(req.params.id);

    // Find vehicle and location IDs
    // before opening transaction.

    const bookingInfo =
      await Booking.findByPk(bookingId);

    if (!bookingInfo) {
      throw new ApiError(
        404,
        "Booking not found"
      );
    }

    const result = await sequelize.transaction(
      async (transaction) => {
        let location = null;

        const requiresLocationValidation =
          status === "confirmed" ||
          status === "in_progress";

        // Lock location before vehicle
        // when confirming or starting rentals.
        //
        // Legacy bookings have null locationId.
        //
        // Rejection and completion must remain
        // possible even if location is inactive.

        if (
          requiresLocationValidation &&
          bookingInfo.locationId != null
        ) {
          location = await lockLocation(
            bookingInfo.locationId,
            transaction
          );
        }

        // Lock vehicle before booking.

        const vehicle = await lockVehicle(
          bookingInfo.vehicleId,
          transaction
        );

        const booking = await Booking.findByPk(
          bookingId,
          {
            transaction,

            lock: transaction.LOCK.UPDATE,
          }
        );

        if (!booking) {
          throw new ApiError(
            404,
            "Booking not found"
          );
        }

        if (
          Number(booking.vehicleId) !==
          Number(vehicle.id)
        ) {
          throw new ApiError(
            409,
            "Booking vehicle has changed. Please retry."
          );
        }

        // Verify booking location was not
        // changed before acquiring locks.

        if (
          Number(booking.locationId ?? 0) !==
          Number(bookingInfo.locationId ?? 0)
        ) {
          throw new ApiError(
            409,
            "Booking pickup location has changed. Please retry."
          );
        }

        // Validate booking status transition.

        if (
          !STATUS_TRANSITIONS[
            booking.status
          ]?.includes(status)
        ) {
          throw new ApiError(
            409,
            `Cannot change booking from ${booking.status} to ${status}`
          );
        }

        // Verify pickup location for
        // location-based bookings.

        if (requiresLocationValidation) {
          validateExistingBookingLocation({
            booking,
            vehicle,
            location,
          });
        }

        const today = getToday();

        // ==================================
        // CONFIRM BOOKING
        // Pending -> Confirmed
        // ==================================

        if (status === "confirmed") {
          if (booking.startDate < today) {
            throw new ApiError(
              409,
              "Booking pickup date has already passed"
            );
          }

          const totalDays = getTotalDays(
            booking.startDate,
            booking.endDate
          );

          if (
            !isValidDate(booking.startDate) ||
            !isValidDate(booking.endDate) ||
            !Number.isInteger(totalDays) ||
            totalDays < 1 ||
            totalDays > MAX_RENTAL_DAYS
          ) {
            throw new ApiError(
              409,
              "Booking dates are invalid"
            );
          }

          // Existing bookings are not affected
          // by new admin rental duration settings.

          await validateVehicleAvailability({
            vehicle,

            startDate:
              booking.startDate,

            endDate:
              booking.endDate,

            excludeBookingId:
              booking.id,

            transaction,
          });

          // Confirmation only reserves dates.
          // Vehicle status remains unchanged.
        }

        // ==================================
        // REJECT BOOKING
        // Pending -> Rejected
        // ==================================

        if (status === "rejected") {
          // Rejection releases reserved dates.
          // Vehicle status remains unchanged.
          // Pickup snapshot remains unchanged.
        }

        // ==================================
        // START RENTAL
        // Confirmed -> In Progress
        // ==================================

        if (status === "in_progress") {
          if (
            !isValidDate(booking.startDate) ||
            !isValidDate(booking.endDate) ||
            today < booking.startDate ||
            today >= booking.endDate
          ) {
            throw new ApiError(
              409,
              "Rental can only start within the booking period"
            );
          }

          const activeRentals =
            await getActiveRentals(
              vehicle.id,
              transaction
            );

          validateRentalConsistency(
            vehicle,
            activeRentals,
            today
          );

          // Vehicle must be physically available.

          if (vehicle.status !== "available") {
            throw new ApiError(
              409,
              "Vehicle is not available for pickup"
            );
          }

          if (activeRentals.length > 0) {
            throw new ApiError(
              409,
              "Vehicle already has an active rental"
            );
          }

          // Check conflicting confirmed bookings.

          const conflictingBooking =
            await findOverlappingBooking({
              vehicleId: vehicle.id,

              startDate: today,

              endDate:
                booking.endDate,

              excludeBookingId:
                booking.id,

              statuses: ["confirmed"],

              transaction,
            });

          if (conflictingBooking) {
            throw new ApiError(
              409,
              "Rental conflicts with another confirmed booking"
            );
          }

          // Vehicle physically handed over.

          vehicle.status = "rented";

          await vehicle.save({
            transaction,
          });
        }

        // ==================================
        // COMPLETE RENTAL
        // In Progress -> Completed
        // ==================================

        if (status === "completed") {
          if (vehicle.status !== "rented") {
            throw new ApiError(
              409,
              "Vehicle is not currently marked as rented"
            );
          }

          const activeRentals =
            await getActiveRentals(
              vehicle.id,
              transaction
            );

          if (
            activeRentals.length !== 1 ||
            Number(activeRentals[0].id) !==
              Number(booking.id)
          ) {
            throw new ApiError(
              409,
              "Vehicle rental status requires admin verification"
            );
          }

          // Allow completion of overdue rentals.
          // Vehicle must be physically returned.
          //
          // Do not block completion because
          // of pickup location status.

          vehicle.status = "available";

          await vehicle.save({
            transaction,
          });
        }

        // ==================================
        // SAVE BOOKING STATUS
        // ==================================

        booking.status = status;

        await booking.save({
          transaction,
        });

        // Never overwrite the original
        // booking pickup location snapshot.

        return {
          booking: formatBookingResponse(booking),

          vehicle: {
            id: vehicle.id,
            name: vehicle.name,
            status: vehicle.status,
          },
        };
      }
    );

    const messages = {
      confirmed:
        "Booking confirmed successfully",

      rejected:
        "Booking rejected successfully",

      in_progress:
        "Rental started successfully",

      completed:
        "Rental completed successfully",
    };

    return res.json({
      success: true,
      message: messages[status],
      booking: result.booking,
      vehicle: result.vehicle,
    });

  } catch (error) {
    return handleError(
      res,
      error,
      "Update booking status error:",
      "Failed to update booking status"
    );
  }
};

// ==========================================
// CANCEL BOOKING - CUSTOMER
// PATCH /api/bookings/:id/cancel
// ==========================================

exports.cancelBooking = async (req, res) => {
  if (!isValidBookingId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid booking ID",
    });
  }

  try {
    const customer =
      await getCustomerProfile(req.user.id);

    const bookingId = Number(req.params.id);

    // Verify booking ownership.

    const bookingInfo = await Booking.findOne({
      where: {
        id: bookingId,
        userId: customer.id,
      },
    });

    if (!bookingInfo) {
      throw new ApiError(
        404,
        "Booking not found"
      );
    }

    const booking = await sequelize.transaction(
      async (transaction) => {
        // Cancellation does not require
        // an active pickup location.
        //
        // Lock vehicle first.

        const vehicle = await lockVehicle(
          bookingInfo.vehicleId,
          transaction
        );

        // Fetch latest admin cancellation policy.

        const settings =
          await getRentalSettings(transaction);

        // Lock customer booking.

        const currentBooking =
          await Booking.findOne({
            where: {
              id: bookingId,
              userId: customer.id,
            },

            transaction,

            lock: transaction.LOCK.UPDATE,
          });

        if (!currentBooking) {
          throw new ApiError(
            404,
            "Booking not found"
          );
        }

        if (
          Number(currentBooking.vehicleId) !==
          Number(vehicle.id)
        ) {
          throw new ApiError(
            409,
            "Booking vehicle has changed. Please retry."
          );
        }

        // Only pending bookings can be cancelled.

        if (currentBooking.status !== "pending") {
          throw new ApiError(
            409,
            "Only pending bookings can be cancelled"
          );
        }

        // Apply admin cancellation policy.

        validateCancellationPolicy(settings);

        // Cancel customer booking.

        currentBooking.status = "cancelled";

        await currentBooking.save({
          transaction,
        });

        // Cancellation releases reserved dates.
        // Vehicle status remains unchanged.
        // Pickup snapshot remains unchanged.

        return currentBooking;
      }
    );

    return res.json({
      success: true,
      message:
        "Booking cancelled successfully",

      booking: formatBookingResponse(booking),
    });

  } catch (error) {
    return handleError(
      res,
      error,
      "Cancel booking error:",
      "Failed to cancel booking"
    );
  }
};