
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Location = sequelize.define(
  "Location",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },

    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },

    city: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },

    address: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },

    status: {
      type: DataTypes.ENUM("active", "inactive"),
      allowNull: false,
      defaultValue: "active"
    }
  },
  {
    tableName: "locations",
    timestamps: true,
    underscored: true
  }
);

module.exports = Location;
