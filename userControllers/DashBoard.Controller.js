const { Op } = require("sequelize");
const OrderReports = require("../Models/ReportsModel/OrderReport.model");
const TblOrganizationType = require("../Models/TblOrganizationType.model");
const { formatDateFields } = require("../helper/formatedDate");
const Organization = require("../Models/Organization.model");
const Services = require("../Models/TblServices.model");


const allOrders=async(req,res)=>{
    try {
        const orderCounts=await OrderReports.count({where:{orderStatus:"processing"}}); // active orders

        const completedPayableBills=await OrderReports.count({where:{orderStatus:"completed"}})
        console.log(completedPayableBills)
        const response={
            processing:orderCounts,
            completedPayableBills:completedPayableBills || 0,
        }
        return res.status(200).json(response)
    } catch (error) {
        console.error("Error fetching order counts:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

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

        // Extract all unique service IDs
        let allServiceIds = new Set();
        organizations.forEach(org => {
            if (org.organizationType && org.organizationType.service_id) {
                const serviceIds = Array.isArray(org.organizationType.service_id) ? org.organizationType.service_id : [];
                serviceIds.forEach(id => allServiceIds.add(id));
            }
        });

        // Convert set to an array
        allServiceIds = [...allServiceIds];

        // Fetch service names based on service IDs
        const services = await Services.findAll({
            where: { id: { [Op.in]: allServiceIds } },
            attributes: ["id", "servicename"]
        });

        // Create a map of service_id -> servicename
        const serviceMap = {};
        services.forEach(service => {
            serviceMap[service.id] = service.servicename;
        });

        // Format organizations data
        const formattedOrganizations = organizations.map(org => {
            const orgData = org.toJSON();
            if (orgData.organizationType) {
                orgData.organizationTypeName = orgData.organizationType.organizationType;
                orgData.description = orgData.organizationType.description;
                orgData.fromDate = formatDateFields(orgData.organizationType, ["fromDate"]).fromDate;
                orgData.toDate = formatDateFields(orgData.organizationType, ["toDate"]).toDate;

                // Map service_id to service names
                if (Array.isArray(orgData.organizationType.service_id)) {
                    orgData.services = orgData.organizationType.service_id.map(id => serviceMap[id] || "Unknown Service");
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

module.exports={allOrders,all}