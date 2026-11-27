
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Customer = sequelize.define(
  "Customer",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      unique: true,
      field: "user_id",
    },

    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
    },

    phone: {
      type: DataTypes.STRING(15),
      allowNull: false,
    },

    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
  },
  {
    tableName: "customers",
    timestamps: true,
    createdAt: "createdAt",
    updatedAt: false,
    freezeTableName: true,
  }
);

module.exports = Customer;
