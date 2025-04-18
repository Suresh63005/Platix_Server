// const { Sequelize } = require("sequelize");
// const dotenv = require("dotenv");
// const mysql2 = require('mysql2');

// // Load environment variables from .env
// dotenv.config();

// // Create Sequelize instance
// const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
//   host: process.env.DB_HOST,
//   port: process.env.DB_PORT,
//   dialect: process.env.DB_DIALECT || "mysql", 
//   logging: false, 
//   timezone: process.env.TIMEZONE,
//   dialectModule: require('mysql2')
// });

// // Test the database connection
// const connectDB = async () => {
//   try {
//     await sequelize.authenticate();
//     console.log("✅ Database connected successfully!");
//   } catch (error) {
//     console.error("❌ Database connection failed:", error.message);
//     process.exit(1); // Exit process if connection fails
//   }
// };

// // Export Sequelize instance & connection function
// module.exports = { sequelize, connectDB };














// const { Sequelize } = require("sequelize");
// const dotenv = require("dotenv");
// const mysql2 = require("mysql2");

// dotenv.config();

// const sequelize = new Sequelize(
//   process.env.DB_NAME,
//   process.env.DB_USER,
//   process.env.DB_PASS,
//   {
//     host: process.env.DB_HOST,
//     port: process.env.DB_PORT,
//     dialect: process.env.DB_DIALECT || "mysql",
//     dialectModule: mysql2,
//     logging: false,
//     timezone: process.env.TIMEZONE || "+05:30",

//     pool: {
//       max: 500,
//       min: 0,
//       acquire: 30000,
//       idle: 10000,
//     },

//     dialectOptions: {
//       timezone: process.env.TIMEZONE || "+05:30",
//       connectTimeout: 10000, // 10 seconds
//       supportBigNumbers: true,
//       bigNumberStrings: true,
//       decimalNumbers: true,

//       // Fix: typeCast should return next() if not matched
//       typeCast: function (field, next) {
//         if (
//           field.type === "DATETIME" ||
//           field.type === "TIMESTAMP" ||
//           field.type === "DATE"
//         ) {
//           return field.string();
//         }
//         return next();
//       },
//     },
//   }
// );

// const connectDB = async () => {
//   try {
//     await sequelize.authenticate();
//     console.log("✅ Database connected successfully!");
//   } catch (error) {
//     console.error("❌ Database connection failed:", error.message);
//     process.exit(1);
//   }
// };

// module.exports = { sequelize, connectDB };





const { Sequelize } = require("sequelize");
const dotenv = require("dotenv");
const mysql2 = require("mysql2");

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT || "mysql",
    dialectModule: mysql2,

    // logging: (msg) => {
    //   console.log(`[Sequelize][${new Date().toISOString()}]: ${msg}`);
    // },
    logging: process.env.DB_LOGGING === "true" ? console.log : false, // Disable logging for production

    pool: {
      max: 500,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },

    // 🌐 Dialect Options
    dialectOptions: {
      timezone: process.env.TIMEZONE || "+05:30",
      connectTimeout: 10000, // 10s timeout
      supportBigNumbers: true,
      bigNumberStrings: true,
      decimalNumbers: true,

      // ✅ Enable SSL (optional)
      ssl: process.env.DB_SSL === "true" && {
        require: true,
        rejectUnauthorized: false, // set to true if you're using a verified certificate
      },

      typeCast: function (field, next) {
        if (
          field.type === "DATETIME" ||
          field.type === "TIMESTAMP" ||
          field.type === "DATE"
        ) {
          return field.string();
        }
        return next();
      },
    },

    timezone: process.env.TIMEZONE || "+05:30",

    retry: {
      max: 3,
      match: [/ETIMEDOUT/, /ECONNREFUSED/, /Connection lost/, /SequelizeConnectionError/],
      backoffBase: 2000, // Initial backoff duration (ms)
      backoffExponent: 1.5, // Exponential backoff factor
    },
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected successfully!");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
};

// 🩺 Health Check Function
const checkDBHealth = async () => {
  try {
    await sequelize.authenticate();
    console.log("🩺 DB is healthy");
    return true;
  } catch (error) {
    console.error("💥 DB health check failed:", error.message);
    return false;
  }
};

module.exports = { sequelize, connectDB, checkDBHealth };
