const Organization = require("../../Models/Organization.model");
const OrderReports = require("../../Models/ReportsModel/OrderReport.model");

const technicianDashboardData = async(req,res)=>{
    const uid = req.user.id;
    if(!uid){
        res.status(401).json({message:"Unauthorized: User not found!"})
    }
    // const {Organization_id}=req.body;
    try {
        const orders = await OrderReports.findOne({
            where:{technician:uid}
        })

        if(!orders){
            return res.status(404).json({message:"No Orders found"})
        }
        const orderCounts = await Promise.all([
            OrderReports.count({where:{technician:uid,orderStatus:"processing"}}),
            OrderReports.count({where:{technician:uid,orderStatus:"completed"}})
        ])
        const orderList = await OrderReports.findAll({
            where:{technician:uid},
            include:[
                {
                    model:Organization,
                    as:"fromOrg",
                    attributes:['name']
                }
            ]
        })
        const orderStausWithNames = orderList.map((order)=>({
            ...order.toJSON(),
            fromOrganizationName:order.fromOrganizationName?order.fromOrganizationName.name : "Unknown"
        }))
        const response ={
            activeOrders:orderCounts[0],
            totalCompletedOrders:orderCounts[1],
            orderList:orderStausWithNames
        }
        return res.status(200).json({
            message:"Technician Dashboard Fetched Successfully!",
            response
        })
    } catch (error) {
        console.error("Error fetching order counts:", error);
      return res.status(500).json({ message: "Internal Server Error" }); 
    }
}

module.exports = {technicianDashboardData}