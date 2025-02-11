const { sequelize } = require("../config/db");
const { formatDate, formatDateFields } = require("../helper/formatedDate");
const { organizationTypeSchema, organizationTypeDeleteSchema } = require("../Middlewares/validation")
const OrganizationType=require("../Models/TblOrganizationType.model")
const { Op } = require("sequelize");
const Service = require('../Models/TblServices.model');
const TblOrganizationType = require("../Models/TblOrganizationType.model");

const OrganizationTypeUpsert = async (req, res) => {
    const t = await sequelize.transaction(); // Start transaction

    try {
        const { id, organizationType, description, fromDate, toDate } = req.body;

        if (id) {
            const organization = await OrganizationType.findByPk(id, { transaction: t });

            if (!organization) {
                await t.rollback();
                return res.status(404).json({ error: "Organization not found" });
            }

            organization.organizationType = organizationType;
            organization.description = description;
            organization.fromDate = fromDate;
            organization.toDate = toDate;

            await organization.save({ transaction: t });
            await t.commit(); // Commit transaction

            return res.status(200).json({ message: "Organization updated successfully", organization });

        } else {
            const organization = await OrganizationType.create(
                { organizationType, description, fromDate, toDate },
                { transaction: t }
            );

            await t.commit();
            return res.status(201).json({ message: "Organization created successfully", organization });
        }
    } catch (error) {
        await t.rollback(); // Ensure rollback on error
        console.error("Error in OrganizationTypeUpsert:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

const organizationDelete = async (req, res) => {
    const t = await sequelize.transaction(); // Start transaction

    try {
        const { id } = req.params;
        const { forceDelete } = req.query;

        const { error } = organizationTypeDeleteSchema.validate({ id, forceDelete });
        if (error) {
            await t.rollback(); // Rollback if validation fails
            return res.status(400).json({ error: error.details[0].message });
        }

        const organization = await OrganizationType.findOne({ 
            where: { id }, 
            paranoid: false, 
            transaction: t  // Pass transaction
        });

        if (!organization) {
            await t.rollback(); // Rollback if org not found
            return res.status(404).json({ error: "Organization type not found!" });
        }

        if (organization.deletedAt && forceDelete !== "true") {
            await t.rollback();
            return res.status(400).json({ error: "Organization is already soft deleted." });
        }

        if (forceDelete === "true") {
            await organization.destroy({ force: true, transaction: t }); // Hard delete with transaction
        } else {
            await organization.destroy({ transaction: t }); // Soft delete with transaction
        }

        await t.commit(); // Commit after successful deletion

        return res.status(200).json({ 
            message: forceDelete === "true" 
                ? "Organization permanently deleted successfully!" 
                : "Organization soft-deleted successfully." 
        });
    } catch (error) {
        await t.rollback(); // Ensure rollback on error
        console.error("Error in organizationDelete:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

const getAll = async (req, res) => {
    try {
        const { page = 1, limit = 10, filter = '', search = '' } = req.query;

        // Convert page and limit to integers
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        const offset = (pageNumber - 1) * pageSize;

        // Build filter conditions
        let whereConditions = {};
        if (filter) {
            whereConditions.type = filter;
        }

        if (search) {
            whereConditions.name = {
                [Sequelize.Op.like]: `%${search}%`
            };
        }

        // Get the total count of matching organization types
        const totalCount = await OrganizationType.count({
            where: whereConditions
        });

        // Get the paginated results
        const organizations = await OrganizationType.findAll({
            where: whereConditions,
            offset: offset,
            limit: pageSize,
            order: [['createdAt', 'DESC']], 
        });

        const formattedOrganizations = formatDateFields(
            organizations.map(org => org.toJSON()),
            ["fromDate", "toDate"]
        );

        // Send back the response with the organization data and total count
        return res.status(200).json({
            results: formattedOrganizations,
            totalCount: totalCount,
        });
    } catch (error) {
        console.error("Error in getAll:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

const organizationGetByid = async (req, res) => {
    try {
        const { id } = req.params;
        const organizationtype = await OrganizationType.findByPk(id);
        
        if (!organizationtype) {
            return res.status(404).json({ message: "Organization not found" });
        }

        return res.json({ data: organizationtype });
    } catch (error) {
        console.error("Error in organizationGetByid:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};


const assignServiceToOrganization = async (req, res) => {
    try {
        const { organization_id, service_id } = req.body;

        // Validate input
        if (!organization_id || !service_id) {
            return res.status(400).json({ message: "Organization ID and Service ID are required." });
        }

        // Find the organization type by ID
        const orgType = await TblOrganizationType.findByPk(organization_id);
        if (!orgType) {
            return res.status(404).json({ message: "Organization type not found." });
        }

        // Find the service by ID
        const service = await Service.findByPk(service_id);
        if (!service) {
            return res.status(404).json({ message: "Service not found." });
        }

        // Associate the service with the organization type (Many-to-Many)
        await orgType.addService(service); // This assumes a Many-to-Many relationship with a join table

        // Fetch the updated organization type with associated services
        const updatedOrgType = await TblOrganizationType.findOne({
            where: { id: orgType.id },
            include: [
                {
                    model: Service,
                    as: "services", // Must match alias in associations
                    attributes: ["id", "servicename", "servicedescription", "fromdate", "todate"],
                },
            ],
        });

        await TblOrganizationType.update(
            { service_id: service.id }, // Store service_id
            { where: { id: organization_id } }
        );        

        return res.status(200).json({
            message: "Service assigned to organization type successfully.",
            organizationType: {
                id: updatedOrgType.id,
                name: updatedOrgType.organizationType,
                description: updatedOrgType.description,
                services: updatedOrgType.services, // Multiple services
            },
        });
    } catch (error) {
        console.error("Error assigning service to organization type:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};


const getOrganizationService = async (req, res) => {
    try {
      const { service_id } = req.params; // Extract service_id from request parameters
      
      if (!service_id) {
        return res.status(400).json({ message: "Service ID is required" });
      }
  
      const organizationService = await OrganizationType.findOne({
        where: { service_id }
      });
  
      if (!organizationService) {
        return res.status(404).json({ message: "No organization found for this service ID" });
      }
  
      return res.status(200).json(organizationService);
    } catch (error) {
      console.error("Error fetching organization service:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  };
  
  
module.exports={OrganizationTypeUpsert,organizationDelete,getAll,organizationGetByid,assignServiceToOrganization,getOrganizationService}