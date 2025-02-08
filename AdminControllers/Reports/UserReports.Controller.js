const UserReports=require("../../Models/ReportsModel/User.model")
const asyncHandler = require("../../Middlewares/errorHandler");
const { formatDateFields } = require("../../helper/formatedDate");
const Roles = require("../../Models/TblRoles.model");
const TblOrganizationType = require("../../Models/TblOrganizationType.model");

const getAllUsers = asyncHandler(async (req, res) => {
    try {
        const users = await UserReports.findAll({
            include: {
                model: Roles, 
                as: 'role', 
                attributes: ['id', 'rolename'] 
            }
        });

        // Convert users to JSON and format dates
        const formattedUsers = users.map(user => {
            const userJson = user.toJSON();
            return {
                ...formatDateFields(userJson, ["createdAt"]), 
                Username: `${userJson.firstName} ${userJson.lastName}`,
                Role: userJson.role ? userJson.role.rolename : null // Add role name
            };
        });

        console.log(formattedUsers);
        res.json({ users: formattedUsers });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});


const CreateUser = asyncHandler(async (req, res) => {
    const {
        id, 
        prefix,
        firstName,
        lastName,
        email,
        mobileNo,
        whatsappNo,
        role_id,
        dateOfBirth,
        address = "SR NAGAR",
        startDate = "2021-09-01", // Fixed incorrect backticks
        designation,
        organizationType_id,
        organization_id = 2 // Default to null if not provided
    } = req.body;
    console.log(req.body)
    try {
        let user;

        // Check if 'id' is provided for updating an existing user
        if (id) {
            // Update existing user
            user = await UserReports.findByPk(id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            // Perform the update operation
            await user.update({
                prefix,
                firstName,
                lastName,
                email,
                mobileNo,
                whatsappNo,
                role_id,
                dateOfBirth,
                address,
                startDate :startDate || "2021-09-01",
                designation,
                organizationType_id,
                organization_id
            });

            return res.status(200).json({ message: "User updated successfully", user });
        } else {
            // Create new user
            user = await UserReports.create({
                prefix,
                firstName,
                lastName,
                email,
                mobileNo,
                whatsappNo,
                role_id,
                dateOfBirth,
                address,
                startDate,
                designation,
                organizationType_id,
                organization_id
            });

            return res.status(201).json({ message: "User created successfully", user });
        }
    } catch (error) {
        console.error("Error processing user:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

const getById=asyncHandler(async(req,res)=>{
    const { id }=req.params;
    const user=await UserReports.findByPk(id,{
        include:[
            {
                model:Roles,
                as:"role",
                attributes:["id","rolename"]
            },
            {
                model:TblOrganizationType,
                as:"organizationType1",
                attributes:["id","organizationType"]
            }
        ]
    });
    if(!user){
        return res.status(404).json({message:"User not found"});
    }
    console.log(user)
    res.json({user});
})

const deleteUser=asyncHandler(async(req,res)=>{
    const { id }=req.params;
    const { forceDelete}=req.query;

    const user=await UserReports.findOne({where:{id}});
    if(!user){
        return res.status(404).json({message:"User not found"});
    }

    if(user.deleteAt && forceDelete !== "true"){
        return res.status(400).json({message:"User already deleted"});
    }

    if(forceDelete === "true"){
        await user.destroy({force:true});
        return res.json({message:"User permanently deleted successfully!"})
    }else{
        await user.destroy();
        return res.json({message:"User soft-deleted successfully!"})
    }
})

module.exports={getAllUsers,CreateUser,getById,deleteUser};