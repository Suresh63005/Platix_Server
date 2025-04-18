const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const Organization = require("../../Models/Organization.model");
const OrderReports = require("../../Models/ReportsModel/OrderReport.model");
const User = require("../../Models/ReportsModel/User.model");
const OrderServices = require("../../Models/ReportsModel/OrderServices.model");
const Services = require("../../Models/TblServices.model");
const uploadToS3 = require("../../config/fileUpload.aws");
const UploadImages = require("../../Models/ReportsModel/UploadImages.model");

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
        // const orderStausWithNames = orderList.map((order)=>({
        //     ...order.toJSON(),
        //     fromOrganizationName: order.fromOrg ? order.fromOrg.name : "Unknown"
        // }))
        const response ={
            activeOrders:orderCounts[0],
            totalCompletedOrders:orderCounts[1],
            orderList,
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

const UploadImagesByTechnician = async (req, res) => {
    const uid = req.user?.id;
  
    if (!uid) {
      return res.status(401).json({ message: "Unauthorized: User not found!" });
    }
  
    const { orderId } = req.query;
    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required!" });
    }
  
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "At least one image is required!" });
    }
  
    try {
      const order = await OrderReports.findOne({
        where: { technician: uid, id: orderId,orderStatus:{[Op.or]:["processing", "completed"]}},
      });
      if (!order) {
        return res.status(404).json({
          message: "Order not found or you don't have permission to upload images for it!",
        });
      }
  
      const imageUploadPromises = req.files.map((file) =>
        uploadToS3(file, "technician-uploads")
      );
      const imageUrls = await Promise.all(imageUploadPromises);
  
      const uploadRecord = await UploadImages.create({
        id: uuidv4(),
        uid: uid,
        order_id: orderId,
        images: JSON.stringify(imageUrls), 
      });
  
      return res.status(200).json({
        message: "Images uploaded successfully!",
        data: {
          orderId: orderId,
          imageUrls: imageUrls,
          uploadRecordId: uploadRecord.id,
        },
      });
    } catch (error) {
      console.error("Error in UploadImagesByTechnician:", error);
      return res.status(500).json({
        message: "Internal server error: " + error.message,
      });
    }
  };
  
  const CancelAndCloseOrder = async (req, res) => {
    const uid = req.user?.id;
    const { orderId } = req.body;
    const {action}=req.query
    if (!uid) {
      return res.status(401).json({ message: "Unauthorized: User not found!" });
    }
    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required!" });
    }
    if (!action || !["cancelled", "completed"].includes(action)) {
      return res.status(400).json({ message: "Invalid action! Action must be 'cancelled' or 'completed'." });
    }
  
    try {
      const order = await OrderReports.findOne({ where: { technician: uid, id: orderId } });
      if (!order) {
        return res.status(404).json({ message: "Order not found! or you don't have permission to modify it!" });
      }
      if (order.orderStatus === action) {
        return res.status(400).json({ message: `Order is already marked as ${action}.` });
      }
      if (order.orderStatus === "completed" && action === "cancelled") {
        return res.status(400).json({ message: "Completed order cannot be cancelled!" });
      }
  
      order.orderStatus = action;
      await order.save();
  
      return res.status(200).json({ message: `Order has successfully ${action}!` });
    } catch (error) {
      console.error("Error while updating order: ", error);
      return res.status(500).json({ message: "Internal server error: " + error.message });
    }
  };

  const SearchAPI = async(req,res)=>{
    const uid = req.user?.id;
    if(!uid){
        return res.status(401).json({message:"Unauthorized: User not found!"})
    }
    const {orderId,orderDate,fromOrg} = req.query;
    const whereClause = {technician:uid}

    if(orderId){
        whereClause.id = {[Op.like]:`${orderId}`}
    }
    if(fromOrg){

    }
    if(orderDate){
        whereClause.orderDate={
            [Op.gte]:new Date(orderDate).setHours(0,0,0,0),
            [Op.lte]: new Date(orderDate).setHours(23,59,59,999)
        }
    }
    try {
      const orders = await OrderReports.findAll({
        where: whereClause,
        include: [
          {
            model: Organization,
            as: "fromOrg",
            attributes: ["name"],
            where: fromOrg
              ? { name: { [Op.like]: `%${fromOrg}%` } }
              : undefined,
          },
        ],
        order: [["orderDate", "DESC"]],
      });
      if (!orders || orders.length === 0) {
        return res
          .status(404)
          .json({ message: "No orders found matching the search criteria!" });
      }
      const response = orders.map((order) => ({
        ...order.toJSON(),
        fromOrganizationName: order.fromOrg ? order.fromOrg.name : "Unknown",
      }));

      return res.status(200).json({
        message: "Orders fetched successfully!",
        orders: response,
      });
    } catch (error) {
      console.error("Error in SearchAPI:", error);
      return res
        .status(500)
        .json({ message: "Internal Server Error: " + error.message });
    }
  }

module.exports = {
  technicianDashboardData,
  FetchTechnicianOrdersByStatus,
  ViewOrderDetails,
  CancelAndCloseOrder,
  UploadImagesByTechnician,
  SearchAPI
  
};