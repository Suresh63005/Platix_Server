const { sequelize } = require("../config/db");
const { formatDate, formatDateFields } = require("../helper/formatedDate");
const { organizationTypeSchema, organizationTypeDeleteSchema } = require("../Middlewares/validation")
const OrganizationType=require("../Models/TblOrganizationType.model")
const { Sequelize, Op } = require('sequelize');
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
            paranoid: true, 
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

        if (filter && filter !== "all") { 
            whereConditions.organizationType = filter; 
        }

        if (search) {
            whereConditions[Op.or] = [
                { organizationType: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } },
                Sequelize.where(
                    Sequelize.fn("DATE_FORMAT", Sequelize.col("createdAt"), "%Y-%m-%d"),
                    { [Op.like]: `%${search}%` }
                ),
                Sequelize.where(
                    Sequelize.fn("DATE_FORMAT", Sequelize.col("fromDate"), "%Y-%m-%d"),
                    { [Op.like]: `%${search}%` }
                ),
                Sequelize.where(
                    Sequelize.fn("DATE_FORMAT", Sequelize.col("toDate"), "%Y-%m-%d"),
                    { [Op.like]: `%${search}%` }
                ),
            ];
        }

        console.log("whereConditions:", JSON.stringify(whereConditions, null, 2));

        // Get the total count of matching organization types
        const totalCount = await OrganizationType.count({ where: whereConditions });

        // Get the paginated results
        const organizations = await OrganizationType.findAll({
            where: whereConditions,
            offset,
            limit: pageSize,
            order: [['createdAt', 'DESC']], 
        });

        // Convert to JSON and parse service_id
        const formattedOrganizations = await Promise.all(
            organizations.map(async (org) => {
                const orgData = org.toJSON();

                orgData.fromDate = formatDate(orgData.fromDate);
                orgData.toDate = formatDate(orgData.toDate);
                
                try {
                    orgData.service_id = orgData.service_id 
                        
                } catch (error) {
                    console.error("Invalid JSON in service_id:", orgData.service_id);
                    orgData.service_id = [];
                }

                // Fetch service names in a single query
                if (orgData.service_id.length > 0) {
                    const services = await Service.findAll({
                        where: { id: orgData.service_id },
                        attributes: ["id", "servicename"],
                    });
                    orgData.services = services.map(service => ({
                        id: service.id,
                        servicename: service.servicename
                    }));
                } else {
                    orgData.services = [];
                }

                return orgData;
            })
        );

        // Send back the response with the organization data and total count
        console.log(formattedOrganizations)
        return res.status(200).json({
            results: formattedOrganizations,
            totalCount: totalCount,
        });

    } catch (error) {
        console.error("Error in getAll:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

const assignServiceToOrganization = async (req, res) => {
    try {
        const { organizationType_id, service_id } = req.body;
        
        if (!organizationType_id || !Array.isArray(service_id) || service_id.length === 0) {
            return res.status(400).json({ message: "Organization ID and Service IDs are required." });
        }
        const orgType = await TblOrganizationType.findByPk(organizationType_id);
        
        if (!orgType) {
            return res.status(404).json({ message: "Organization type not found." });
        }

        let existingServices = [];
        if (orgType.service_id) {
            try {
                existingServices = orgType.service_id;
            } catch (error) {
                return res.status(500).json({ message: "Invalid service_id format in database." });
            }
        }

        

        // Merge existing and new services, avoiding duplicates
        const updatedServices = [...new Set([...existingServices, ...service_id])];

        

        // Update the service_id field as a JSON array
        await orgType.update({ service_id: updatedServices });

        return res.status(200).json({
            message: "Service assigned to organization type successfully.",
            orgType
        });
    } catch (error) {
        console.error("Error assigning service to organization type:", error);
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

const getOrganizationService = async (req, res) => {
    try {
      const { service_id } = req.params; 
      
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