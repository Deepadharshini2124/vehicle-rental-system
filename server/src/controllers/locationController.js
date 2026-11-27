
const { Op } = require("sequelize");

const sequelize = require("../config/database");
const Location = require("../models/Location");
const Vehicle = require("../models/Vehicle");
const Booking = require("../models/Booking");

// ==========================================
// CONSTANTS
// ==========================================

const LOCATION_STATUSES = ["active", "inactive"];

const ACTIVE_BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "in_progress",
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function isValidId(value) {
  return (
    /^\d+$/.test(String(value)) &&
    Number.isSafeInteger(Number(value)) &&
    Number(value) > 0 &&
    Number(value) <= 4294967295
  );
}

function validateLocationData(body) {
  const { name, city, address } = body || {};

  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 150
  ) {
    return {
      error: "Location name is required and must not exceed 150 characters",
    };
  }

  if (
    typeof city !== "string" ||
    !city.trim() ||
    city.trim().length > 100
  ) {
    return {
      error: "City is required and must not exceed 100 characters",
    };
  }

  if (
    typeof address !== "string" ||
    !address.trim() ||
    address.trim().length > 2000
  ) {
    return {
      error: "Address is required and must not exceed 2000 characters",
    };
  }

  return {
    data: {
      name: name.trim(),
      city: city.trim(),
      address: address.trim(),
    },
  };
}

function handleError(res, error) {
  console.error("Location Controller Error:", error.message);

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}

// ==========================================
// GET PUBLIC ACTIVE LOCATIONS
// GET /api/locations/public
// ==========================================

const getPublicLocations = async (req, res) => {
  try {
    const locations = await Location.findAll({
      where: {
        status: "active",
      },

      attributes: [
        "id",
        "name",
        "city",
        "address",
      ],

      order: [
        ["city", "ASC"],
        ["name", "ASC"],
      ],
    });

    res.set("Cache-Control", "no-store");

    return res.status(200).json({
      success: true,
      count: locations.length,
      locations,
    });

  } catch (error) {
    return handleError(res, error);
  }
};

// ==========================================
// GET ALL LOCATIONS
// GET /api/locations
// ==========================================

const getAllLocations = async (req, res) => {
  try {
    const locations = await Location.findAll({
      order: [
        ["city", "ASC"],
        ["name", "ASC"],
      ],
    });

    const vehicleCounts = await Vehicle.findAll({
      attributes: [
        "locationId",
        [
          sequelize.fn(
            "COUNT",
            sequelize.col("id")
          ),
          "totalVehicles",
        ],
      ],

      where: {
        locationId: {
          [Op.ne]: null,
        },
      },

      group: ["location_id"],
      raw: true,
    });

    const countMap = new Map(
      vehicleCounts.map((item) => [
        Number(item.locationId),
        Number(item.totalVehicles),
      ])
    );

    const result = locations.map((location) => ({
      ...location.toJSON(),
      totalVehicles:
        countMap.get(Number(location.id)) || 0,
    }));

    res.set("Cache-Control", "no-store");

    return res.status(200).json({
      success: true,
      count: result.length,
      locations: result,
    });

  } catch (error) {
    return handleError(res, error);
  }
};

// ==========================================
// GET LOCATION BY ID
// GET /api/locations/:id
// ==========================================

const getLocationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid location ID",
      });
    }

    const location = await Location.findByPk(id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    const vehicles = await Vehicle.findAll({
      where: {
        locationId: id,
      },

      attributes: [
        "id",
        "name",
        "type",
        "brand",
        "status",
        "pricePerDay",
      ],

      order: [["name", "ASC"]],
    });

    res.set("Cache-Control", "no-store");

    return res.status(200).json({
      success: true,

      location: {
        ...location.toJSON(),
        totalVehicles: vehicles.length,
        vehicles,
      },
    });

  } catch (error) {
    return handleError(res, error);
  }
};

// ==========================================
// CREATE LOCATION
// POST /api/locations
// ==========================================

const createLocation = async (req, res) => {
  try {
    const validation = validateLocationData(req.body);

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const { name, city, address } = validation.data;

    const existingLocation = await Location.findOne({
      where: {
        name,
        city,
      },
    });

    if (existingLocation) {
      return res.status(409).json({
        success: false,
        message: "Location already exists in this city",
      });
    }

    const location = await Location.create({
      name,
      city,
      address,
      status: "active",
    });

    return res.status(201).json({
      success: true,
      message: "Location created successfully",

      location: {
        ...location.toJSON(),
        totalVehicles: 0,
      },
    });

  } catch (error) {
    return handleError(res, error);
  }
};

// ==========================================
// UPDATE LOCATION
// PUT /api/locations/:id
// ==========================================

const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid location ID",
      });
    }

    const validation = validateLocationData(req.body);

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const { name, city, address } = validation.data;

    const location = await Location.findByPk(id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    const duplicateLocation = await Location.findOne({
      where: {
        name,
        city,

        id: {
          [Op.ne]: id,
        },
      },
    });

    if (duplicateLocation) {
      return res.status(409).json({
        success: false,
        message: "Another location already exists with this name and city",
      });
    }

    // Protect pickup details for assigned vehicles.
    // Full relocation workflow will be added later.

    const totalVehicles = await Vehicle.count({
      where: {
        locationId: id,
      },
    });

    const detailsChanged =
      location.name !== name ||
      location.city !== city ||
      location.address !== address;

    if (detailsChanged && totalVehicles > 0) {
      return res.status(409).json({
        success: false,
        message: "Location details cannot be changed while vehicles are assigned",
      });
    }

    await location.update({
      name,
      city,
      address,
    });

    return res.status(200).json({
      success: true,
      message: "Location updated successfully",

      location: {
        ...location.toJSON(),
        totalVehicles,
      },
    });

  } catch (error) {
    return handleError(res, error);
  }
};

// ==========================================
// UPDATE LOCATION STATUS
// PATCH /api/locations/:id/status
// ==========================================

const updateLocationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid location ID",
      });
    }

    if (!LOCATION_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be active or inactive",
      });
    }

    const result = await sequelize.transaction(
      async (transaction) => {

        const location = await Location.findByPk(id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!location) {
          return {
            statusCode: 404,
            body: {
              success: false,
              message: "Location not found",
            },
          };
        }

        const vehicles = await Vehicle.findAll({
          where: {
            locationId: id,
          },

          attributes: ["id", "status"],
          transaction,
        });

        if (
          status === "inactive" &&
          location.status !== "inactive"
        ) {
          const vehicleIds = vehicles.map(
            (vehicle) => vehicle.id
          );

          if (vehicleIds.length > 0) {
            const activeBookings = await Booking.count({
              where: {
                vehicleId: {
                  [Op.in]: vehicleIds,
                },

                status: {
                  [Op.in]: ACTIVE_BOOKING_STATUSES,
                },
              },

              transaction,
            });

            if (activeBookings > 0) {
              return {
                statusCode: 409,

                body: {
                  success: false,
                  message: "Cannot deactivate location with active bookings",
                },
              };
            }

            // Until booking APIs enforce location status,
            // prevent deactivation with assigned vehicles.

            return {
              statusCode: 409,

              body: {
                success: false,
                message: "Remove or reassign vehicles before deactivating this location",
              },
            };
          }
        }

        await location.update(
          { status },
          { transaction }
        );

        return {
          statusCode: 200,

          body: {
            success: true,

            message:
              status === "active"
                ? "Location activated successfully"
                : "Location deactivated successfully",

            location: {
              ...location.toJSON(),
              totalVehicles: vehicles.length,
            },
          },
        };
      }
    );

    return res
      .status(result.statusCode)
      .json(result.body);

  } catch (error) {
    return handleError(res, error);
  }
};

// ==========================================
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
  getPublicLocations,
  getAllLocations,
  getLocationById,
  createLocation,
  updateLocation,
  updateLocationStatus,
};
