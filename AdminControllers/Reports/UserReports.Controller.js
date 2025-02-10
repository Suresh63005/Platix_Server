const UserReports=require("../../Models/ReportsModel/User.model")
const { formatDateFields } = require("../../helper/formatedDate");
const Roles = require("../../Models/TblRoles.model");
const TblOrganizationType = require("../../Models/TblOrganizationType.model");
const { sequelize } = require("../../config/db");

const getAllUsers =async (req, res) => {
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
                Role: userJson.role ? userJson.role.rolename : null 
            };
        });

        console.log(formattedUsers);
        res.json({ users: formattedUsers });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


const CreateUser = async (req, res) => {
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
    // console.log(req.body)
    const t = await sequelize.transaction();
    try {
        let user;

        // Check if 'id' is provided for updating an existing user
        if (id) {
            // Update existing user
            user = await UserReports.findByPk(id,{transaction:t});
            if (!user) {
                await t.rollback();
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
            await t.commit()
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
            await t.commit()
            return res.status(201).json({ message: "User created successfully", user });
        }
    } catch (error) {
        await t.rollback();
        console.error("Error processing user:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

const getById=async(req,res)=>{
    const { id }=req.params;
    const t = await sequelize.transaction();
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
        ],
        transaction:t
    });
    if(!user){
        await t.rollback();
        return res.status(404).json({message:"User not found"});
    }
    // console.log(user)
    await t.commit()
    res.json({user});
}

const deleteUser = async (req, res) => {
    const { id } = req.params;
    const { forceDelete } = req.query;

    const t = await sequelize.transaction(); // Start transaction

    try {
        // is used to tell Sequelize that the query (findByPk(id)) should be executed within the scope of the transaction t
        const user = await UserReports.findOne({ where: { id }, transaction: t });

        if (!user) {
            await t.rollback(); // Rollback if user not found
            return res.status(404).json({ message: "User not found" });
        }

        if (user.deletedAt && forceDelete !== "true") {
            await t.rollback(); // Rollback if user already deleted
            return res.status(400).json({ message: "User already deleted" });
        }

        if (forceDelete === "true") {
            await user.destroy({ force: true, transaction: t });
            await t.commit(); // Commit if permanently deleted
            return res.json({ message: "User permanently deleted successfully!" });
        } else {
            await user.destroy({ transaction: t });
            await t.commit(); // Commit if soft-deleted
            return res.json({ message: "User soft-deleted successfully!" });
        }

    } catch (error) {
        await t.rollback(); // Rollback in case of error
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

module.exports={getAllUsers,CreateUser,getById,deleteUser};