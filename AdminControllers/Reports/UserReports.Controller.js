const { formatDateFields } = require("../../helper/formatedDate");
const Roles = require("../../Models/TblRoles.model");
const TblOrganizationType = require("../../Models/TblOrganizationType.model");
const { sequelize } = require("../../config/db");
const { Op, where } = require("sequelize");
const Organization = require("../../Models/Organization.model");
const User = require("../../Models/ReportsModel/User.model");

const getAllUsers = async (req, res) => {
    try {
      const { page = 1, limit = 10, filter = "", search = "" } = req.params;
      const offset = (page - 1) * limit;
  
      const whereCondition = {};
  
      // Add search condition if search query exists
      if (search) {
        whereCondition[Op.or] = [
            { "$role.rolename$": { [Op.like]: `%${search}%` } },
            { firstName: { [Op.like]: `%${search}%` } },
            { lastName: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { mobileNo: { [Op.like]: `%${search}%` } }
        ];
    }
  
      // Add filter condition (role filter) if filter is provided
      if (filter) {
        whereCondition.role_id = filter;
      }
  
      // Query the users with pagination and filters
      const users = await User.findAndCountAll({
        where: whereCondition,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["createdAt", "DESC"]],
        include: {
          model: Roles,
          as: 'role',
          attributes: ['id', 'rolename'],
        },
      });
  
      // Format the users
      const formattedUsers = users.rows.map(user => {
        const userJson = user.toJSON();
        return {
          ...formatDateFields(userJson, ["createdAt"]),
          Username: `${userJson.firstName} ${userJson.lastName}`,
          Role: userJson.role ? userJson.role.rolename : null,
        };
      });
  
      // Send the response with the formatted users and pagination info
      res.status(200).json({
        users: formattedUsers,
        pagination: {
          total: users.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(users.count / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  };
  

  const getAllUsersByOrganizationName = async (req, res) => {
    try {
        const { organization_id } = req.params;
        const { page = 1, limit = 10, search = "", filter = "" } = req.query;
        const offset = (page - 1) * limit;
        
        // Check if the organization exists
        const organization = await Organization.findOne({ where: { id: organization_id } });
        if (!organization) {
            return res.status(404).json({ message: "Organization not found" });
        }

        const whereCondition = { organization_id };

        // Apply search filter
        if (search) {
            whereCondition[Op.or] = [
                { "$role.rolename$": { [Op.like]: `%${search}%` } },
                { firstName: { [Op.like]: `%${search}%` } },
                { lastName: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
                { mobileNo: { [Op.like]: `%${search}%` } }
            ];
        }
        if (filter && filter !== "all") {
            whereCondition.role_id = filter;
        }
        // Apply role filter
        if (filter) {
            whereCondition.role_id = filter;
        }

        // Fetch users with pagination and filters
        const users = await User.findAndCountAll({
            where: whereCondition,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [["createdAt", "DESC"]],
            include: {
                model: Roles,
                as: 'role',
                attributes: ['id', 'rolename']
            }
        });

        // Format user data
        const formattedUsers = users.rows.map(user => {
            const userJson = user.toJSON();
            return {
                ...formatDateFields(userJson, ["createdAt"]),
                Username: `${userJson.firstName} ${userJson.lastName}`,
                Role: userJson.role ? userJson.role.rolename : null
            };
        });

        // Send response
        res.status(200).json({
            users: formattedUsers,
            pagination: {
                total: users.count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(users.count / limit)
            }
        });
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
        // organizationType_id =2,
        organization_id 
    } = req.body;
    // console.log(req.body)
    const t = await sequelize.transaction();
    try {
        let user;

        // Check if 'id' is provided for updating an existing user
        if (id) {
            // Update existing user
            user = await User.findByPk(id,{transaction:t});
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
                // organizationType_id,
                organization_id
            });
            await t.commit()
            return res.status(200).json({ message: "User updated successfully", user });
        } else {
            // Create new user
            user = await User.create({
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
                // organizationType_id,
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
    const user=await User.findByPk(id,{
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
    const formattedUser=formatDateFields(user.toJSON(),['dateOfBirth'])
    res.json({user:formattedUser});
}

const deleteUser = async (req, res) => {
    const { id } = req.params;
    const { forceDelete } = req.query;

    const t = await sequelize.transaction(); // Start transaction

    try {
        // is used to tell Sequelize that the query (findByPk(id)) should be executed within the scope of the transaction t
        const user = await User.findOne({ where: { id }, transaction: t });

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

const filterByDate = async (req, res) => {
    try {
        const { fromDate, toDate } = req.params;
        // console.log(req.params)

        if (!fromDate || !toDate) {
            return res.status(400).json({ message: "Both fromDate and toDate are required." });
        }

        const from = new Date(fromDate); // with time zone
        const to = new Date(toDate);

        if (isNaN(from.getTime()) || isNaN(to.getTime())) {
            return res.status(400).json({ message: "Invalid date format." });
        }
        to.setHours(23, 59, 59, 999); // h-m-s-ms
        const users = await User.findAll({
            where: {
                createdAt: {
                    [Op.gte]: from, 
                    [Op.lte]: to    
                }
            },
            include: {
                model: Roles,
                as: 'role',
                attributes: ['id', 'rolename']
            }
        });

        // Convert users to JSON and format dates
        const formattedUsers = users.map(user => {
            const userJson = user.toJSON();
            const formattedUser = formatDateFields(userJson, ["createdAt"]);

            return {
                ...formattedUser,
                Username: `${userJson.firstName} ${userJson.lastName}`,
                Role: userJson.role ? userJson.role.rolename : null
            };
        });

        res.json({ users: formattedUsers });

    } catch (error) {
        console.error("Error fetching users by date:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports={getAllUsers,CreateUser,getById,deleteUser,filterByDate,getAllUsersByOrganizationName};