const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const { sequelize } = require("../config/db");

const Admin = sequelize.define(
  "Admin",
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true,
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
    profileImage: {
      type: DataTypes.STRING, // Store image URL
      allowNull: true,
    },
  },
  {
    tableName: "Admins",
    timestamps: true,
    paranoid: true,
    charset: "utf8mb4",
    collate: "utf8mb4_general_ci",
  }
);

const SALT_ROUNDS = parseInt(process.env.SALT, 10) || 10;

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
