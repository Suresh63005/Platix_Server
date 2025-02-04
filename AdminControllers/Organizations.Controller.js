const { Op } = require("sequelize");
const asyncHandler = require("../Middlewares/errorHandler")
const Organization=require("../Models/Organization.model")
const uploadToS3 = require("../config/fileUpload.aws");
// Upsert (Create or Update) Organization
const upsertOrganizations = asyncHandler(async (req, res) => {
    const {
      id,
      address,
      businessName,
      description,
      designation,
      email,
      googleCoordinates,
      gstNumber,
      mobile,
      name,
      registrationId,
      type,
      whatsapp,
    } = req.body;

    console.log("Request Body:", req.body);
    console.log("Uploaded Files:", req.files);

    let file1 = null;
    let file2 = [];

    // Upload file1 to S3 (single file)
    if (req.files && req.files.file1) {
      file1 = await uploadToS3(req.files.file1[0], "organization");
    }

    // Upload file2 to S3 (multiple files)
    if (req.files && req.files.file2) {
      for (const file of req.files.file2) {
        const uploadedUrl = await uploadToS3(file, "Extraorganization");
        file2.push(uploadedUrl);
      }
    }

    // Check if the organization exists (for update)
    const organization = id ? await Organization.findByPk(id) : null;

    if (organization) {
      // Update organization
      organization.address = address;
      organization.businessName = businessName;
      organization.description = description;
      organization.designation = designation;
      organization.email = email;
      organization.googleCoordinates = JSON.parse(googleCoordinates);
      organization.gstNumber = gstNumber;
      organization.mobile = mobile;
      organization.name = name;
      organization.registrationId = registrationId;
      organization.type = type;
      organization.whatsapp = whatsapp;
      organization.file1 = file1 || organization.file1; 
      organization.file2 = file2.length > 0 ? file2.join(",") : organization.file2;

      await organization.save();
      return res.status(200).json({ message: "Organization updated successfully", data: organization });
    } else {
      // Create new organization
      const newOrganization = await Organization.create({
        address,
        businessName,
        description,
        designation,
        email,
        googleCoordinates: JSON.parse(googleCoordinates),
        gstNumber,
        mobile,
        name,
        registrationId,
        type,
        whatsapp,
        file1,
        file2: file2.join(","),
      });

      res.status(201).json({ message: "Organization created successfully", data: newOrganization });
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
  const {id}=req.params;
  const organization=await Organization.findByPk(id)
  if(!organization){
    return res.status(404).json({error:"Organization not found"})
  }
  res.status(200).json({message:"Organization Retrieved",data:organization})
})

module.exports={upsertOrganizations,getAll,deleteOrganization,organizationGetByid}