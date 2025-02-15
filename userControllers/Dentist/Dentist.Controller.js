// const allOrders=async(req,res)=>{
//     try {
//         const orderCounts=await Promise.all([
//             OrderReports.count({where:{orderStatus:"pending"}}),
//             OrderReports.count({where:{orderStatus:"processing"}}),
//             OrderReports.count({where:{orderStatus:"completed"}}),
//             OrderReports.count({where:{orderStatus:"cancelled"}}),
//             OrderReports.count({where:{orderStatus:["completed","cancelled"]}})
//         ]);

//         const reciveAmounts=await OrderReports.sum("paidAmount",{where:{orderStatus:{[Op.in]:["completed","cancelled","pending","processing"]}}})
//         console.log(reciveAmounts)
//         const response={
//             pending:orderCounts[0],
//             processing:orderCounts[1],
//             completed:orderCounts[2],
//             cancelled:orderCounts[3],
//             closed:orderCounts[4],
//             totalRecivedAmounts:reciveAmounts || 0,
//         }
//         return res.status(200).json(response)
//     } catch (error) {
//         console.error("Error fetching order counts:", error);
//         return res.status(500).json({ message: "Internal Server Error" });
//     }
// }