const { Op } = require("sequelize");
const OrderReports = require("../Models/ReportsModel/OrderReport.model");
const TblOrganizationType = require("../Models/TblOrganizationType.model");
const { formatDateFields } = require("../helper/formatedDate");
const Organization = require("../Models/Organization.model");
const Services = require("../Models/TblServices.model");
const TblOrganization_Service = require("../Models/tblOrganizationService");

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
        // Global search condition
        const searchFilter = search
            ? {
                  [Op.or]: [
                      { "$organizationType.organizationType$": { [Op.like]: `%${search}%` } }, 
                      { name: { [Op.like]: `%${search}%` } }, 
                      { address: { [Op.like]: `%${search}%` } },
                  ],
              }
            : {};

        // Fetch organizations with search filter
        const organizations = await Organization.findAll({
            attributes: ["id", "name", "address", "organizationType_id","file1"],
            include: [
                {
                    model: TblOrganizationType,
                    as: "organizationType",
                    attributes: ["id", "organizationType", "description", "fromDate", "toDate", "service_id"],
                    required: true, // Ensures only those organizations that have an organizationType are included
                },
            ],
            where: searchFilter,
            order: [["createdAt", "DESC"]],
            offset,
            limit,
        });

        let allServiceIds = new Set();
        organizations.forEach((org) => {
            if (org.organizationType?.service_id) {
                let serviceIds;
                if (typeof org.organizationType.service_id === "string") {
                    try {
                        serviceIds = JSON.parse(org.organizationType.service_id);
                    } catch (error) {
                        console.warn("Invalid JSON in service_id:", org.organizationType.service_id);
                        serviceIds = [];
                    }
                } else if (Array.isArray(org.organizationType.service_id)) {
                    serviceIds = org.organizationType.service_id;
                }

                if (Array.isArray(serviceIds)) {
                    serviceIds.forEach((id) => allServiceIds.add(id));
                }
            }
        });

        // Fetch service names based on service IDs
        let serviceMap = {};
        if (allServiceIds.size > 0) {
            const services = await Services.findAll({
                where: { id: { [Op.in]: [...allServiceIds] } },
                attributes: ["id", "servicename"],
            });

            services.forEach((service) => {
                serviceMap[service.id] = service.servicename;
            });
        }

        // Format the data
        const formattedOrganizations = organizations.map((org) => {
            const orgData = org.toJSON();
            if (orgData.organizationType) {
                orgData.organizationTypeName = orgData.organizationType.organizationType;
                orgData.description = orgData.organizationType.description;
                orgData.fromDate = orgData.organizationType.fromDate;
                orgData.toDate = orgData.organizationType.toDate;

                let serviceIds = [];
                if (typeof orgData.organizationType.service_id === "string") {
                    try {
                        serviceIds = JSON.parse(orgData.organizationType.service_id);
                    } catch (error) {
                        console.warn("Invalid JSON in service_id:", orgData.organizationType.service_id);
                    }
                } else if (Array.isArray(orgData.organizationType.service_id)) {
                    serviceIds = orgData.organizationType.service_id;
                }

                orgData.services = Array.isArray(serviceIds)
                    ? serviceIds.map((id) => ({
                          id,
                          servicename: serviceMap[id] || "Unknown Service",
                      }))
                    : [];

                delete orgData.organizationType;
            }
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


// status based order shown
const statusOrder = async (req, res) => {
    try {
        const { status, from_organization } = req.params;

        const whereCondition = {};
        if (status) whereCondition.orderStatus = status;
        if (from_organization) whereCondition.from_organization = from_organization;

        const orderStatus = await OrderReports.findAll({ where: whereCondition });

        return res.status(200).json(orderStatus);
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