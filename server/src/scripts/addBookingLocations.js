require("dotenv").config();

const { DataTypes, QueryTypes } = require("sequelize");
const sequelize = require("../config/database");

// ==========================================
// CONSTANTS
// ==========================================

const BOOKING_TABLE = "bookings";

const LOCATION_TABLE = "locations";

const FOREIGN_KEY_NAME = "fk_bookings_location_id";

// ==========================================
// MIGRATION COLUMNS
// ==========================================

const columns = {
  location_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    defaultValue: null,
  },

  pickup_location_name: {
    type: DataTypes.STRING(150),
    allowNull: true,
    defaultValue: null,
  },

  pickup_location_city: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null,
  },

  pickup_location_address: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
  },
};

// ==========================================
// CHECK FOREIGN KEY
// ==========================================

async function getLocationForeignKeys() {
  return sequelize.query(
    `
      SELECT
        k.CONSTRAINT_NAME AS constraintName,
        k.REFERENCED_TABLE_NAME AS referencedTable,
        k.REFERENCED_COLUMN_NAME AS referencedColumn,
        r.UPDATE_RULE AS updateRule,
        r.DELETE_RULE AS deleteRule
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
      INNER JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS r
        ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
        AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
        AND r.TABLE_NAME = k.TABLE_NAME
      WHERE k.TABLE_SCHEMA = DATABASE()
        AND k.TABLE_NAME = :tableName
        AND k.COLUMN_NAME = 'location_id'
        AND k.REFERENCED_TABLE_NAME IS NOT NULL
    `,
    {
      replacements: {
        tableName: BOOKING_TABLE,
      },
      type: QueryTypes.SELECT,
    }
  );
}

// ==========================================
// GET BOOKING SUMMARY
// ==========================================

async function getBookingSummary() {
  const [summary] = await sequelize.query(
    `
      SELECT
        COUNT(*) AS totalBookings,

        COUNT(location_id) AS assignedBookings,

        COUNT(*) - COUNT(location_id)
          AS unassignedBookings,

        COALESCE(
          SUM(
            CASE
              WHEN location_id IS NOT NULL
                AND pickup_location_name IS NOT NULL
                AND pickup_location_city IS NOT NULL
                AND pickup_location_address IS NOT NULL
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS snapshotBookings

      FROM bookings
    `,
    {
      type: QueryTypes.SELECT,
    }
  );

  return summary;
}

// ==========================================
// VALIDATE COLUMN STRUCTURE
// ==========================================

async function validateColumns() {
  const existingColumns = await sequelize.query(
    `
      SELECT
        COLUMN_NAME AS columnName,
        DATA_TYPE AS dataType,
        COLUMN_TYPE AS columnType,
        IS_NULLABLE AS isNullable,
        CHARACTER_MAXIMUM_LENGTH AS maxLength
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = :tableName
        AND COLUMN_NAME IN (
          'location_id',
          'pickup_location_name',
          'pickup_location_city',
          'pickup_location_address'
        )
    `,
    {
      replacements: {
        tableName: BOOKING_TABLE,
      },
      type: QueryTypes.SELECT,
    }
  );

  const expected = {
    location_id: {
      dataType: "int",
      unsigned: true,
    },

    pickup_location_name: {
      dataType: "varchar",
      maxLength: 150,
    },

    pickup_location_city: {
      dataType: "varchar",
      maxLength: 100,
    },

    pickup_location_address: {
      dataType: "text",
    },
  };

  for (const column of existingColumns) {
    const definition = expected[column.columnName];

    if (
      column.dataType.toLowerCase() !==
      definition.dataType
    ) {
      throw new Error(
        `Invalid data type for ${column.columnName}`
      );
    }

    if (
      definition.unsigned &&
      !column.columnType
        .toLowerCase()
        .includes("unsigned")
    ) {
      throw new Error(
        `${column.columnName} must be UNSIGNED`
      );
    }

    if (
      definition.maxLength &&
      Number(column.maxLength) !==
        definition.maxLength
    ) {
      throw new Error(
        `Invalid length for ${column.columnName}`
      );
    }

    if (column.isNullable !== "YES") {
      throw new Error(
        `${column.columnName} must allow NULL`
      );
    }
  }

  return existingColumns;
}

// ==========================================
// MAIN MIGRATION
// ==========================================

async function migrateBookingLocations() {
  try {
    console.log("");
    console.log("==========================================");
    console.log("BOOKING LOCATION MIGRATION");
    console.log("==========================================");

    // ========================================
    // CONNECT DATABASE
    // ========================================

    await sequelize.authenticate();

    console.log("Database connection successful.");

    const queryInterface =
      sequelize.getQueryInterface();

    // ========================================
    // VERIFY REQUIRED TABLES
    // ========================================

    const bookingTable =
      await queryInterface.describeTable(
        BOOKING_TABLE
      );

    const locationTable =
      await queryInterface.describeTable(
        LOCATION_TABLE
      );

    if (!bookingTable.id) {
      throw new Error(
        "Bookings table does not have an ID column."
      );
    }

    if (!locationTable.id) {
      throw new Error(
        "Locations table does not have an ID column."
      );
    }

    const locationIdType = String(
      locationTable.id.type
    ).toLowerCase();

    if (
      !/^int(?:eger)?(?:\(\d+\))?\s+unsigned$/.test(
        locationIdType
      )
    ) {
      throw new Error(
        "Locations ID must be INT UNSIGNED."
      );
    }

    console.log("Required tables verified.");

    // ========================================
    // EXISTING BOOKING COUNT
    // ========================================

    const [before] = await sequelize.query(
      `
        SELECT COUNT(*) AS totalBookings
        FROM bookings
      `,
      {
        type: QueryTypes.SELECT,
      }
    );

    console.log(
      `Existing bookings: ${before.totalBookings}`
    );

    // ========================================
    // VALIDATE EXISTING LOCATION COLUMNS
    // ========================================

    await validateColumns();

    // ========================================
    // ADD MISSING COLUMNS
    // ========================================

    console.log("");
    console.log("Checking booking location columns...");

    for (const [columnName, definition] of
      Object.entries(columns)) {

      if (
        Object.prototype.hasOwnProperty.call(
          bookingTable,
          columnName
        )
      ) {
        console.log(
          `[SKIPPED] ${columnName} already exists.`
        );

        continue;
      }

      await queryInterface.addColumn(
        BOOKING_TABLE,
        columnName,
        definition
      );

      console.log(
        `[CREATED] ${columnName}`
      );
    }

    // ========================================
    // VERIFY NEW COLUMN STRUCTURE
    // ========================================

    const verifiedColumns =
      await validateColumns();

    if (
      verifiedColumns.length !==
      Object.keys(columns).length
    ) {
      throw new Error(
        "Booking location columns are incomplete."
      );
    }

    console.log("Column structure verified.");

    // ========================================
    // CHECK INVALID LOCATION REFERENCES
    // ========================================

    const [orphanSummary] =
      await sequelize.query(
        `
          SELECT COUNT(*) AS invalidReferences
          FROM bookings b
          LEFT JOIN locations l
            ON l.id = b.location_id
          WHERE b.location_id IS NOT NULL
            AND l.id IS NULL
        `,
        {
          type: QueryTypes.SELECT,
        }
      );

    if (
      Number(orphanSummary.invalidReferences) > 0
    ) {
      throw new Error(
        "Invalid booking location references found. Resolve them before adding the foreign key."
      );
    }

    // ========================================
    // FOREIGN KEY CONSTRAINT
    // ========================================

    console.log("");
    console.log("Checking foreign key constraint...");

    const foreignKeys =
      await getLocationForeignKeys();

    if (foreignKeys.length > 0) {
      const validForeignKey =
        foreignKeys.length === 1 &&
        foreignKeys.every(
          (foreignKey) =>
            foreignKey.referencedTable ===
              LOCATION_TABLE &&
            foreignKey.referencedColumn === "id" &&
            foreignKey.updateRule === "CASCADE" &&
            ["RESTRICT", "NO ACTION"].includes(
              foreignKey.deleteRule
            )
        );

      if (!validForeignKey) {
        throw new Error(
          "An incompatible location foreign key already exists."
        );
      }

      console.log(
        "[SKIPPED] Valid foreign key already exists."
      );

    } else {
      await queryInterface.addConstraint(
        BOOKING_TABLE,
        {
          fields: ["location_id"],

          type: "foreign key",

          name: FOREIGN_KEY_NAME,

          references: {
            table: LOCATION_TABLE,
            field: "id",
          },

          onUpdate: "CASCADE",

          onDelete: "RESTRICT",
        }
      );

      console.log(
        `[CREATED] ${FOREIGN_KEY_NAME}`
      );
    }

    // ========================================
    // VERIFY FOREIGN KEY
    // ========================================

    const finalForeignKeys =
      await getLocationForeignKeys();

    if (
      finalForeignKeys.length !== 1 ||
      finalForeignKeys[0].referencedTable !==
        LOCATION_TABLE ||
      finalForeignKeys[0].referencedColumn !== "id" ||
      finalForeignKeys[0].updateRule !== "CASCADE" ||
      !["RESTRICT", "NO ACTION"].includes(
        finalForeignKeys[0].deleteRule
      )
    ) {
      throw new Error(
        "Foreign key verification failed."
      );
    }

    console.log("Foreign key verified.");

    // ========================================
    // VERIFY EXISTING BOOKING RECORDS
    // ========================================

    const summary =
      await getBookingSummary();

    if (
      String(before.totalBookings) !==
      String(summary.totalBookings)
    ) {
      throw new Error(
        "Booking count changed during migration. Please investigate."
      );
    }

    // ========================================
    // SUCCESS SUMMARY
    // ========================================

    console.log("");
    console.log("==========================================");
    console.log("MIGRATION COMPLETED SUCCESSFULLY");
    console.log("==========================================");

    console.table({
      totalBookings: summary.totalBookings,

      assignedBookings:
        summary.assignedBookings,

      unassignedBookings:
        summary.unassignedBookings,

      snapshotBookings:
        summary.snapshotBookings,
    });

    console.log("");
    console.log("Existing booking count preserved.");

    console.log(
      "No historical pickup locations were automatically assigned."
    );

  } catch (error) {
    console.error("");
    console.error("==========================================");
    console.error("MIGRATION FAILED");
    console.error("==========================================");

    console.error(error.message);

    console.error(
      "Some database changes may already have been applied."
    );

    process.exitCode = 1;

  } finally {
    await sequelize.close();

    console.log("");
    console.log("Database connection closed.");
  }
}

// ==========================================
// EXECUTE MIGRATION
// ==========================================

migrateBookingLocations();