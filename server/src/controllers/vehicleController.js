const {
  Op,
  ValidationError,
  UniqueConstraintError,
} = require("sequelize");

const sequelize = require("../config/database");
const Vehicle = require("../models/Vehicle");
const Booking = require("../models/Booking");
const Location = require("../models/Location");

// ==========================================
// CONSTANTS
// ==========================================

const VALID_TYPES = ["car", "bike"];

const VALID_FUEL_TYPES = [
  "petrol",
  "diesel",
  "electric",
  "cng",
];

const VALID_TRANSMISSIONS = [
  "manual",
  "automatic",
];

const VALID_STATUSES = [
  "available",
  "rented",
  "maintenance",
  "inactive",
];

const EDITABLE_FIELDS = [
  "name",
  "type",
  "brand",
  "model",
  "registrationNumber",
  "fuelType",
  "transmission",
  "seatingCapacity",
  "pricePerDay",
  "description",
  "image",
  "locationId",
];

const RESERVED_STATUSES = [
  "pending",
  "confirmed",
];

const LOCATION_BLOCKING_STATUSES = [
  "pending",
  "confirmed",
  "in_progress",
];

// ==========================================
// LOCATION ASSOCIATION
// ==========================================

const locationInclude = {
  model: Location,
  as: "location",
  attributes: [
    "id",
    "name",
    "city",
    "address",
    "status",
  ],
  required: false,
};

// ==========================================
// CUSTOM API ERROR
// ==========================================

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);

    this.statusCode = statusCode;
  }
}

// ==========================================
// COMMON HELPERS
// ==========================================

const isValidId = (id) => {
  return (
    /^[1-9]\d*$/.test(String(id)) &&
    Number.isSafeInteger(Number(id)) &&
    Number(id) <= 4294967295
  );
};

const isValidLocationId = (id) => {
  return (
    typeof id === "number" &&
    Number.isSafeInteger(id) &&
    id > 0 &&
    id <= 4294967295
  );
};

const hasOwn = (obj, key) =>
  Object.prototype.hasOwnProperty.call(obj, key);

const sendError = (res, status, message) => {
  return res.status(status).json({
    success: false,
    message,
  });
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
// DATABASE ERROR HANDLER
// ==========================================

const handleDatabaseError = (
  error,
  res,
  message
) => {
  if (error instanceof ApiError) {
    return sendError(
      res,
      error.statusCode,
      error.message
    );
  }

  console.error(message, error);

  if (
    error instanceof UniqueConstraintError ||
    error.name === "SequelizeUniqueConstraintError"
  ) {
    return sendError(
      res,
      409,
      "Vehicle registration number already exists"
    );
  }

  if (
    error instanceof ValidationError ||
    error.name === "SequelizeValidationError"
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid vehicle details",

      errors:
        error.errors?.map((item) => ({
          field: item.path,
          message: item.message,
        })) || [],
    });
  }

  // Handle concurrent database updates.

  if (
    error.original?.code === "ER_LOCK_DEADLOCK" ||
    error.original?.code === "ER_LOCK_WAIT_TIMEOUT"
  ) {
    return sendError(
      res,
      409,
      "Another operation is updating these records. Please refresh and try again."
    );
  }

  return sendError(res, 500, message);
};

// ==========================================
// LOCK VEHICLE
// ==========================================

const lockVehicle = async (
  id,
  transaction
) => {
  const vehicle = await Vehicle.findByPk(
    Number(id),
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
// LOCK ACTIVE PICKUP LOCATION
// ==========================================

const lockActiveLocation = async (
  locationId,
  transaction
) => {
  const location = await Location.findByPk(
    locationId,
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

  if (location.status !== "active") {
    throw new ApiError(
      409,
      "Only active pickup locations can be assigned"
    );
  }

  return location;
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
// GET CURRENT AND UPCOMING RESERVATIONS
// ==========================================

const getUpcomingReservation = async (
  vehicleId,
  transaction
) => {
  return Booking.findOne({
    where: {
      vehicleId,

      status: {
        [Op.in]: RESERVED_STATUSES,
      },

      endDate: {
        [Op.gt]: getToday(),
      },
    },

    order: [
      ["startDate", "ASC"],
      ["id", "ASC"],
    ],

    transaction,

    lock: transaction.LOCK.UPDATE,
  });
};

// ==========================================
// GET LOCATION BLOCKING BOOKING
// ==========================================

const getLocationBlockingBooking = async (
  vehicleId,
  transaction
) => {
  return Booking.findOne({
    where: {
      vehicleId,

      status: {
        [Op.in]: LOCATION_BLOCKING_STATUSES,
      },
    },

    order: [["id", "ASC"]],

    transaction,

    lock: transaction.LOCK.UPDATE,
  });
};

// ==========================================
// VALIDATE DAILY RENTAL PRICE
// ==========================================

const isValidPrice = (price) => {
  if (
    typeof price !== "number" ||
    !Number.isFinite(price) ||
    price <= 0 ||
    price > 99999999.99
  ) {
    return false;
  }

  const cents = price * 100;

  return (
    Math.abs(
      cents - Math.round(cents)
    ) < 0.00001
  );
};

// ==========================================
// VALIDATE CREATE / UPDATE VEHICLE FIELDS
// ==========================================

const validateVehicleFields = (
  data,
  isCreate = false
) => {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    return {
      error: "Invalid vehicle data",
    };
  }

  const updates = {};

  // Allow only editable fields.
  // Status cannot be changed through PUT API.

  for (const field of EDITABLE_FIELDS) {
    if (hasOwn(data, field)) {
      updates[field] = data[field];
    }
  }

  // ========================================
  // REQUIRED STRING FIELDS
  // ========================================

  const requiredStrings = [
    "name",
    "brand",
    "model",
    "registrationNumber",
  ];

  const fieldLimits = {
    name: 150,
    brand: 100,
    model: 100,
    registrationNumber: 30,
  };

  for (const field of requiredStrings) {
    if (
      isCreate ||
      hasOwn(updates, field)
    ) {
      const value = updates[field];

      if (
        typeof value !== "string" ||
        !value.trim()
      ) {
        return {
          error:
            `${field} is required and must be a non-empty string`,
        };
      }

      const normalizedValue = value.trim();

      if (
        normalizedValue.length >
        fieldLimits[field]
      ) {
        return {
          error:
            `${field} must not exceed ${fieldLimits[field]} characters`,
        };
      }

      updates[field] = normalizedValue;
    }
  }

  // Normalize registration number.

  if (
    hasOwn(
      updates,
      "registrationNumber"
    )
  ) {
    updates.registrationNumber =
      updates.registrationNumber.toUpperCase();

    if (
      updates.registrationNumber.length > 30
    ) {
      return {
        error:
          "Registration number must not exceed 30 characters",
      };
    }
  }

  // ========================================
  // VALIDATE VEHICLE TYPE
  // ========================================

  if (
    isCreate ||
    hasOwn(updates, "type")
  ) {
    if (
      !VALID_TYPES.includes(updates.type)
    ) {
      return {
        error:
          "Vehicle type must be car or bike",
      };
    }
  }

  // ========================================
  // VALIDATE FUEL TYPE
  // ========================================

  if (
    isCreate ||
    hasOwn(updates, "fuelType")
  ) {
    if (
      !VALID_FUEL_TYPES.includes(
        updates.fuelType
      )
    ) {
      return {
        error: "Invalid fuel type",
      };
    }
  }

  // ========================================
  // VALIDATE TRANSMISSION
  // ========================================

  if (
    hasOwn(updates, "transmission")
  ) {
    if (
      updates.transmission !== null &&
      !VALID_TRANSMISSIONS.includes(
        updates.transmission
      )
    ) {
      return {
        error:
          "Transmission must be manual or automatic",
      };
    }
  }

  // ========================================
  // VALIDATE SEATING CAPACITY
  // ========================================

  if (
    isCreate ||
    hasOwn(updates, "seatingCapacity")
  ) {
    if (
      !Number.isSafeInteger(
        updates.seatingCapacity
      ) ||
      updates.seatingCapacity < 1 ||
      updates.seatingCapacity > 2147483647
    ) {
      return {
        error:
          "Seating capacity must be a positive integer",
      };
    }
  }

  // ========================================
  // VALIDATE RENTAL PRICE
  // ========================================

  if (
    isCreate ||
    hasOwn(updates, "pricePerDay")
  ) {
    if (
      !isValidPrice(updates.pricePerDay)
    ) {
      return {
        error:
          "Enter a positive daily rental price with a maximum of 2 decimal places",
      };
    }

    updates.pricePerDay =
      Math.round(
        updates.pricePerDay * 100
      ) / 100;
  }

  // ========================================
  // VALIDATE OPTIONAL FIELDS
  // ========================================

  for (const field of [
    "description",
    "image",
  ]) {
    if (hasOwn(updates, field)) {
      if (
        updates[field] !== null &&
        typeof updates[field] !== "string"
      ) {
        return {
          error:
            `${field} must be a string or null`,
        };
      }

      if (
        typeof updates[field] === "string"
      ) {
        updates[field] =
          updates[field].trim() || null;
      }
    }
  }

  if (
    typeof updates.image === "string" &&
    updates.image.length > 500
  ) {
    return {
      error:
        "Vehicle image path must not exceed 500 characters",
    };
  }

  // ========================================
  // VALIDATE PICKUP LOCATION
  // ========================================

  if (
    isCreate ||
    hasOwn(updates, "locationId")
  ) {
    if (
      !isValidLocationId(
        updates.locationId
      )
    ) {
      return {
        error:
          "Select a valid pickup location",
      };
    }
  }

  // ========================================
  // DEFAULT OPTIONAL VALUES
  // ========================================

  if (isCreate) {
    updates.transmission ??= null;
    updates.description ??= null;
    updates.image ??= null;
  }

  return { updates };
};

// ==========================================
// CREATE VEHICLE - ADMIN ONLY
// POST /api/vehicles
// ==========================================

exports.createVehicle = async (req, res) => {
  try {
    const result = validateVehicleFields(
      req.body || {},
      true
    );

    if (result.error) {
      return sendError(
        res,
        400,
        result.error
      );
    }

    const data = result.updates;

    const vehicle = await sequelize.transaction(
      async (transaction) => {
        // Validate and lock pickup location.

        await lockActiveLocation(
          data.locationId,
          transaction
        );

        // Check duplicate registration number.

        const existingVehicle =
          await Vehicle.findOne({
            where: {
              registrationNumber:
                data.registrationNumber,
            },

            transaction,
          });

        if (existingVehicle) {
          throw new ApiError(
            409,
            "Vehicle registration number already exists"
          );
        }

        // Newly created vehicles are available.

        const createdVehicle =
          await Vehicle.create(
            {
              ...data,
              status: "available",
            },
            {
              transaction,
            }
          );

        // Return vehicle with location details.

        return Vehicle.findByPk(
          createdVehicle.id,
          {
            include: [locationInclude],
            transaction,
          }
        );
      }
    );

    return res.status(201).json({
      success: true,
      message: "Vehicle added successfully",
      vehicle,
    });
  } catch (error) {
    return handleDatabaseError(
      error,
      res,
      "Failed to add vehicle"
    );
  }
};

// ==========================================
// GET ALL VEHICLES - PUBLIC
// GET /api/vehicles
// ==========================================

exports.getAllVehicles = async (req, res) => {
  try {
    const {
      type,
      status,
      locationId,
    } = req.query;

    const where = {};

    // ======================================
    // FILTER BY VEHICLE TYPE
    // ======================================

    if (type !== undefined) {
      if (
        typeof type !== "string" ||
        !VALID_TYPES.includes(type)
      ) {
        return sendError(
          res,
          400,
          "Invalid vehicle type"
        );
      }

      where.type = type;
    }

    // ======================================
    // FILTER BY VEHICLE STATUS
    // ======================================

    if (status !== undefined) {
      if (
        typeof status !== "string" ||
        !VALID_STATUSES.includes(status)
      ) {
        return sendError(
          res,
          400,
          "Invalid vehicle status"
        );
      }

      where.status = status;
    }

    // ======================================
    // FILTER BY PICKUP LOCATION
    // ======================================

    if (locationId !== undefined) {
      if (
        typeof locationId !== "string" ||
        !/^[1-9]\d*$/.test(locationId) ||
        !isValidLocationId(Number(locationId))
      ) {
        return sendError(
          res,
          400,
          "Invalid pickup location ID"
        );
      }

      where.locationId = Number(locationId);
    }

    // Include pickup location details.
    // Existing unassigned vehicles remain visible.

    const vehicles = await Vehicle.findAll({
      where,

      include: [locationInclude],

      order: [
        ["createdAt", "DESC"],
        ["id", "DESC"],
      ],
    });

    res.set("Cache-Control", "no-store");

    return res.status(200).json({
      success: true,
      message: "Vehicles fetched successfully",
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    return handleDatabaseError(
      error,
      res,
      "Failed to fetch vehicles"
    );
  }
};

// ==========================================
// GET SINGLE VEHICLE - PUBLIC
// GET /api/vehicles/:id
// ==========================================

exports.getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return sendError(
        res,
        400,
        "Invalid vehicle ID"
      );
    }

    const vehicle = await Vehicle.findByPk(
      Number(id),
      {
        include: [locationInclude],
      }
    );

    if (!vehicle) {
      return sendError(
        res,
        404,
        "Vehicle not found"
      );
    }

    res.set("Cache-Control", "no-store");

    return res.status(200).json({
      success: true,
      message: "Vehicle fetched successfully",
      vehicle,
    });
  } catch (error) {
    return handleDatabaseError(
      error,
      res,
      "Failed to fetch vehicle"
    );
  }
};

// ==========================================
// UPDATE VEHICLE - ADMIN ONLY
// PUT /api/vehicles/:id
// ==========================================

exports.updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return sendError(
        res,
        400,
        "Invalid vehicle ID"
      );
    }

    const body = req.body || {};

    // Prevent status changes through PUT.

    if (hasOwn(body, "status")) {
      return sendError(
        res,
        400,
        "Use the vehicle status endpoint to update vehicle status"
      );
    }

    const result = validateVehicleFields(
      body,
      false
    );

    if (result.error) {
      return sendError(
        res,
        400,
        result.error
      );
    }

    const updates = result.updates;

    if (
      Object.keys(updates).length === 0
    ) {
      return sendError(
        res,
        400,
        "No valid fields provided for update"
      );
    }

    const vehicle = await sequelize.transaction(
      async (transaction) => {
        // ==================================
        // LOCK REQUESTED PICKUP LOCATION
        // ==================================

        if (
          hasOwn(updates, "locationId")
        ) {
          await lockActiveLocation(
            updates.locationId,
            transaction
          );
        }

        // ==================================
        // LOCK VEHICLE
        // ==================================

        const currentVehicle =
          await lockVehicle(
            id,
            transaction
          );

        // ==================================
        // CHECK ACTIVE RENTALS
        // ==================================

        const activeRentals =
          await getActiveRentals(
            currentVehicle.id,
            transaction
          );

        // ==================================
        // PROTECT VEHICLE IDENTITY
        // ==================================

        const identityFields = [
          "type",
          "brand",
          "model",
          "registrationNumber",
        ];

        const identityChanged =
          identityFields.some(
            (field) =>
              hasOwn(updates, field) &&
              updates[field] !==
                currentVehicle[field]
          );

        if (
          activeRentals.length > 0 &&
          identityChanged
        ) {
          throw new ApiError(
            409,
            "Vehicle identity details cannot be changed during an active rental"
          );
        }

        // ==================================
        // PICKUP LOCATION CHANGE PROTECTION
        // ==================================

        const locationChanged =
          hasOwn(updates, "locationId") &&
          updates.locationId !==
            Number(currentVehicle.locationId);

        if (locationChanged) {
          // Block location changes during rental.

          if (
            currentVehicle.status === "rented" ||
            activeRentals.length > 0
          ) {
            throw new ApiError(
              409,
              "Pickup location cannot be changed during an active rental"
            );
          }

          // Block location changes if there
          // are pending or confirmed bookings.

          const existingBooking =
            await getLocationBlockingBooking(
              currentVehicle.id,
              transaction
            );

          if (existingBooking) {
            throw new ApiError(
              409,
              `Cannot change pickup location. Booking #${existingBooking.id} is still active or unresolved`
            );
          }
        }

        // ==================================
        // CHECK DUPLICATE REGISTRATION
        // ==================================

        if (
          hasOwn(
            updates,
            "registrationNumber"
          ) &&
          updates.registrationNumber !==
            currentVehicle.registrationNumber
        ) {
          const existingVehicle =
            await Vehicle.findOne({
              where: {
                registrationNumber:
                  updates.registrationNumber,

                id: {
                  [Op.ne]:
                    currentVehicle.id,
                },
              },

              transaction,
            });

          if (existingVehicle) {
            throw new ApiError(
              409,
              "Vehicle registration number already exists"
            );
          }
        }

        // ==================================
        // UPDATE VEHICLE DETAILS
        // ==================================

        await currentVehicle.update(
          updates,
          {
            transaction,
          }
        );

        // Return updated vehicle with location.

        return Vehicle.findByPk(
          currentVehicle.id,
          {
            include: [locationInclude],
            transaction,
          }
        );
      }
    );

    return res.status(200).json({
      success: true,
      message: "Vehicle updated successfully",
      vehicle,
    });
  } catch (error) {
    return handleDatabaseError(
      error,
      res,
      "Failed to update vehicle"
    );
  }
};

// ==========================================
// UPDATE VEHICLE STATUS - ADMIN ONLY
// PATCH /api/vehicles/:id/status
// ==========================================

exports.updateVehicleStatus = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    // ======================================
    // VALIDATE VEHICLE ID
    // ======================================

    if (!isValidId(id)) {
      return sendError(
        res,
        400,
        "Invalid vehicle ID"
      );
    }

    // ======================================
    // VALIDATE STATUS
    // ======================================

    if (
      !VALID_STATUSES.includes(status)
    ) {
      return sendError(
        res,
        400,
        "Invalid vehicle status"
      );
    }

    // Rented status must only be assigned
    // through Start Rental booking action.

    if (status === "rented") {
      return sendError(
        res,
        409,
        "Use Start Rental from the Bookings page to mark a vehicle as rented"
      );
    }

    const result = await sequelize.transaction(
      async (transaction) => {
        // ==================================
        // LOCK VEHICLE
        // ==================================

        const vehicle = await lockVehicle(
          id,
          transaction
        );

        // ==================================
        // CHECK CURRENT ACTIVE RENTALS
        // ==================================

        const activeRentals =
          await getActiveRentals(
            vehicle.id,
            transaction
          );

        // Prevent multiple active rentals.

        if (activeRentals.length > 1) {
          throw new ApiError(
            409,
            "Vehicle has multiple active rentals. Admin verification is required"
          );
        }

        // Prevent manual status changes
        // during an active rental.

        if (activeRentals.length > 0) {
          throw new ApiError(
            409,
            "Vehicle has an active rental. Complete the rental before changing vehicle status"
          );
        }

        // Handle inconsistent legacy records.

        if (vehicle.status === "rented") {
          throw new ApiError(
            409,
            "Vehicle is marked as rented without an active booking. Verify the physical vehicle and reconcile its rental status"
          );
        }

        // ==================================
        // SAME STATUS REQUEST
        // ==================================

        if (vehicle.status === status) {
          return {
            vehicle,

            message:
              "Vehicle already has the selected status",
          };
        }

        // ==================================
        // MARK VEHICLE AS AVAILABLE
        // ==================================

        if (status === "available") {
          // Upcoming reservations are allowed.
          // Their dates remain blocked.

          await vehicle.update(
            {
              status: "available",
            },
            {
              transaction,
            }
          );

          return {
            vehicle,

            message:
              "Vehicle is now available",
          };
        }

        // ==================================
        // MARK VEHICLE AS MAINTENANCE
        // OR INACTIVE
        // ==================================

        if (
          status === "maintenance" ||
          status === "inactive"
        ) {
          const upcomingReservation =
            await getUpcomingReservation(
              vehicle.id,
              transaction
            );

          if (upcomingReservation) {
            throw new ApiError(
              409,
              `Cannot mark vehicle as ${status}. Booking #${upcomingReservation.id} has an existing reservation`
            );
          }

          await vehicle.update(
            {
              status,
            },
            {
              transaction,
            }
          );

          const messages = {
            maintenance:
              "Vehicle marked as under maintenance",

            inactive:
              "Vehicle marked as inactive",
          };

          return {
            vehicle,

            message: messages[status],
          };
        }

        throw new ApiError(
          400,
          "Invalid vehicle status transition"
        );
      }
    );

    return res.status(200).json({
      success: true,
      message: result.message,
      vehicle: result.vehicle,
    });
  } catch (error) {
    return handleDatabaseError(
      error,
      res,
      "Failed to update vehicle status"
    );
  }
};