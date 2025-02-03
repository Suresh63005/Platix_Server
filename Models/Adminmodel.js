const { Model, DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const { sequelize } = require("../config/db");

class Admin extends Model {
  // Method to hash the password before saving
  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  // Instance method to check if password matches
  async validatePassword(password) {
    return bcrypt.compare(password, this.password);
  }
}

// Define Admin model
Admin.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true, // Automatically increments ID
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      unique: true, // Ensure email is unique
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Admin", // Table name will be 'admins'
    timestamps: true, // Optionally, add createdAt and updatedAt
  }
);

// Hash password before creating or updating
Admin.beforeCreate(async (admin) => {
  admin.password = await Admin.hashPassword(admin.password);
});

Admin.beforeUpdate(async (admin) => {
  if (admin.changed("password")) {
    admin.password = await Admin.hashPassword(admin.password);
  }
});

module.exports = Admin;
