const { Op } = require("sequelize");
const Organization = require("../../Models/Organization.model");
const OrderReports = require("../../Models/ReportsModel/OrderReport.model");
const User = require("../../Models/ReportsModel/User.model");
const OrderServices = require("../../Models/ReportsModel/OrderServices.model");
const Services = require("../../Models/TblServices.model");

const technicianDashboardData = async(req,res)=>{
    const uid = req.user?.id;
    if(!uid){
        res.status(401).json({message:"Unauthorized: User not found!"})
    }
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
            where:{technician:uid,orderStatus:"processing"},
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
            fromOrganizationName: order.fromOrg ? order.fromOrg.name : "Unknown"
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

const FetchTechnicianOrdersByStatus = async (req, res) => {
    const uid = req.user?.id;
    console.log("Technician ID:", uid);
        
    if (!uid) {
        return res.status(401).json({ message: "Unauthorized: User not found!" });
    }

    let { orderStatus } = req.query;
    console.log("Order Status Query:", orderStatus);

    if (!orderStatus) {
        return res.status(400).json({ message: "orderStatus is required." });
    }

    if (!["processing", "completed", "cancelled"].includes(orderStatus)) {
        return res.status(400).json({
            message: "Order status is required and should be either processing, completed, or cancelled!"
        });
    }

    try {
        orderStatus = [orderStatus];

        const orders = await OrderReports.findAll({
            where: { technician: uid, orderStatus: { [Op.in]: orderStatus } },
            include:[
                {
                    model:Organization,
                    as:"fromOrg",
                    attributes:['name']
                }
            ]
        });

        if (!orders.length) {
            return res.status(404).json({ message: "No orders found with the specified status!" });
        }

        res.status(200).json({ message: "Orders fetched successfully!", orders });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

const ViewOrderDetails = async (req, res) => {
    try {
        const uid = req.user?.id;
        if (!uid) {
            return res.status(401).json({ message: "Unauthorized: User not found!" });
        }

        const { orderId } = req.params;

        const order = await OrderReports.findOne({
            where: { id: orderId, technician: uid },
            include: [
                {
                    model: Organization,
                    as: "fromOrg",
                    attributes: ["id", "name"]
                },
                {
                    model: Organization,
                    as: "toOrg",
                    attributes: ["id", "name"]
                },
                {
                    model: User,
                    as: "userDetails",
                    attributes: ["id", "firstName"]
                },
                {
                    model: OrderServices,
                    as: "orderServices",
                    attributes: ["id", "orderId", "quantity"],
                    include: [
                        {
                            model: Services,
                            as: "serviceDetails",
                            attributes: ["id", "servicename"],
                        }
                    ]
                }
            ],
        });

        if (!order) {
            return res.status(404).json({ message: "Order not found or access denied!" });
        }

        const orderDetails = {
            id: order.id,
            orderId: order.orderId,
            orderStatus: order.orderStatus,
            orderDate: order.orderDate,
            requiredDate: order.requiredDate,
            toothName: order.toothName,
            shades: order.shades,
            remarks: order.remarks,
            payment_status: order.payment_status,
            subTotal: order.subTotal,
            tax: order.tax,
            serviceCharges: order.serviceCharges,
            totalAmount: order.totalAmount,
            paidAmount: order.paidAmount,
            paymentMethod: order.paymentMethod,
            patientId: order.patientId,
            patientName: order.patientName,
            technician: order.technician,
            doctorName: order.user ? order.user.firstName : "Unknown Doctor",
            hospitalName: order.fromOrg ? order.fromOrg.name : "Unknown Hospital",
            laboratoryName: order.toOrg ? order.toOrg.name : "Unknown Laboratory",

            orderServices: order.orderServices.map(service => {
                console.log("Service Details:", service.serviceDetails);
                return {
                    id: service.id,
                    quantity: service.quantity,
                    servicename: service.serviceDetails?.servicename || "Unknown"
                };
            })
                       
        };

        return res.status(200).json({
            message: "Order fetched successfully!",
            order: orderDetails
        });

    } catch (error) {
        console.error("Error fetching order details:", error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};


module.exports = {technicianDashboardData,FetchTechnicianOrdersByStatus,ViewOrderDetails}