const OrderReports = require("../../Models/ReportsModel/OrderReport.model")


const labAllOrders=async(req,res)=>{
    try {
        const orderCounts=await Promise.all([
            OrderReports.count({where:{orderStatus:"processing"}})
        ])
    } catch (error) {
        
    }
}