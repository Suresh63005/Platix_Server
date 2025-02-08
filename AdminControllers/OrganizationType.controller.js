const { formatDate, formatDateFields } = require("../helper/formatedDate");
const asyncHandler = require("../Middlewares/errorHandler")
const { organizationTypeSchema, organizationTypeDeleteSchema } = require("../Middlewares/validation")
const OrganizationType=require("../Models/TblOrganizationType.model")
const { Op } = require("sequelize");

const OrganizationTypeUpsert=asyncHandler(async(req,res)=>{
    // const {error}=organizationTypeSchema.validate(req.body)
    // if(error){
    //     return res.status(400).json({ message: error.details[0].message });
    // }
    const {id,organizationType,description,fromDate,toDate}=req.body
    console.log(req.body)

    if(id){
        const organization=await OrganizationType.findByPk(id)
        if (!organization) {
            return res.status(404).json({ error: "Organization not found" });
        }

        organization.organizationType=organizationType
        organization.description=description
        organization.fromDate=fromDate
        organization.toDate=toDate
        
        await organization.save();
        return res.status(200).json({ message: "organization updated successfully", organization });
    }else{
        const organization=await OrganizationType.create({
            organizationType,
            description,
            fromDate,
            toDate
        })

        return res.status(201).json({ message: "organization created successfully", organization });
    }
})

const organizationDelete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { forceDelete } = req.query;
  
    const { error } = organizationTypeDeleteSchema.validate({ id, forceDelete });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
  
    const organization = await OrganizationType.findOne({ where: { id }, paranoid: false });
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
});

const getAll = asyncHandler(async (req, res) => {
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
            ["fromDate", "toDate",]
        )

        // Send back the response with the organization data and total count
        res.status(200).json({
            results: formattedOrganizations,
            totalCount: totalCount,
        });
});

const organizationGetByid=asyncHandler(async(req,res)=>{
    const { id }=req.params;
    const organizationtype=await OrganizationType.findByPk(id);
    if(!organizationtype){
        return res.status(404).json({message:"Organization not found"});
    }
    res.json({data:organizationtype});
})

module.exports={OrganizationTypeUpsert,organizationDelete,getAll,organizationGetByid}