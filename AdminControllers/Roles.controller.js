const Roles = require("../Models/TblRoles.model"); // Path to your Roles model
const { formatDateFields } = require("../helper/formatedDate"); // Import the date helper

// Controller to create a new role
const createRole = async (req, res) => {
  const { rolename, fromdate, todate } = req.body;

  try {
    // Check if the role already exists
    const existingRole = await Roles.findOne({ where: { rolename } });
    if (existingRole) {
      return res.status(400).json({ message: "Role already exists" });
    }

    // Create new role
    const newRole = await Roles.create({ rolename, fromdate, todate });

    // Format date fields before sending response
    const formattedRole = formatDateFields(newRole.toJSON(), ["fromdate", "todate"]);

    res.status(201).json({ message: "Role created successfully", role: formattedRole });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Controller to view all roles
const viewRoles = async (req, res) => {
  try {
    // Fetch all roles from the database
    const roles = await Roles.findAll();
    if (roles.length === 0) {
      return res.status(404).json({ message: "No roles found" });
    }

    // Format date fields before sending response
    const formattedRoles = formatDateFields(roles.map(role => role.toJSON()), ["fromdate", "todate"]);

    res.status(200).json({ roles: formattedRoles });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { createRole, viewRoles };
