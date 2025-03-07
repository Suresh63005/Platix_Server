const { formatDateFields } = require("../helper/formatedDate");
const asyncHandler = require("../Middlewares/errorHandler");
const { ServiceDeleteSchema,ServiceSchema } = require("../Middlewares/validation");
const TblOrganizationType = require("../Models/TblOrganizationType.model");
const Services = require("../Models/TblServices.model");
const { Op, Sequelize } = require("sequelize");

// Upsert (Create or Update) Service
const upsertService = asyncHandler(async (req, res) => {
    // const { error } = ServiceSchema.validate(req.body);
    // if (error) {
    //     return res.status(400).json({ message: error.details[0].message });
    // }
    
    const { id, servicename,servicedescription, fromdate, todate } = req.body;
    console.log(req.body)
    let service;
    if (id) {
        service = await Services.findByPk(id);
        if (!service) {
            return res.status(404).json({ error: "Service not found" });
        }
        await service.update({ servicename, servicedescription, fromdate, todate });
    } else {
        service = await Services.create({ servicename, servicedescription, fromdate, todate });
    }
    
    res.status(200).json({ 
        message: id ? "Service updated successfully" : "Service created successfully", 
        service 
    });
});

// Delete Service (Soft or Permanent)
const deleteService = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { forceDelete } = req.query;
  
  // Log the ID to ensure it's being passed correctly
  console.log("Service ID received on backend:", id);
  
  const { error } = ServiceDeleteSchema.validate({ id, forceDelete });
  if (error) {
    return res.status(400).json({ error: "Invalid ID or forceDelete value" });
  }
  
  const service = await Services.findOne({ where: { id }, paranoid: false });
  if (!service) {
    return res.status(404).json({ error: "Service not found!" });
  }

  if (forceDelete === "true") {
    await service.destroy({ force: true });
    return res.status(200).json({ message: "Service permanently deleted successfully!" });
  } 

  if (service.deletedAt) {
    return res.status(400).json({ error: "Service is already soft deleted." });
  }

  await service.destroy();
  res.status(200).json({ message: "Service soft-deleted successfully." });
});

// Get All Services with Pagination and Filtering
const getAllServices = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, filter = '', search = '' } = req.query;
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const offset = (pageNumber - 1) * pageSize;
    
    let whereConditions = {};
    
    if (filter) {
        whereConditions.id = filter;
    }

    if (search) {
      whereConditions[Op.or] = [
        { servicename: { [Op.like]: `%${search}%` } },
        Sequelize.where(
          Sequelize.fn("DATE_FORMAT", Sequelize.col("createdAt"), "%Y-%m-%d"),
          { [Op.like]: `%${search}%` }
        ),
        Sequelize.where(
          Sequelize.fn("DATE_FORMAT", Sequelize.col("fromdate"), "%Y-%m-%d"),
          { [Op.like]: `%${search}%` }
        ),
        Sequelize.where(
          Sequelize.fn("DATE_FORMAT", Sequelize.col("todate"), "%Y-%m-%d"),
          { [Op.like]: `%${search}%` }
        )
      ];
    }

    const organizationtype = await TblOrganizationType.findAll({})


    
    
    const { count, rows: services } = await Services.findAndCountAll({
        where: whereConditions,
        offset,
        limit: pageSize,
        order: [['createdAt', 'DESC']],
    });
    
    const formattedServices = formatDateFields(services.map(service => service.toJSON()), ["fromdate", "todate"]);

      let serviceswithOrgType;

      formattedServices.forEach(service => {
        serviceswithOrgType = organizationtype.filter(org => org.service_id.includes(service.id))
        service.organizationType = serviceswithOrgType.map(org => org.organizationType);

      })
    
    res.status(200).json({
        services: formattedServices,
        totalPages: Math.ceil(count / pageSize),
        totalCount: count,
    });
});
const getorgAllServices = asyncHandler(async (req, res) => {
  
  const currentDate = new Date();

  const whereConditions = {
      [Op.or]: [
          { todate: { [Op.is]: null } },  
          { todate: { [Op.gte]: currentDate } }  
      ]
  };

  
  const services = await Services.findAll({
      where: whereConditions,
      order: [['createdAt', 'DESC']],
  });

      return res.status(200).json({ 
        message: "Service Retrieved",
        services: services
       });


 
});


const serviceGetByid = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Find the service by ID
  const service = await Services.findByPk(id);

  // If not found, return 404
  if (!service) {
    return res.status(404).json({ error: "Service not found" });
  }

  // Format the date fields
  const formattedService = formatDateFields(service.toJSON(), ["fromdate", "todate"]);

  // Send response with formatted service
  res.status(200).json({
    message: "Service Retrieved",
    data: formattedService
  });
});

module.exports = { upsertService, deleteService, getAllServices,serviceGetByid,getorgAllServices };
