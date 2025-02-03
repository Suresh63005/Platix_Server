const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const { sequelize } = require("../config/db");

// Define Admin model
const Admin = sequelize.define(
  "Admin",
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4, // Corrected
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "Admins",
    timestamps: true,
    paranoid: true, // Soft deletes: includes deletedAt field
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
  }
);

// Get salt rounds from environment variable (fallback to 10)
const SALT_ROUNDS = parseInt(process.env.SALT, 10) || 10;

// Hash password before saving to the database
Admin.beforeCreate(async (admin) => {
  admin.password = await bcrypt.hash(admin.password, SALT_ROUNDS);
});

Admin.beforeUpdate(async (admin) => {
  if (admin.changed("password")) {
    admin.password = await bcrypt.hash(admin.password, SALT_ROUNDS);
  }
});


Admin.prototype.validatePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = Admin;
