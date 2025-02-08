
const { sequelize } = require("../config/db");
const { Op } = require("sequelize");
const asyncHandler = require("../Middlewares/errorHandler")
const TblOrganizationType=require("../Models/TblOrganizationType.model")
const Organization=require("../Models/Organization.model")
const uploadToS3 = require("../config/fileUpload.aws");
const { upsertOrganizationSchema, deleteOrganizationSchema, organizationGetByidSchema } = require("../Middlewares/validation");
const TblOrganization_Service = require("../Models/tblOrganizationService");

// Upsert (Create or Update) Organization
const upsertOrganizations = asyncHandler(async (req, res) => {
    const {
        id, address, businessName, description, designation, email, googleCoordinates,
        gstNumber, mobile, name, registrationId, organizationType_id, whatsapp, bankName, accountNumber,
        accountHolder, ifscCode, upiId, services
    } = req.body;
    console.log(req.body)
    const parsedServices = typeof services === "string" ? JSON.parse(services) : services;
    
    if (!Array.isArray(parsedServices)) {
        return res.status(400).json({ error: "Invalid services format" });
    }

    let file1 = null;
    let file2 = [];

    // Upload file1 to S3 (single file)
    if (req.files?.file1) {
        file1 = await uploadToS3(req.files.file1[0], "organization");
    }

    // Upload file2 to S3 (multiple files)
    if (req.files?.file2) {
        for (const file of req.files.file2) {
            const uploadedUrl = await uploadToS3(file, "Extraorganization");
            file2.push(uploadedUrl);
        }
    }

    const transaction = await sequelize.transaction(); // Start a transaction

    try {
        let organization;

        if (id) {
            // If updating an existing organization
            organization = await Organization.findByPk(id, { transaction });

            if (!organization) {
                await transaction.rollback();
                return res.status(404).json({ error: "Organization not found" });
            }

            await organization.update({
                address, businessName, description, designation, email,
                googleCoordinates: JSON.parse(googleCoordinates),
                gstNumber, mobile, name, registrationId, organizationType_id, whatsapp, 
                bankName, accountNumber, accountHolder, ifscCode, upiId,
                file1: file1 || organization.file1,
                file2: file2.length > 0 ? file2.join(",") : organization.file2
            }, { transaction });

            await transaction.commit();
            return res.status(200).json({ message: "Organization updated successfully", data: organization });
        } else {
            // Create a new organization
            organization = await Organization.create({
                address, businessName, description, designation, email,
                googleCoordinates: JSON.parse(googleCoordinates),
                gstNumber, mobile, name, registrationId, organizationType_id, whatsapp,
                bankName, accountNumber, accountHolder, ifscCode, upiId,
                file1, file2: file2.join(",")
            }, { transaction });

            console.log("Created Organization:", organization); // Log new organization

            const organizationId = organization.id;

            if (parsedServices.length > 0) {
                const serviceData = parsedServices.map(service => ({
                    organization_id: organizationId,
                    service_id: service.id,
                    price: service.price
                }));

                await TblOrganization_Service.bulkCreate(serviceData, { transaction });
            }

            await transaction.commit();
            return res.status(201).json({ message: "Organization created successfully", data: organization });
        }
    } catch (error) {
        console.error("Error inserting/updating organization:", error);
        await transaction.rollback();
        return res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, filter = "", search = "" } = req.query;
  const offset = (page - 1) * limit;

  const whereCondition = {};  

  if (search) {
      whereCondition.name = {
          [Op.like]: `%${search}%`
      };
  }
  if (filter) {
      whereCondition.type = filter;
  }

  try {
      const { rows: organizations, count: total } = await Organization.findAndCountAll({
          where: whereCondition,
          limit: parseInt(limit),
          offset: parseInt(offset),
          order: [["createdAt", "DESC"]],
          include: [
              {
                  model: TblOrganizationType,
                  as: "organizationType",  
                  attributes: ["id", "organizationType"]
              }
          ]
      });

      res.status(200).json({
          message: "All Organizations Retrieved",
          data: organizations,
          pagination: {
              total,
              page: parseInt(page),
              limit: parseInt(limit),
              totalPages: Math.ceil(total / limit),
          },
      });
  } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Server error", error: error.message });
  }
});


const deleteOrganization=asyncHandler(async(req,res)=>{
  const {error}=deleteOrganizationSchema.validate({...req.params,...req.query})
  if(error){
    return res.status(400).json({ message: error.details[0].message });
  }
  const { id } = req.params;
  const { forceDelete } = req.query;
  const organization = await Organization.findOne({ where: { id }, paranoid: false });
    if (!organization) {
      return res.status(404).json({ error: "Organization type not found!" });
    }
  
    if (organization.deletedAt && forceDelete !== "true") {
      return res.status(400).json({ error: "Organization is already soft deleted." });
    }
  
    if (forceDelete === "true") {
      await organization.destroy({ force: true });
      return res.status(200).json({ message: "Organization permanently deleted successfully!" });
    } else {
      await organization.destroy();
      return res.status(200).json({ message: "Organization soft-deleted successfully." });
    }
})

const organizationGetByid=asyncHandler(async(req,res)=>{
  const {error}=organizationGetByidSchema.validate({...req.params})
  if(error){
    return res.status(400).json({ message: error.details[0].message });
  }
  const {id}=req.params;
  const organization=await Organization.findByPk(id)
  if(!organization){
    return res.status(404).json({error:"Organization not found"})
  }
  res.status(200).json({message:"Organization Retrieved",data:organization})
})

module.exports={upsertOrganizations,getAll,deleteOrganization,organizationGetByid}