const asyncHandler = require("../Middlewares/errorHandler");
const Roles = require("../Models/TblRoles.model"); // Path to your Roles model
const { formatDateFields } = require("../helper/formatedDate"); // Import the date helper

// Controller to create a new role
const createRole = async (req, res) => {
  const { id, rolename, fromdate, todate } = req.body;

  try {
    if (id) {
      // Update role if ID exists
      const existingRole = await Roles.findByPk(id);
      if (!existingRole) {
        return res.status(404).json({ message: "Role not found" });
      }

      await existingRole.update({ rolename, fromdate, todate });
      const formattedRole = formatDateFields(existingRole.toJSON(), ["fromdate", "todate"]);
      return res.status(200).json({ message: "Role updated successfully", role: formattedRole });
    }

    // Check if the role with the same name already exists
    const duplicateRole = await Roles.findOne({ where: { rolename } });
    if (duplicateRole) {
      return res.status(400).json({ message: "Role already exists" });
    }

    // Create new role if ID is not provided
    const newRole = await Roles.create({ rolename, fromdate, todate });
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

    res.status(200).json({ formattedRoles });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getById=asyncHandler(async(req,res)=>{
  const { id }=req.params;
  const role=await Roles.findByPk(id);
  
  if(!role){
    return res.json(404).status({message:"Role not found"})
  }
  return res.status(200).json({role})
})

const deleteRole=asyncHandler(async(req,res)=>{
  const { id }=req.params;
  const {forceDelete }=req.query;
  const role=await Roles.findOne({where:{id}});

  if(!role.deleteAt && forceDelete !== "true"){
    return res.status(400).json({message:"Role already soft-deleted"})
  }

  if(forceDelete === "true"){
    await role.destroy({force:"true"});
    return res.status(200).json({message:"Role permanently deleted successfully!"})
  }else{
    await role.destroy();
    return res.status(200).json({message:"Role soft-deleted successfully!"})
  }
})
module.exports = { createRole, viewRoles };
