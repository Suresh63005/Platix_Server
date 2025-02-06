
const { sequelize } = require("../config/db");
const { Op } = require("sequelize");
const asyncHandler = require("../Middlewares/errorHandler")
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

const getAll=asyncHandler(async(req,res)=>{
    const {page=1,limit=10,filter="",search=""}=req.query;
    const offset=(page-1)*limit
    const whereCondititon={}  
    if(search){
      whereCondititon.name={
        [Op.like]:`%${search}%`
      }
    }
    if(filter){
      whereCondititon.type=filter
    }
    const {rows:organizations,count:total}=await Organization.findAndCountAll({
      where:whereCondititon,
      limit:parseInt(limit),
      offset:parseInt(offset),
      order: [["createdAt", "DESC"]],
    })
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
})

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

// const upsertOrganizations = asyncHandler(async (req, res) => {
//   // Validation logic (uncomment when validation schema is available)
//   // const { error } = upsertOrganizationSchema.validate(req.body);
//   // if (error) {
//   //   return res.status(400).json({ message: error.details[0].message });
//   // }

//   const {
//     id,
//     address,
//     businessName,
//     description,
//     designation,
//     email,
//     googleCoordinates,
//     gstNumber,
//     mobile,
//     name,
//     registrationId,
//     type,
//     whatsapp,
//     bankName,
//     accountNumber,
//     accountHolder,
//     ifscCode,
//     upiId,
//     admin_id, // Make sure admin_id is captured here
//     services // services array
//   } = req.body;

//   console.log("Request Body:", req.body);
//   console.log("Uploaded Files:", req.files);

//   let file1 = null;
//   let file2 = [];

//   // Upload file1 to S3 (single file)
//   if (req.files && req.files.file1) {
//     file1 = await uploadToS3(req.files.file1[0], "organization");
//   }

//   // Upload file2 to S3 (multiple files)
//   if (req.files && req.files.file2) {
//     for (const file of req.files.file2) {
//       const uploadedUrl = await uploadToS3(file, "Extraorganization");
//       file2.push(uploadedUrl);
//     }
//   }

//   // Check if the organization exists (for update)
//   const organization = id ? await Organization.findByPk(id) : null;

//   if (organization) {
//     // Update existing organization
//     organization.address = address;
//     organization.businessName = businessName;
//     organization.description = description;
//     organization.designation = designation;
//     organization.email = email;
//     organization.googleCoordinates = JSON.parse(googleCoordinates);
//     organization.gstNumber = gstNumber;
//     organization.mobile = mobile;
//     organization.name = name;
//     organization.registrationId = registrationId;
//     organization.type = type;
//     organization.whatsapp = whatsapp;
//     organization.bankName = bankName;
//     organization.accountNumber = accountNumber;
//     organization.accountHolder = accountHolder;
//     organization.ifscCode = ifscCode;
//     organization.upiId = upiId;
//     organization.admin_id = admin_id; // Added admin_id here
//     organization.file1 = file1 || organization.file1;
//     organization.file2 = file2.length > 0 ? file2.join(",") : organization.file2;

//     await organization.save();

//     // Handle services (if provided)
//     if (services && Array.isArray(services)) {
//       // First, delete existing services for this organization (if any)
//       await TblOrganization_Service.destroy({ where: { organization_id: organization.id } });

//       // Now, insert new services for the organization
//       for (const service of services) {
//         const serviceRecord = await Services.findOne({ where: { name: service.name } });

//         if (serviceRecord) {
//           await TblOrganization_Service.create({
//             organization_id: organization.id,
//             service_id: serviceRecord.id,
//             price: service.price
//           });
//         }
//       }
//     }

//     return res.status(200).json({ message: "Organization updated successfully", data: organization });
//   } else {
//     // Create new organization
//     const newOrganization = await Organization.create({
//       address,
//       businessName,
//       description,
//       designation,
//       email,
//       googleCoordinates: JSON.parse(googleCoordinates),
//       gstNumber,
//       mobile,
//       name,
//       registrationId,
//       type,
//       whatsapp,
//       bankName,
//       accountNumber,
//       accountHolder,
//       ifscCode,
//       upiId,
//       admin_id, // Added admin_id here
//       file1,
//       file2: file2.join(","),
//     });

//     // Handle services for the new organization
//     if (services && Array.isArray(services)) {
//       for (const service of services) {
//         const serviceRecord = await Services.findOne({ where: { name: service.name } });

//         if (serviceRecord) {
//           await TblOrganization_Service.create({
//             organization_id: newOrganization.id,
//             service_id: serviceRecord.id,
//             price: service.price
//           });
//         }
//       }
//     }

//     res.status(201).json({ message: "Organization created successfully", data: newOrganization });
//   }
// });