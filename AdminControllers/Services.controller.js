const asyncHandler = require("../Middlewares/errorHandler");
const Services = require("../Models/TblServices.model");
const { formatDateFields } = require("../helper/formatedDate");

// Controller to create a new service
const createservice = async (req, res) => {
  const { servicename, servicedescription, fromdate, todate } = req.body;  // Fixed typo

  try {
    // Check if the service already exists
    const existingservice = await Services.findOne({ where: { servicename } });
    if (existingservice) {
      return res.status(400).json({ message: "Service already exists" });
    }

    // Create the new service record
    const newservice = await Services.create({ servicename, servicedescription, fromdate, todate });

    // Format the date fields before sending the response
    const formattedService = formatDateFields(newservice.toJSON(), ["fromdate", "todate"]);

    res.status(201).json({ message: "Service created successfully", service: formattedService });
  } catch (error) {
    console.error(error.stack);  // Log the full error stack for debugging
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Controller to view all services
const viewservice = async (req, res) => {
  try {
    // Fetch all services from the database
    const services = await Services.findAll();

    if (services.length === 0) {
      return res.status(404).json({ message: "No services found" });  // Changed message to be more specific
    }

    // Format the date fields before sending the response
    const formattedServices = formatDateFields(services.map((service) => service.toJSON()), ["fromdate", "todate"]);

    res.status(200).json({ services: formattedServices });
  } catch (error) {
    console.error(error.stack);  // Log the full error stack for debugging
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { createservice, viewservice };
