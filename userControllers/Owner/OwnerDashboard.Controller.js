const { Op } = require("sequelize");
const OrderReports = require("../../Models/ReportsModel/OrderReport.model");
const Organization = require("../../Models/Organization.model");
const OrderService = require("../../Models/ReportsModel/OrderServices.model");
const Services = require("../../Models/TblServices.model");
const { sequelize } = require("../../config/db");
const User = require("../../Models/ReportsModel/User.model");
const OrderServices = require("../../Models/ReportsModel/OrderServices.model");

// Fetch total payable bills, active orders, closed orders, received payments, and order list
const labOrders = async (req, res) => {
  
  try {
    // console.log(req.user);
    const { organization_id, id, role_id } = req.user;
   
   

    // Check if user exists
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


// Retrieve order or payment reports
const labOrderAndPaymentReport = async (req, res) => {
  const { organization_id } = req.user;
  console.log(organization_id)
  const { report } = req.params;
  if (!["order", "payment"].includes(report)) return res.status(400).json({ message: "Invalid report type" });

  try {
    const reportData = await OrderReports.findAll({where:{toOrganization:organization_id}});
    if (!reportData.length) return res.status(404).json({ message: `No ${report} reports found.` });

    return res.status(200).json({ message: `${report} reports retrieved successfully`, data: reportData });
  } catch (error) {
    console.error(`Error fetching ${report} reports:`, error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Retrieve order or payment report by ID
const labOrderAndPaymentReportGetById=async(req,res)=>{
  const { id, report } = req.params;
  if (!["order", "payment"].includes(report)) return res.status(400).json({ message: "Invalid report type" });

  try {
    const attributes = report === "order" ? ["orderId", "orderDate", "fromOrganization", "toOrganization", "patientId", "patientName"] : ["orderId", "orderDate", "fromOrganization", "toOrganization", "patientId", "patientName", "totalAmount", "paidAmount", "paymentMethod", "remarks"];
    const reportData = await OrderReports.findOne({
      where: { id },
      attributes,
      include: [{ model: OrderService, as: "orderServices", attributes: ["quantity", "price"], include: [{ model: Services, as: "serviceDetails", attributes: ["servicename"] }] }]
    });

    if (!reportData) return res.status(404).json({ message: `${report} report with ID ${id} not found.` });

    return res.status(200).json({ message: `${report} report retrieved successfully`, data: reportData });
  } catch (error) {
    console.error(`Error fetching ${report} report with ID ${id}:`, error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
// Search orders by order ID or organization name
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

const searchDoctor = async (req, res) => {
  const uid = req.user?.id;
  const { search } = req.query;

  try {
    const results = await User.findAll({
      where: {
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

const upsertOrder = async (req, res) => {
  const uid = req.user?.id;  
  const { id, userUUID, fromOrganization, toOrganization, service_id, orderDate, toothName, shades, remarks } = req.body;

  try {
    if (id) {
      const order = await OrderReports.findByPk(id);

      if (!order) {
        return res.status(404).json({ message: "Order not found." });
      }

      await order.update({
        userUUID,
        fromOrganization,
        toOrganization,
        orderDate,
        toothName,
        shades,
        remarks
      });

      if (service_id) {
        const serviceIds = Array.isArray(service_id) ? service_id : [service_id];

        await OrderService.destroy({
          where: { orderId: order.id }
        });

        const orderServices = serviceIds.map(service_id => ({
          orderId: order.id,
          service_id
        }));

        await OrderServices.bulkCreate(orderServices);
      }

      return res.status(200).json({ success: true, message: "Order updated successfully."});

    } else {
      const newOrder = await OrderReports.create({
        userUUID,
        fromOrganization,
        toOrganization,
        orderDate,
        toothName,
        shades,
        remarks,
      });

      if (service_id) {
        const serviceIds = Array.isArray(service_id) ? service_id : [service_id];

        const orderServices = serviceIds.map(service_id => ({
          orderId: newOrder.id,
          service_id
        }));

        await OrderServices.bulkCreate(orderServices);
      }

      return res.status(201).json({ success: true, message: "Order created successfully." });
    }
  } catch (error) {
    console.error("Error in upserting order:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

module.exports = { labOrders, labAllOrders, labOrderAndPaymentReport, labOrderAndPaymentReportGetById, searchOrders ,searchDoctor,upsertOrder };
