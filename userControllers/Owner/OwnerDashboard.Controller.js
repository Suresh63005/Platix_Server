const { Op, literal } = require("sequelize");
const OrderReports = require("../../Models/ReportsModel/OrderReport.model");
const Organization = require("../../Models/Organization.model");
const OrderService = require("../../Models/ReportsModel/OrderServices.model");
const Services = require("../../Models/TblServices.model");
const { sequelize } = require("../../config/db");
const User = require("../../Models/ReportsModel/User.model");
const OrderServices = require("../../Models/ReportsModel/OrderServices.model");
const TblOrganization_Service = require("../../Models/tblOrganizationService");
const TblOrganizationType = require("../../Models/TblOrganizationType.model");

// Fetch total payable bills, active orders, closed orders, received payments, and order list
const labOrders = async (req, res) => {
  
  try {
    // console.log(req.user);
    const { organization_id, id, role_id } = req.user;

    console.log(organization_id,"yyyyyyyyyyyyy")

    const user = await User.findOne({
      where: { id, role_id },
    });

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Fetch orders where delivery_boy and technician are NULL and orderStatus is "processing"
    const orders = await OrderReports.findAll({
      where: {
        toOrganization: organization_id,
        orderStatus: "processing",
        delivery_boy: { [Op.is]: null },
        technician: { [Op.is]: null },
      },
      include: [
        {
          model: Organization,
          as: "toOrg", 
          attributes: ["name"],
        },
      ],
    });

    if (orders.length === 0) {
      return res.status(404).json({ message: "No orders found" });
    }

    // Fetch order counts in parallel
    const [activeOrders, totalPayableBills, totalOrders, openOrders, closedOrders] = await Promise.all([
      OrderReports.count({ where: { orderStatus: "processing", toOrganization: organization_id } }),
      OrderReports.count({ where: { orderStatus: "completed", toOrganization: organization_id } }),
      OrderReports.count({ where: { orderStatus: { [Op.in]: ["completed", "cancelled", "processing"] }, toOrganization: organization_id } }),
      OrderReports.count({ where: { orderStatus: "processing", toOrganization: organization_id } }),
      OrderReports.count({ where: { orderStatus: { [Op.in]: ["completed", "cancelled"] }, toOrganization: organization_id } }),
    ]);

    // Sum received amounts
    const receivedAmounts =
      (await OrderReports.sum("paidAmount", {
        where: { orderStatus: { [Op.in]: ["completed", "cancelled", "processing"] }, toOrganization: organization_id },
      })) || 0;

    // Format the response
    const response = {
      activeOrders,
      totalPayableBills,
      totalOrders,
      openOrders,
      closedOrders,
      totalReceivedAmount: receivedAmounts,
      orderList: orders.map((order) => ({
        ...order.toJSON(),
        fromOrganizationName: order.fromOrganization?.name || "Unknown",
      })),
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching order counts:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Fetch active, closed, and cancelled orders for the laboratory owner
const labAllOrders = async (req, res) => {
  try {
    const { organization_id } = req.user;
    const { orderStatus } = req.params;

    if (!["completed", "processing", "cancelled"].includes(orderStatus)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    const allOrders = await OrderReports.findAll({
      where: { orderStatus, toOrganization: organization_id },
      include: [{ model: Organization, as: "toOrg", attributes: ["name"] }],
    });

    return res.status(200).json({
      [orderStatus]: allOrders.map(order => ({
        ...order.toJSON(),
        fromOrganizationName: order.fromOrganization?.name || null,
      })),
    });

  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// (dashboard) Search orders by order ID or organization name
const searchOrders = async (req, res) => {
  const {organization_id, id, role_id} =req.user;
  const { search } = req.query;
  
  try {
    const orders = await OrderReports.findAll({
      where: { toOrganization:organization_id, orderStatus: "processing",
        delivery_boy: { [Op.is]: null },
        technician: { [Op.is]: null },[Op.or]: [{ orderId: { [Op.like]: `%${search}%` } }, { "$toOrg.name$": { [Op.like]: `%${search}%` } }] },
      include: [{ model: Organization, as: "toOrg", attributes: ["name"] }]
    });
    return res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error("Error during order search:", error);
    return res.status(500).json({ message: "An error occurred while searching for orders" });
  }
};

// Retrieve order or payment reports
// const labOrderAndPaymentReport = async (req, res) => {

//   const { organization_id } = req.user;
//   const { report } = req.params;
//   if (!["order", "payment"].includes(report)) return res.status(400).json({ message: "Invalid report type" });

//   try {
//     const reportData = await OrderReports.findAll({where:{toOrganization:organization_id,orderStatus:"completed"}});
//     if (!reportData.length) return res.status(404).json({ message: `No ${report} reports found.` });

//     return res.status(200).json({ message: `${report} reports retrieved successfully`, data: reportData });
//   } catch (error) {
//     console.error(`Error fetching ${report} reports:`, error);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// Retrieve order or payment report by ID
const labOrderAndPaymentReportGetById=async(req,res)=>{
  const {organization_id} =req.user;
  if(!organization_id){
    return res.status(401).json({message:"Unauthorized"})
  }
  const { id, report } = req.params;
  if (!["order", "payment"].includes(report)) return res.status(400).json({ message: "Invalid report type" });

  try {
    // const attributes = report === "order" ? ["orderId", "orderDate", "fromOrganization", "toOrganization", "patientId", "patientName"] : ["orderId", "orderDate", "fromOrganization", "toOrganization", "patientId", "patientName", "totalAmount", "paidAmount", "paymentMethod", "remarks"];
    const reportData = await OrderReports.findOne({
      where: { id ,toOrganization:organization_id},
      // attributes,
      include: [
        {
          model: User,
          as: 'userDetails',
          attributes: ['id', 'firstName', 'email', 'address', 'hospital_name'],
        },
        {
          model:OrderServices,
          as: 'orderServices',
          attributes:["quantity"],
          include:[
            {
              model:TblOrganization_Service,
              as:"orgservice",
              attributes:["id","price"],
              include: [
                {
                  model: Services,
                  as: 'servicess',
                  attributes: [ "servicename", 'servicedescription']
                },
                
              ],
            }
          ]
        }
      ]
    });

    if (!reportData) return res.status(404).json({ message: `${report} report with ID ${id} not found.` });
    const toOrganizationDetails = await Organization.findByPk(reportData.toOrganization, {
      attributes: ["id", "name"],
      include: [
        {
          model: TblOrganizationType,
          as: 'organizationType',
          attributes: ["id", "organizationType"],
        }
      ]
    });

    const fromOrganizationDetails = await Organization.findByPk(reportData.fromOrganization, {
      attributes: ["id", "name"],
      include: [
        {
          model: TblOrganizationType,
          as: 'organizationType',
          attributes: ["id", "organizationType"],
        }
      ]
    });

    return res.status(200).json({ message: `${report} report retrieved successfully`, data: reportData, toOrganizationDetails, fromOrganizationDetails });
  } catch (error) {
    console.error(`Error fetching ${report} report with ID ${id}:`, error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

// here is the code for the search functionality for order and payment search by date , if u provide date it will work if not it will also work
const searchOrdersGetByDate = async (req, res) => {
  const { organization_id } = req.user;
  try {
    // Extract report, fromdate, and todate from request parameters
    const { report, fromdate, todate } = req.params;

    // Validate the report type
    if (!['order', 'payment'].includes(report)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report type. Use "order" or "payment".',
      });
    }

    // Initialize whereCondition with organization filter
    let whereCondition = {};
    whereCondition.toOrganization = organization_id;

    // Apply conditions based on report type
    if (report === 'order') {
      // In "order" screen: `orderStatus` is "completed", and `payment_status` can be "paid" or "unpaid"
      whereCondition.orderStatus = 'completed';
      whereCondition.payment_status = { [Op.in]: ['paid', 'unpaid'] };
    } else if (report === 'payment') {
      // In "payment" screen: `orderStatus` is "completed", and `payment_status` should be "paid" only
      whereCondition.orderStatus = 'completed';
      whereCondition.payment_status = 'paid';
    }

    // Apply date filtering if provided
    const dateFilter = {};
    if (fromdate && todate) {
      dateFilter.createdAt = {
        [Op.between]: [
          new Date(fromdate + 'T00:00:00.000Z'),
          new Date(todate + 'T23:59:59.999Z'),
        ],
      };
    } else if (fromdate) {
      dateFilter.createdAt = {
        [Op.gte]: new Date(fromdate + 'T00:00:00.000Z'),
      };
    } else if (todate) {
      dateFilter.createdAt = {
        [Op.lte]: new Date(todate + 'T23:59:59.999Z'),
      };
    }

    // Merge the dateFilter with the whereCondition if there are any date filters
    if (Object.keys(dateFilter).length > 0) {
      whereCondition = { ...whereCondition, ...dateFilter };
    }

    // Fetch the report data based on the whereCondition
    const reportData = await OrderReports.findAll({
      where: whereCondition,
      include: [
        {
          model: Organization,
          as: 'toOrg',
          attributes: ['id', 'name'],
        },
      ],
    });

    // Return the successful response with the report data
    return res.status(200).json({
      success: true,
      message: `${report.charAt(0).toUpperCase() + report.slice(1)} reports fetched successfully!`,
      data: reportData,
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching the reports.',
      error: error.message,
    });
  }
};

// order and payment search
const orderAndPaymentSearch = async (req, res) => {
  const { organization_id } = req.user;
  const { search } = req.params;

  try {
    const orderReports = await OrderReports.findAll({
      where: {
        orderStatus: "completed",
        toOrganization:organization_id,
        [Op.or]: [
          { orderId: { [Op.like]: `%${search}%` } },
          { toothName: { [Op.like]: `%${search}%` } },
          { shades: { [Op.like]: `%${search}%` } },
          { remarks: { [Op.like]: `%${search}%` } },
          { reasonForScan: { [Op.like]: `%${search}%` } },
          { mobileNo: { [Op.like]: `%${search}%` } },
          { patientName: { [Op.like]: `%${search}%` } },
          { patientProblem: { [Op.like]: `%${search}%` } },
          { paymentMethod: { [Op.like]: `%${search}%` } },
          literal(`toOrg.name LIKE '%${search}%'`)
        ],
      },
      include: [
        {
          model: Organization,
          as: "toOrg",
          attributes: ["id", "name"],
          required: false,
        },
      ],
    });

    return res.status(200).json({ orderReports });
  } catch (error) {
    console.error("Error during global search:", error.message);
    return res.status(500).json({
      message: "An error occurred while performing the search",
    });
  }
};

// while creating order search doctor
const searchDoctor = async (req, res) => {
  const {organization_id, id, role_id} =req.user;
  const { search } = req.params;

  try {
    const results = await User.findAll({
      where: {organization_id:organization_id,
        [Op.or]: [{ firstName: { [Op.like]: `%${search}%` } }, { lastName: { [Op.like]: `%${search}%` } }]
      },
      include:[
        {
          model:Organization,
          as:'organization',
          attributes:['id','name'],
        }
      ]
    });
    return res.status(200).json({ success: true, results });
  } catch (error) {
    console.error("Error searching for doctors:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// assigning service to the delivery boy or technician

const assignService = async (req, res) => {
  const { organization_id } = req.user;
  console.log(organization_id,"organization_id")
  if (!organization_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { orderId, technician, delivery_boy } = req.body;

  // Ensure orderId is provided
  if (!orderId) {
    return res.status(400).json({ message: "Order ID is required" });
  }

  try {
    const order = await OrderReports.findOne({ where: { orderId: orderId } });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const updateFields = {};

    if (technician) {
      updateFields.technician = technician;
    }
    if (delivery_boy) {
      updateFields.delivery_boy = delivery_boy;
    }

    if (Object.keys(updateFields).length > 0) {
      await OrderReports.update(updateFields, { where: { orderId: orderId } });
    }

    return res.status(200).json({ message: "Service assigned successfully" });
  } catch (error) {
    console.error("Error assigning service:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = { labOrders, labAllOrders, labOrderAndPaymentReportGetById, searchOrders ,searchDoctor ,searchOrdersGetByDate,orderAndPaymentSearch,assignService };
