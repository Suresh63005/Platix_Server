const { Op } = require("sequelize");
const OrderReports = require("../Models/ReportsModel/OrderReport.model");
const TblOrganizationType = require("../Models/TblOrganizationType.model");
const { formatDateFields } = require("../helper/formatedDate");
const Organization = require("../Models/Organization.model");
const Services = require("../Models/TblServices.model");
const TblOrganization_Service = require("../Models/tblOrganizationService");
const OrderServices = require("../Models/ReportsModel/OrderServices.model");
const Settings = require("../Models/TblSettings.model");

const allOrders = async (req, res) => {
    const uid = req.user?.id; 
    if (!uid) {
        return res.status(401).json({ message: "Unauthorized!" });
    }

    

    try {
        // Fetch order counts concurrently for the given user
        const orderCounts = await Promise.all([
            OrderReports.count({ where: { userUUID: uid, orderStatus: "processing" } }), 
            OrderReports.count({ where: { userUUID: uid,orderStatus :{[Op.in]: ["completed", "processing"]}, payment_status: "unpaid" } }), 
            OrderReports.count({ where: { userUUID: uid, orderStatus: { [Op.in]: ["completed", "cancelled", "processing"] } } }), 
            OrderReports.count({ where: { userUUID: uid, orderStatus: { [Op.in]: ["processing"] } } }),
            OrderReports.count({ where: { userUUID: uid, orderStatus: { [Op.in]: ["completed", "cancelled"] } } }), 
        ]);

        // Fetch total paid amount for the given user
        const receivedAmounts = await OrderReports.sum("paidAmount", { 
            where: { 
                userUUID: uid,
                orderStatus: { [Op.in]: ["completed", "cancelled", "processing"] } 
            }
        });

        const response = {
            activeOrders: orderCounts[0], // Processing orders
            totalPayableBills: orderCounts[1], 
            totalOrders: orderCounts[2], // All orders
            openOrders: orderCounts[3], // Processing 
            closedOrders: orderCounts[4], // Completed + Cancelled
            totalReceivedAmount: receivedAmounts || 0, // Total received amount
        };

        return res.status(200).json(response); 
    } catch (error) {
        console.error("Error fetching order counts:", error);
        return res.status(500).json({ message: "Internal Server Error" }); 
    }
};

// dashboard data shown (dentist all orders)
const all = async (req, res) => {
    // const { search, page = 1, limit = 10 } = req.query;
    // const offset = (page - 1) * limit;
    const uid=req.user?.id;
    if(!uid){
        return res.status(401).json({ message: "Unauthorized!" });
    }

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
                id: service.id, //organization_service id
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

        const userId = req.user?.id ;

        if(!userId){
            return res.status(401).json({ message: "Unauthorized" });
        }

        

        const whereCondition = {is_visible_to_customer : {[Op.eq]:true}};
        if (status) whereCondition.orderStatus = status;
        if (userId) whereCondition.userUUID = userId;

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
            order: [["createdAt", "DESC"]],
            // logging: console.log
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
                    as: "organization_service", 
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
      const { search = "", organizationType } = req.query;
  
      if (!organizationType) {
        return res.status(400).json({ message: "Organization type is required." });
      }
  
      // Get the organization type
      const orgType = await TblOrganizationType.findOne({
        where: { organizationType: { [Op.like]: `%${organizationType}%` } },
      });
  
      if (!orgType) {
        return res.status(404).json({ message: "Organization type not found." });
      }

      
  
      // Main query
      const organizations = await Organization.findAll({
        where: {
          organizationType_id: orgType.id,
         
        },
        attributes: ["id", "name", "organizationType_id", "address", "mobile", "email", "description", "file1"],
        include: [
          {
            model: TblOrganizationType,
            as: "organizationType",
            attributes: ["id", "organizationType"],
          },
          {
            model: TblOrganization_Service,
            as: "organization_service",
            attributes: ["service_id", "price"],
            include: [
              {
                model: Services,
                as: "servicess",
                attributes: ["servicename"],
                ...(search && {
                  where: { servicename: { [Op.like]: `%${search}%` } }, // match service name
                }),
              },
            ],
            ...(search && {
              required: true, // set to true if you want to show only if service match
            }),
          },
        ],
      });
  
      if (!organizations.length) {
        return res.status(404).json({ message: "No organizations found." });
      }
  
      // Format result
      const result = organizations.map(org => ({
        id: org.id,
        name: org.name,
        file1: org.file1,
        address: (() => {
          try {
            const parsed = JSON.parse(org.address);
            return Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            return [org.address];
          }
        })(),
        mobile: org.mobile,
        email: org.email,
        description: org.description,
        organizationType: org.organizationType?.organizationType || "N/A",
        organizationTypeId: org.organizationType?.id || "N/A",
        services: (org.organization_service || []).map(os => ({
          servicename: os.servicess?.servicename,
          price: os.price,
        })).filter(s => s.servicename),
      }));
  
      return res.status(200).json(result.length === 1 ? result[0] : result);
      
    } catch (error) {
      console.error("Search error:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  };
// const searchByOrganizationType = async (req, res) => {
//     try {
//       const { search, organizationType } = req.query;
  
//       if (!organizationType) {
//         return res.status(400).json({ message: "Organization type is required." });
//       }
  
//       // 1. Get organization type
//       const orgType = await TblOrganizationType.findOne({
//         where: {
//           organizationType: {
//             [Op.like]: `%${organizationType}%`,
//           },
//         },
//       });
  
//       if (!orgType) {
//         return res.status(404).json({ message: "Organization type not found." });
//       }
  
//       // 2. Prepare include block for services
//       const organizationServiceInclude = {
//         model: TblOrganization_Service,
//         as: "organization_service",
//         attributes: ["service_id", "price"],
//         include: [
//           {
//             model: Services,
//             as: "servicess",
//             attributes: ["servicename"],
//           },
//         ],
//       };
  
//       if (search) {
//         // When searching by service name, set where clause in nested include and required: true
//         organizationServiceInclude.include[0].where = {
//           servicename: {
//             [Op.like]: `%${search}%`,
//           },
//         };
//         organizationServiceInclude.required = true;
//       }
  
//       // 3. Prepare OR condition if search is provided
//       const whereClause = {
//         organizationType_id: orgType.id,
//       };
  
//       if (search) {
//         whereClause[Op.or] = [
//           { name: { [Op.like]: `%${search}%` } }, // Org name
//         ];
//       }
  
//       // 4. Fetch organizations
//       const organizations = await Organization.findAll({
//         where: whereClause,
//         attributes: ["id", "name", "organizationType_id", "address", "mobile", "email", "description", "file1"],
//         include: [
//           {
//             model: TblOrganizationType,
//             as: "organizationType",
//             attributes: ["id", "organizationType"],
//           },
//           organizationServiceInclude,
//         ],
//       });
  
//       if (!organizations.length) {
//         return res.status(404).json({ message: "No organizations found." });
//       }
  
//       // 5. Format result
//       const result = organizations.map(org => {
//         let addressList;
//         try {
//           addressList = JSON.parse(org.address);
//           if (!Array.isArray(addressList)) addressList = [addressList];
//         } catch {
//           addressList = [org.address];
//         }
  
//         const services = org.organization_service?.map(os => ({
//           servicename: os.servicess?.servicename,
//           price: os.price,
//         })).filter(s => s.servicename) || [];
  
//         return {
//           id: org.id,
//           name: org.name,
//           file1: org.file1,
//           address: addressList,
//           mobile: org.mobile,
//           email: org.email,
//           description: org.description,
//           organizationType: org.organizationType?.organizationType || "N/A",
//           organizationTypeId: org.organizationType?.id || "N/A",
//           services,
//         };
//       });
  
//       return res.status(200).json(result.length === 1 ? result[0] : result);
//     } catch (error) {
//       console.error("Error in searchByOrganizationType:", error);
//       return res.status(500).json({ message: "Internal Server Error" });
//     }
//   };

// get all settings
const termAndConditions = async (req, res) => {
    try {
        const settings = await Settings.findOne({
            attributes: ["termsAndConditions", "privacyPolicy","platformFee"]
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