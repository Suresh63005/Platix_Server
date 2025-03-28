const { Op } = require("sequelize");
const OrderReports = require("../Models/ReportsModel/OrderReport.model");
const TblOrganizationType = require("../Models/TblOrganizationType.model");
const { formatDateFields } = require("../helper/formatedDate");
const Organization = require("../Models/Organization.model");
const Services = require("../Models/TblServices.model");
const TblOrganization_Service = require("../Models/tblOrganizationService"); //76a91dba-948d-4098-ad1e-26ceaa10a74d
const OrderServices = require("../Models/ReportsModel/OrderServices.model");
const Settings = require("../Models/TblSettings.model");

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
    // const { search, page = 1, limit = 10 } = req.query;
    // const offset = (page - 1) * limit;

    try {
       

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
            // where: searchFilter,
            order: [["createdAt", "DESC"]],
            // offset,
            // limit,
        });
        
        const orgIds = organizations.map(org => org.id);
        // console.log(orgIds)
        // Fetch organization services
        const organizationServices = await TblOrganization_Service.findAll({
            where: { organization_id: { [Op.in]: orgIds } },
            attributes: ["id","organization_id", "service_id", "price"],
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
                id: service.id,
                servicename: serviceMap[service.service_id] || "Unknown Service",
                price: service.price,
            });
        });

        // Format the data
        const formattedOrganizations = organizations.map((org) => {
            const orgData = org.toJSON();
            orgData.organizationTypeName = orgData.organizationType?.organizationType || "";
            orgData.description = orgData.organizationType?.description || "";
        
            try {
                if (typeof orgData.address === 'string') {    
                    orgData.address = JSON.parse(orgData.address);  
                }
            } catch (error) {
                if (typeof orgData.address === 'string') { 
                    orgData.address = orgData.address; 
                }
            }
            // Attach services to organization
            orgData.services = organizationServiceMap[orgData.id] || [];
        
            delete orgData.organizationType;
            return orgData;
        });
        
        // Group data by organizationType
        const groupedData = Object.groupBy(formattedOrganizations, org => org.organizationTypeName);
        return res.status(200).json(groupedData);
    } catch (error) {
        console.error("Error fetching organizations:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// status based order shown and (toOrganization)  adress
const statusOrder = async (req, res) => {
    try {
        const { status, userUUID } = req.params;

        const whereCondition = {};
        if (status) whereCondition.orderStatus = status;
        if (userUUID) whereCondition.userUUID = userUUID;

        const orderStatus = await OrderReports.findAll({
            where: whereCondition,
            include: [
                {
                    model: Organization,
                    as: "toOrg",
                    attributes: ["name", "address", "file1","organizationType_id"],
                    include: [
                        {
                            model: TblOrganizationType,
                            as:"organizationType",
                            attributes:["organizationType"]
                            
                        }
                    ]
                },
                {
                    model: OrderServices, 
                    as: "orderServices",
                    include: [
                        {
                          model: TblOrganization_Service,
                          as: 'orgservice',
                          attributes: ['id'],
                          include: [
                            {
                              model: Services,
                              as: 'servicess',
                              attributes: ['id', 'servicename'],
                            }
                          ]
                        },
                      ],
                },
            ],
        });

        // Clean the address field if it's in stringified JSON format
        const cleanedOrderStatus = orderStatus.map(order => {
            if (order.toOrg && order.toOrg.address) { // Handle the address field based on its type (string or JSON string)
                try {
                    // If the address is a valid JSON string, parse it
                    if (typeof order.toOrg.address === "string" && (order.toOrg.address.trim().startsWith("[") || order.toOrg.address.trim().startsWith("{"))) {
                        order.toOrg.address = JSON.parse(order.toOrg.address);
                    } else {
                        // If it's not JSON, it's just a regular string, so no parsing is needed
                        order.toOrg.address = [order.toOrg.address]; 
                    }
                } catch (error) {
                    console.error("Error parsing address:", error);
                    order.toOrg.address = [order.toOrg.address];
                }
            }

            // Format OrderServices and include service data
            if (order.orderServices) { // Ensure correct alias usage
                order.orderServices = order.orderServices.map(orderService => {
                    return {
                        ...orderService.toJSON(), // Spread the OrderService data
                        service: orderService.serviceDetails || {}, // Attach service details
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


// search using organization name, organization type name and organization description 
const searchOrganizations = async (req, res) => {
    try {
        const { search } = req.query;

        if (!search) {
            return res.status(400).json({ message: "Search by organization name or organization type name." });
        }

        const organizations = await Organization.findAll({
            attributes: ["id", "name", "address", "mobile", "email", "description","file1"],
            include: [
                {
                    model: TblOrganizationType,
                    as: "organizationType",
                    attributes: ["id","organizationType"],
                    required: false,
                },
                {
                    model: TblOrganization_Service,
                    as: "organization", 
                    attributes: ["service_id","price"],
                    include: [
                        {
                            model: Services,
                            as: "servicess",
                            attributes: ["servicename"],
                            required: false,
                        },
                    ],
                    required: false,
                },
            ],
            where: {
                [Op.or]: [
                    { name: { [Op.like]: `%${search}%` } }, 
                    { description: { [Op.like]: `%${search}%` } }, 
                    { "$organizationType.organizationType$": { [Op.like]: `%${search}%` } } 
                ],
            },
        });

        // console.log(organizations)
        if (organizations.length === 0) {
            return res.status(404).json({ message: "No organizations found." });
        }

        const result = organizations.map(org => {
            let addressList;
            
            try {
                addressList = JSON.parse(org.address);
                // Ensure it's an array, otherwise wrap it
                if (!Array.isArray(addressList)) {
                    addressList = [addressList];
                }
            } catch (error) {
                addressList = [org.address];
            }
        
            const services =
                org.organization?.map(os => ({
                    servicename: os.servicess?.servicename,
                    price: os.price,
                })).filter(service => service.servicename) || [];
        
            return {
                id:org.id, //organization id
                name: org.name, //organization name
                file1: org.file1,
                address: addressList, 
                mobile: org.mobile,
                email: org.email,
                description: org.description,
                organizationType: org.organizationType?.organizationType || "N/A",
                organizationTypeId:org.organizationType?.id || "N/A",
                services: services,
            };
        });
        return res.status(200).json(result);
    } catch (error) {
        console.error("Error fetching organizations:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// here passed organization type name and respective organization
const searchByOrganizationType = async (req, res) => {
    try {
        const { search, organizationType } = req.query;

        // Check if organizationType is provided
        if (!organizationType) {
            return res.status(400).json({ message: "Organization type is required." });
        }

        // Fetch the organization type from the database
        const orgType = await TblOrganizationType.findOne({
            where: {
                organizationType: {
                    [Op.like]: `%${organizationType}%`, // Partial matching for organizationType
                },
            },
        });

        // If organization type is not found, return an error
        if (!orgType) {
            return res.status(404).json({ message: "Organization type not found." });
        }

        // Build the whereClause to filter organizations by organizationType
        const whereClause = {
            organizationType_id: orgType.id,
        };

        // If a search query is provided, filter by organization name
        if (search) {
            whereClause.name = {
                [Op.like]: `%${search}%`, // Filter organizations by name based on search query
            };
        }

        // Fetch organizations based on the whereClause
        const organizations = await Organization.findAll({
            where: whereClause,
            attributes: ["id", "name", "organizationType_id", "address", "mobile", "email", "description", "file1"],
            include: [
                {
                    model: TblOrganizationType,
                    as: "organizationType",
                    attributes: ["id", "organizationType"],
                    required: false,
                },
                {
                    model: TblOrganization_Service,
                    as: "organization",
                    attributes: ["service_id", "price"],
                    include: [
                        {
                            model: Services,
                            as: "servicess",
                            attributes: ["servicename"],
                            required: false,
                        },
                    ],
                    required: false,
                },
            ],
        });

        // If no organizations are found, return an error
        if (organizations.length === 0) {
            return res.status(404).json({ message: "No organizations found for this type." });
        }

        // Format the result to include organization names, services, and their prices
        const result = organizations.map(org => {
            let addressList;

            // Parse address as a list (in case it's stored as a string)
            try {
                addressList = JSON.parse(org.address);
                if (!Array.isArray(addressList)) {
                    addressList = [addressList];
                }
            } catch (error) {
                addressList = [org.address]; // Fallback to raw address if JSON parsing fails
            }

            // Get services and prices for the organization
            const services = org.organization?.map(os => ({
                servicename: os.servicess?.servicename,
                price: os.price,
            })).filter(service => service.servicename) || [];

            return {
                id: org.id, // Organization ID
                name: org.name, // Organization Name
                file1: org.file1, // File 1 URL or data
                address: addressList, // Organization address
                mobile: org.mobile, // Mobile number
                email: org.email, // Email address
                description: org.description, // Description
                organizationType: org.organizationType?.organizationType || "N/A", // Organization type name
                organizationTypeId: org.organizationType?.id || "N/A", // Organization type ID
                services: services, // Associated services with their prices
            };
        });

        // If only one organization is found, return it as a single object (not an array)
        if (organizations.length === 1) {
            return res.status(200).json(result[0]);
        }

        // Return the result as an array
        return res.status(200).json(result);

    } catch (error) {
        console.error("Error fetching organizations:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

const termAndConditions = async (req, res) => {
    try {
        const settings = await Settings.findOne({
            attributes: ["termsAndConditions", "privacyPolicy"]
        });

        if (!settings) {
            return res.status(404).json({ success: false, message: "Settings not found" });
        }

        return res.status(200).json({ success: true, settings });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports={allOrders,all,statusOrder,searchOrganizations,searchByOrganizationType,termAndConditions }