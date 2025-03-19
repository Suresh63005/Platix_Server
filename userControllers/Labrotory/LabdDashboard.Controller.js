const { Op } = require("sequelize");
const OrderReports = require("../../Models/ReportsModel/OrderReport.model");
const Organization = require("../../Models/Organization.model");
const OrderService = require("../../Models/ReportsModel/OrderServices.model");
const Services = require("../../Models/TblServices.model");
const { sequelize } = require("../../config/db");

// Fetch total payable bills, active orders, closed orders, received payments, and order list
const labOrders = async (req, res) => {
  const { Organization_id } = req.body;
  try {
    const orders = await OrderReports.findOne({ where: { toOrganization: Organization_id } });
    if (!orders) return res.status(404).json({ message: "No orders found" });

    const [activeOrders, totalPayableBills, totalOrders, openOrders, closedOrders] = await Promise.all([
      OrderReports.count({ where: { orderStatus: "processing", toOrganization: Organization_id } }),
      OrderReports.count({ where: { orderStatus: "completed", toOrganization: Organization_id } }),
      OrderReports.count({ where: { orderStatus: { [Op.in]: ["completed", "cancelled", "processing"] }, toOrganization: Organization_id } }),
      OrderReports.count({ where: { orderStatus: "processing", toOrganization: Organization_id } }),
      OrderReports.count({ where: { orderStatus: { [Op.in]: ["completed", "cancelled"] }, toOrganization: Organization_id } })
    ]);

    const receivedAmounts = await OrderReports.sum("paidAmount", { where: { orderStatus: { [Op.in]: ["completed", "cancelled", "processing"] }, toOrganization: Organization_id } }) || 0;
 
    const orderList = await OrderReports.findAll({
      where: { toOrganization: Organization_id },
      include: [{ model: Organization, as: "fromOrg", attributes: ["name"] }]
    });

    const response = {
      activeOrders, totalPayableBills, totalOrders, openOrders, closedOrders,
      totalReceivedAmount: receivedAmounts,
      orderList: orderList.map(order => ({ ...order.toJSON(), fromOrganizationName: order.fromOrg?.name || "Unknown" }))
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching order counts:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Fetch active, closed, and cancelled orders for the laboratory owner
const labAllOrders = async (req, res) => {
  const { orderStatus } = req.params;
  if (!["completed"].includes(orderStatus)) return res.status(400).json({ message: "Invalid order status" });

  try {
    const allOrders = await OrderReports.findAll({
      where: { orderStatus },
      include: [{ model: Organization, as: 'fromOrg', attributes: ['name'] }]
    });

    return res.status(200).json({ [orderStatus]: allOrders.map(order => ({ ...order.toJSON(), fromOrganizationName: order.fromOrg?.name || null })) });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Retrieve order or payment reports
const labOrderAndPaymentReport = async (req, res) => {
  const { report } = req.params;
  if (!["order", "payment"].includes(report)) return res.status(400).json({ message: "Invalid report type" });

  try {
    const reportData = await OrderReports.findAll();
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
  const { search } = req.query;
  try {
    const orders = await OrderReports.findAll({
      where: { [Op.or]: [{ orderId: { [Op.like]: `%${search}%` } }, { "$toOrg.name$": { [Op.like]: `%${search}%` } }] },
      include: [{ model: Organization, as: "toOrg", attributes: ["name"] }]
    });
    return res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error("Error during order search:", error);
    return res.status(500).json({ message: "An error occurred while searching for orders" });
  }
};

module.exports = { labOrders, labAllOrders, labOrderAndPaymentReport, labOrderAndPaymentReportGetById, searchOrders };
