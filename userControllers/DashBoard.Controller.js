const { Op } = require("sequelize");
const OrderReports = require("../Models/ReportsModel/OrderReport.model");
const TblOrganizationType = require("../Models/TblOrganizationType.model");
const { formatDateFields } = require("../helper/formatedDate");
const Organization = require("../Models/Organization.model");
const Services = require("../Models/TblServices.model");

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
            completedPayableBills: orderCounts[1], // Completed orders
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
    try {
        // Fetch organizations with their organization type
        const organizations = await Organization.findAll({
            attributes: ["id", "name", "address", "organizationType_id"],
            include: [
                {
                    model: TblOrganizationType,
                    as: "organizationType",
                    attributes: ["id", "organizationType", "description", "fromDate", "toDate", "service_id"],
                    required: true,
                },
            ],
            order: [["createdAt", "DESC"]],
        });

        // console.log(JSON.stringify(organizations, null, 2));

        let allServiceIds = new Set(); // to get all unique service id
        organizations.forEach(org => {
            if (org.organizationType && org.organizationType.service_id) {
                let serviceIds;

                try {
                    serviceIds = JSON.parse(org.organizationType.service_id); // Ensure service_id is properly parsed into an array
                } catch (error) {
                    console.log("Invalid JSON in service_id:", org.organizationType.service_id);
                    serviceIds = [];
                }

                // Ensure it's an array before processing
                if (Array.isArray(serviceIds)) {
                    serviceIds.forEach(id => allServiceIds.add(id));
                }
            }
        });

        // Convert set to an array
        const serviceIdArray = [...allServiceIds];

        // Fetch service names based on service IDs if available
        let serviceMap = {};
        if (serviceIdArray.length > 0) {
            const services = await Services.findAll({
                where: { id: { [Op.in]: serviceIdArray } },
                attributes: ["id", "servicename"]
            });

            // Create a map of service_id -> servicename
            services.forEach(service => {
                serviceMap[service.id] = service.servicename;
            });
        }

        // Format organizations data
        const formattedOrganizations = organizations.map(org => {
            const orgData = org.toJSON();
            if (orgData.organizationType) {
                orgData.organizationTypeName = orgData.organizationType.organizationType;
                orgData.description = orgData.organizationType.description;
                orgData.fromDate = orgData.organizationType.fromDate;
                orgData.toDate = orgData.organizationType.toDate;

                let serviceIds = [];
                try {
                    serviceIds = JSON.parse(orgData.organizationType.service_id);
                } catch (error) {
                    console.warn("Invalid JSON in service_id:", orgData.organizationType.service_id);
                }

                if (Array.isArray(serviceIds)) {
                    orgData.services = serviceIds.map(id => ({
                        id,
                        servicename: serviceMap[id] || "Unknown Service"
                    }));
                } else {
                    orgData.services = [];
                }

                delete orgData.organizationType; // Remove nested object for cleaner output
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
        console.error("Error fetching grouped organizations:", error);
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

module.exports={allOrders,all,statusOrder}