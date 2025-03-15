const { Op } = require("sequelize");
const OrderReports = require("../../Models/ReportsModel/OrderReport.model");
const Organization = require("../../Models/Organization.model");
const OrderService=require("../../Models/ReportsModel/OrderServices.model")
const Services=require("../../Models/TblServices.model");
const { sequelize } = require("../../config/db");
// Here, we display the total payable bills, active orders, closed orders, received payable amounts, and the order list as well.
const labOrders = async (req, res) => {
    const { Organization_id } = req.body;
    
    try {
      const orders = await OrderReports.findOne({
        where: { toOrganization: Organization_id },
      });
  
      if (!orders) {
        return res.status(404).json({ message: "No orders found" });
      }
  
      const orderCounts = await Promise.all([
        OrderReports.count({ where: { orderStatus: "processing", toOrganization: Organization_id } }),
        OrderReports.count({ where: { orderStatus: "completed", toOrganization: Organization_id } }),
        OrderReports.count({ where: { orderStatus: { [Op.in]: ["completed", "cancelled", "processing"] }, toOrganization: Organization_id, }, }),
        OrderReports.count({ where: { orderStatus: { [Op.in]: ["processing"] }, toOrganization: Organization_id,  },}),
        OrderReports.count({ where: { orderStatus: { [Op.in]: ["completed", "cancelled"] }, toOrganization: Organization_id,  },}),
      ]);
  
      const receivedAmounts = await OrderReports.sum("paidAmount", {
        where: {
          orderStatus: { [Op.in]: ["completed", "cancelled", "processing"] },
          toOrganization: Organization_id,
        },
      });

      const orderList=await OrderReports.findAll({
        where:{toOrganization:Organization_id},
        include:[
            {
                model:Organization,
                as:"fromOrg",
                attributes:["name"]
            }
        ]
      });
  
      const orderListWithNames = orderList.map((order) => ({
        ...order.toJSON(),
        fromOrganizationName: order.fromOrganization ? order.fromOrganization.name : "Unknown", // Default to "Unknown" if no organization
      }));
      const response = {
        activeOrders: orderCounts[0],
        totalPayableBills: orderCounts[1],
        totalOrders: orderCounts[2],
        openOrders: orderCounts[3],
        closedOrders: orderCounts[4],
        totalReceivedAmount: receivedAmounts || 0,
        orderList:orderListWithNames
      };
  
      // Sending the response back
      return res.status(200).json(response);
    } catch (error) {
      console.error("Error fetching order counts:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
};

const assignOrders=async(req,res)=>{
  try {
    // const 
  } catch (error) {
    
  }
}

const labCreateOrEditOrder=async(req,res)=>{
  // here userUUID means doctor name
  const { userUUID,hospital_name,labrotory_name,service_id,order_date,toothname,shade,remarks  } = req.body;

}

// labrotory owner (shown active, closed and  cancelled orders)
const labAllOrders = async (req, res) => {
  const { orderStatus } = req.params;

  const allowedStatuses = ["processing", "completed", "cancelled"];

  if (!allowedStatuses.includes(orderStatus)) {
    return res.status(400).json({ message: "Invalid order status" });
  }

  try {
    const allOrders = await OrderReports.findAll({
      where: { orderStatus },
      include: [
        {
          model: Organization,
          as: 'fromOrg', 
          attributes: ['name'], 
        },
        
      ]
    });

    const response = { [orderStatus]: allOrders.map(order => {
      return {
        ...order.toJSON(), 
        fromOrganizationName: order.fromOrganizationDetails ? order.fromOrganizationDetails.name : null,
      };
    })};

    if (allOrders.length === 0) {
      response[orderStatus] = [];
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


const labOrderAndPaymentReport = async (req, res) => {
  const { report } = req.params;

  try {
    const validReports = ["order", "payment"];
    if (!validReports.includes(report)) {
      return res.status(400).json({
        message: "Invalid report type. Valid types are 'order' or 'payment'.",
      });
    }

    let reportData;

    if (report === "order" || "payment") {
        reportData = await OrderReports.findAll();
    }
    if (!reportData || reportData.length === 0) {
      return res.status(404).json({
        message: `No ${report} reports found.`,
      });
    }

    return res.status(200).json({
      message: `${report.charAt(0).toUpperCase() + report.slice(1)} reports retrieved successfully`,
      data: reportData,
    });
  } catch (error) {
    console.error(`Error fetching ${report} reports:`, error);

    return res.status(500).json({
      message: "Internal Server Error. Please try again later.",
    });
  }
};

const labOrderAndPaymentReportGetById = async (req, res) => {
  const { id, report } = req.params;

  try {
    const validReports = ["order", "payment"];
    if (!validReports.includes(report)) {
      return res.status(400).json({
        message: "Invalid report type. Valid types are 'order' or 'payment'.",
      });
    }

    let reportData;

    if (report === "order") {
      reportData = await OrderReports.findOne({
        where: { id },
        attributes: [
          "orderId",
          "orderDate",
          "fromOrganization",
          "toOrganization",
          "patientId",
          "patientName",
        ],
        include: [
          {
            model: OrderService,
            as: "orderServices", // Use the alias from associations
            attributes: ["quantity", "price"],
            include: [
              {
                model: Services,
                as: "serviceDetails", 
                attributes: ["servicename"],
              },
            ],
          },
        ],
      });
    } else if (report === "payment") {
      reportData = await OrderReports.findOne({
        where: { id },
        attributes: [
          "orderId",
          "orderDate",
          "fromOrganization",
          "toOrganization",
          "patientId",
          "patientName",
          "totalAmount",
          "paidAmount",
          "paymentMethod",
          "remarks",
        ],
        include: [
          {
            model: OrderService,
            as: "orderServices",
            attributes: ["quantity", "price", "orgserviceId"],
            include: [
              {
                model: Services,
                as: "serviceDetails",
                attributes: ["servicename"],
              },
            ],
          },
        ],
      });
    }

    if (!reportData) {
      return res.status(404).json({
        message: `${report.charAt(0).toUpperCase() + report.slice(1)} report with ID ${id} not found.`,
      });
    }

    return res.status(200).json({
      message: `${report.charAt(0).toUpperCase() + report.slice(1)} report retrieved successfully`,
      data: reportData,
    });
  } catch (error) {
    console.error(`Error fetching ${report} report with ID ${id}:`, error);

    return res.status(500).json({
      message: "Internal Server Error. Please try again later.",
    });
  }
};

module.exports={labOrders,labAllOrders,labOrderAndPaymentReport,labOrderAndPaymentReportGetById}