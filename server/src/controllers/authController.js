
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const sequelize = require("../config/database");
const User = require("../models/User");
const Customer = require("../models/Customer");

const createToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

exports.register = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { name, email, phone, password } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof phone !== "string" ||
      !/^[0-9]{10,15}$/.test(phone) ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message:
          "Provide valid name, email, phone and password (minimum 8 characters)"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      where: { email: normalizedEmail },
      transaction
    });

    if (existingUser) {
      await transaction.rollback();

      return res.status(409).json({
        success: false,
        message: "Email already registered"
      });
    }

    const existingCustomer = await Customer.findOne({
      where: { email: normalizedEmail },
      transaction
    });

    if (existingCustomer) {
      await transaction.rollback();

      return res.status(409).json({
        success: false,
        message:
          "This email already exists in customer records. Contact admin to link your account."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create(
      {
        name: name.trim(),
        email: normalizedEmail,
        phone,
        password: hashedPassword,
        role: "customer",
        status: "active"
      },
      { transaction }
    );

    await Customer.create(
      {
        userId: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        password: hashedPassword
      },
      { transaction }
    );

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      token: createToken(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error("Registration error:", error.message);

    if (
      error.name === "SequelizeUniqueConstraintError"
    ) {
      return res.status(409).json({
        success: false,
        message: "Email or customer account already exists"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Registration failed"
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const user = await User.findOne({
      where: {
        email: email.trim().toLowerCase()
      }
    });

    if (
      !user ||
      !(await bcrypt.compare(password, user.password))
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Account is blocked"
      });
    }

    return res.json({
      success: true,
      message: "Login successful",
      token: createToken(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Login failed"
    });
  }
};
