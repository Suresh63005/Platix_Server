const { Op } = require("sequelize");
const OrderReports = require("../Models/ReportsModel/OrderReport.model");
const TblOrganizationType = require("../Models/TblOrganizationType.model");
const { formatDateFields } = require("../helper/formatedDate");
const Organization = require("../Models/Organization.model");
const Services = require("../Models/TblServices.model");
const TblOrganization_Service = require("../Models/tblOrganizationService");
const OrderServices = require("../Models/ReportsModel/OrderServices.model");

const allOrders = async (req, res) => {
    try {
        // Fetch order counts concurrently
        const orderCounts = await Promise.all([
            OrderReports.count({ where: { orderStatus: "processing" } }), // Active orders
            OrderReports.count({ where: { orderStatus: "completed" } }), // Completed payable bills
            OrderReports.count({ where: { orderStatus: { [Op.in]: ["completed", "cancelled", "processing", "pending"] } } }), // Total orders
            OrderReports.count({ where: { orderStatus: { [Op.in]: ["processing", "pending"] } } }), // Open orders (active + pending)
            OrderReports.count({ where: { orderStatus: { [Op.in]: ["completed", "cancelled"] } } }), // Closed orders
        ]);

        const receivedAmounts = await OrderReports.sum("paidAmount", { where: { orderStatus: { [Op.in]: ["completed", "cancelled", "pending", "processing"] } } });

        // console.log("Total Received Amount:", receivedAmounts); // Debugging log
        const response = {
            activeOrders: orderCounts[0], // Processing orders
            totalPayableBills: orderCounts[1], // Completed orders
            totalOrders: orderCounts[2], // All orders
            openOrders: orderCounts[3], // Processing + Pending
            closedOrders: orderCounts[4], // Completed + Cancelled
            totalReceivedAmount: receivedAmounts || 0, // Total received amount
        };

        return res.status(200).json(response);
    } catch (error) {
        console.error("Error fetching order counts:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// dashboard data shown
const all = async (req, res) => {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    try {
        const searchFilter = search
            ? {
                  [Op.or]: [
                      { "$organizationType.organizationType$": { [Op.like]: `%${search}%` } }, 
                      { name: { [Op.like]: `%${search}%` } }, 
                      { address: { [Op.like]: `%${search}%` } },
                  ],
              }
            : {};

        const organizations = await Organization.findAll({
            attributes: ["id", "name", "address", "organizationType_id", "file1"],
            include: [
                {
                    model: TblOrganizationType,
                    as: "organizationType",
                    attributes: ["id", "organizationType", "description"],
                    required: true,
                },
            ],
            where: searchFilter,
            order: [["createdAt", "DESC"]],
            offset,
            limit,
        });

        const orgIds = organizations.map(org => org.id);

        // Fetch organization services
        const organizationServices = await TblOrganization_Service.findAll({
            where: { organization_id: { [Op.in]: orgIds } },
            attributes: ["organization_id", "service_id", "price"],
        });

        const serviceIds = [...new Set(organizationServices.map(service => service.service_id))];

        // Fetch service names from Services table
        let serviceMap = {};
        if (serviceIds.length > 0) {
            const services = await Services.findAll({
                where: { id: { [Op.in]: serviceIds } },
                attributes: ["id", "servicename"],
            });

            services.forEach(service => {
                serviceMap[service.id] = service.servicename;
            });
        }

        // Map services to organizations
        const organizationServiceMap = {};
        organizationServices.forEach(service => {
            if (!organizationServiceMap[service.organization_id]) {
                organizationServiceMap[service.organization_id] = [];
            }
            organizationServiceMap[service.organization_id].push({
                id: service.service_id,
                servicename: serviceMap[service.service_id] || "Unknown Service",
                price: service.price,
            });
        });

        // Format the data
        const formattedOrganizations = organizations.map((org) => {
            const orgData = org.toJSON();
            orgData.organizationTypeName = orgData.organizationType?.organizationType || "";
            orgData.description = orgData.organizationType?.description || "";
        
            // Check if the address is a string and format accordingly
            try {
                if (typeof orgData.address === 'string') {    // If address is a stringified JSON (array-like), parse it
                    orgData.address = JSON.parse(orgData.address);   // Try to parse the address as JSON if it looks like an array
                }
            } catch (error) {
                if (typeof orgData.address === 'string') { // If parsing fails, keep it as a string (address is a single string)
                    orgData.address = orgData.address; // Address remains a string if not parsable
                }
            }
            // Attach services to organization
            orgData.services = organizationServiceMap[orgData.id] || [];
        
            delete orgData.organizationType;
            return orgData;
        });
        

        // Group data by organizationType
        const groupedData = formattedOrganizations.reduce((acc, org) => {
            const { organizationTypeName } = org;
            if (!acc[organizationTypeName]) {
                acc[organizationTypeName] = [];
            }
            acc[organizationTypeName].push(org);
            return acc;
        }, {});

        return res.status(200).json(groupedData);
    } catch (error) {
        console.error("Error fetching organizations:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// status based order shown and (toOrganization)  adress
const statusOrder = async (req, res) => {
    try {
        const { status, userUUID } = req.params; // here userUUID means user uuid

        const whereCondition = {};
        if (status) whereCondition.orderStatus = status;
        if (userUUID) whereCondition.userUUID = userUUID;

        const orderStatus = await OrderReports.findAll({
            where: whereCondition,
            include: [
                {
                    model: Organization,
                    as: "toOrg",
                    attributes: ["name", "address"], // Including organization details
                },
                {
                    model: OrderServices, // Including OrderServices model
                    include: [
                        {
                            model: Services, // Including the related Service data
                            as: "orderService", // Alias for the association
                            attributes: ["id", "servicename", "servicedescription"], // Include only required fields
                        },
                    ],
                },
            ],
        });

        // Clean the address field if it's in stringified JSON format
        const cleanedOrderStatus = orderStatus.map(order => {
            // Parsing the address if it's stringified JSON
            if (order.toOrg && typeof order.toOrg.address === 'string') {
                try {
                    order.toOrg.address = JSON.parse(order.toOrg.address);
                } catch (error) {
                    order.toOrg.address = order.toOrg.address;
                }
            }

            // Format OrderServices and include service data
            if (order.OrderServices) {
                order.OrderServices = order.OrderServices.map(orderService => {
                    // Extract and format service data
                    const serviceData = orderService.orderService || {}; // Attach the related service data
                    return {
                        ...orderService.toJSON(), // Spread the OrderService data
                        service: serviceData, // Attach service details
                    };
                });
            }

            return order;
        });

        // Return the formatted response
        return res.status(200).json(cleanedOrderStatus);
    } catch (error) {
        console.error("Error fetching orders by status and organization:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

const searchOrganizations = async (req, res) => {
    try {
        const { search } = req.query;

        if (!search) {
            return res.status(400).json({ message: "Search query is required." });
        }

        // Fetch organizations matching the search term
        const organizations = await Organization.findAll({
            attributes: ["id", "name"],
            where: {
                name: {
                    [Op.like]: `%${search}%`,
                },
            },
            include: [
                {
                    model: TblOrganization_Service,
                    as: "organizationServices",
                    attributes: ["service_id"],
                    include: [
                        {
                            model: Services,
                            as: "services",  // Make sure alias matches the association
                            attributes: ["servicename"],
                        },
                    ],
                },
            ],
        });

        // Check if organizations found
        if (organizations.length === 0) {
            return res.status(404).json({ message: "No organizations found." });
        }

        // Format the response to include organization names and their service names
        const result = organizations.map(org => {
            // Check if the organization has services
            const services = org.organizationServices.map(os => os.services?.servicename).filter(servicename => servicename);

            const organizationData = {
                organizationName: org.name,
                services: services,
            };

            return organizationData;
        });

        // Send the result back as JSON
        return res.status(200).json(result);
    } catch (error) {
        console.error("Error fetching organizations:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

const searchByOrganizationType = async (req, res) => {
    try {
        const { search } = req.query;

        if (!search) {
            return res.status(400).json({ message: "Search query is required." });
        }

        // Fetch organizations matching the organizationType
        const organizations = await Organization.findAll({
            attributes: ["id", "name", "address", "mobile", "email", "description"],
            include: [
                {
                    model: TblOrganizationType,
                    as: "organizationType",
                    attributes: ["id", "organizationType", "description"],
                    where: {
                        organizationType: {
                            [Op.like]: `%${search}%`, // Filter based on organizationType
                        },
                    },
                    required: true, // Ensure only those organizations that have the matching organizationType are included
                },
                {
                    model: TblOrganization_Service,
                    as: "organizationServices",
                    attributes: ["service_id"],
                    include: [
                        {
                            model: Services,
                            as: "services", // Alias for services
                            attributes: ["servicename"],
                            required: false, // Make optional in case no services are linked
                        },
                    ],
                    required: false, // Make optional in case no services are linked
                },
            ],
        });

        // Check if organizations are found
        if (organizations.length === 0) {
            return res.status(404).json({ message: "No organizations found." });
        }

        // Format the response to include organization details
        const result = organizations.map(org => {
            // Handle case where no services are linked
            const services = org.organizationServices?.map(os => os.services?.servicename).filter(servicename => servicename) || [];

            const organizationData = {
                organizationName: org.name,
                address: org.address,
                mobile: org.mobile,
                email: org.email,
                description: org.description,
                organizationType: org.organizationType.organizationType, // Include organizationType
                services: services, // Empty array if no services are linked
            };

            return organizationData;
        });

        // Send the result back as JSON
        return res.status(200).json(result);
    } catch (error) {
        console.error("Error fetching organizations:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};


module.exports={allOrders,all,statusOrder,searchOrganizations , searchByOrganizationType}