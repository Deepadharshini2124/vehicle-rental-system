
const { Op } = require("sequelize");
const Customer = require("../models/Customer");
const User = require("../models/User");
const Booking = require("../models/Booking");

const customerAttributes = [
  "id",
  "userId",
  "name",
  "email",
  "phone",
  "address",
  "createdAt",
];

exports.getAllCustomers = async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();

    const where = search
      ? {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { phone: { [Op.like]: `%${search}%` } },
          ],
        }
      : {};

    const customers = await Customer.findAll({
      attributes: customerAttributes,
      where,
      order: [["id", "DESC"]],
    });

    const userIds = customers
      .map((customer) => customer.userId)
      .filter((id) => id != null);

    const customerIds = customers.map((customer) => customer.id);

    const users = userIds.length
      ? await User.findAll({
          where: { id: { [Op.in]: userIds } },
          attributes: ["id", "status"],
        })
      : [];

    const bookingCounts = customerIds.length
      ? await Booking.findAll({
          attributes: [
            "userId",
            [
              Booking.sequelize.fn(
                "COUNT",
                Booking.sequelize.col("id")
              ),
              "totalBookings",
            ],
          ],
          where: { userId: { [Op.in]: customerIds } },
          group: ["userId"],
          raw: true,
        })
      : [];

    const statusMap = new Map(
      users.map((user) => [user.id, user.status])
    );

    const countMap = new Map(
      bookingCounts.map((item) => [
        Number(item.userId),
        Number(item.totalBookings),
      ])
    );

    const result = customers.map((customer) => {
      const data = customer.toJSON();

      return {
        ...data,
        status: data.userId
          ? statusMap.get(data.userId) || "unknown"
          : "legacy",
        totalBookings: countMap.get(data.id) || 0,
      };
    });

    return res.status(200).json({
      success: true,
      count: result.length,
      customers: result,
    });
  } catch (error) {
    console.error("Get customers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
    });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await Customer.findByPk(id, {
      attributes: customerAttributes,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const user = customer.userId
      ? await User.findByPk(customer.userId, {
          attributes: ["id", "status"],
        })
      : null;

    const bookings = await Booking.findAll({
      where: { userId: customer.id },
      order: [["id", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      customer: {
        ...customer.toJSON(),
        status: user?.status || "legacy",
        totalBookings: bookings.length,
      },
      bookings,
    });
  } catch (error) {
    console.error("Get customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer details",
    });
  }
};

exports.updateCustomerStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    if (!["active", "blocked"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be active or blocked",
      });
    }

    const customer = await Customer.findByPk(id, {
      attributes: customerAttributes,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (!customer.userId) {
      return res.status(409).json({
        success: false,
        message: "Legacy customer has no linked login account",
      });
    }

    const user = await User.findByPk(customer.userId);

    if (!user || user.role !== "customer") {
      return res.status(409).json({
        success: false,
        message: "Valid customer login account not found",
      });
    }

    await user.update({ status });

    return res.status(200).json({
      success: true,
      message: `Customer ${status} successfully`,
      customer: {
        id: customer.id,
        userId: customer.userId,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Update customer status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update customer status",
    });
  }
};
