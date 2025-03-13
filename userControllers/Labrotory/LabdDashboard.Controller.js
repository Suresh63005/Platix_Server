const { Op } = require("sequelize");
const OrderReports = require("../../Models/ReportsModel/OrderReport.model");
const Organization = require("../../Models/Organization.model");


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
        completedPayableBills: orderCounts[1],
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
module.exports={labOrders}