const { formatDateFields } = require("../helper/formatedDate");
const asyncHandler = require("../Middlewares/errorHandler");
const { ServiceDeleteSchema,ServiceSchema } = require("../Middlewares/validation");
const Services = require("../Models/TblServices.model");
const { Op } = require("sequelize");

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
        whereConditions.servicename = filter;
    }
    if (search) {
        whereConditions.servicename = { [Op.like]: `%${search}%` };
    }
    
    const { count, rows: services } = await Services.findAndCountAll({
        where: whereConditions,
        offset,
        limit: pageSize,
        order: [['createdAt', 'DESC']],
    });
    
    const formattedServices = formatDateFields(services.map(service => service.toJSON()), ["fromdate", "todate"]);
    
    res.status(200).json({
        services: formattedServices,
        totalPages: Math.ceil(count / pageSize),
        totalCount: count,
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

module.exports = { upsertService, deleteService, getAllServices,serviceGetByid };
