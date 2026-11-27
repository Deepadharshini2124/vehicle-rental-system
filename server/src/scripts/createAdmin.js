
require("dotenv").config();

const bcrypt = require("bcryptjs");
const readline = require("readline");
const { promisify } = require("util");

const sequelize = require("../config/database");
const User = require("../models/User");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = promisify(rl.question).bind(rl);

async function createAdmin() {
  try {
    const name = (await question("Admin Name: ")).trim();
    const email = (await question("Admin Email: ")).trim().toLowerCase();
    const phone = (await question("Admin Phone: ")).trim();
    const password = await question("Admin Password: ");

    if (
      !name ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !/^\d{10,15}$/.test(phone) ||
      password.length < 12
    ) {
      throw new Error(
        "Enter valid details and a password of at least 12 characters."
      );
    }

    await sequelize.authenticate();

    const existingUser = await User.findOne({
      where: { email }
    });

    if (existingUser) {
      throw new Error("Email already registered.");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: "admin",
      status: "active"
    });

    console.log("Admin account created successfully!");
    console.log("Admin ID:", admin.id);
    console.log("Admin Email:", admin.email);
  } catch (error) {
    console.error("Admin creation failed:", error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    await sequelize.close();
  }
}

createAdmin();
