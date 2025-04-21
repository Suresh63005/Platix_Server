const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const Organization = require("../../Models/Organization.model");
const OrderReports = require("../../Models/ReportsModel/OrderReport.model");
const User = require("../../Models/ReportsModel/User.model");
const OrderServices = require("../../Models/ReportsModel/OrderServices.model");
const Services = require("../../Models/TblServices.model");
const uploadToS3 = require("../../config/fileUpload.aws");
const UploadImages = require("../../Models/ReportsModel/UploadImages.model");
const TblOrganization_Service = require("../../Models/tblOrganizationService");

const technicianDashboardData = async(req,res)=>{
    const uid = req.user?.id;
    if(!uid){
        res.status(401).json({message:"Unauthorized: User not found!"})
    }
    try {
      const ordersExist = await OrderReports.findOne({
        where: { technician: uid },
      });

        if(!ordersExist){
            return res.status(404).json({message:"No Orders found"})
        }
        // Count active and completed orders
        const orderCounts = await Promise.all([
          OrderReports.count({
            where: {
              technician: uid,
              orderStatus: "processing",
              assignment_status: "assigned_to_technician",
            },
          }),
          OrderReports.count({
            where: {
              technician: uid,
              orderStatus: "processing",
              assignment_status: "technician_completed",
            },
          }),
        ]);

                // Fetch order list
        const orderList = await OrderReports.findAll({
          where: { technician: uid, orderStatus: "processing",assignment_status: "assigned_to_technician" },
          include: [
            {
              model: Organization,
              as: "fromOrg",
              attributes: ["name"],
            },
          ],
        });

        // const orderStausWithNames = orderList.map((order)=>({
        //     ...order.toJSON(),
        //     fromOrganizationName: order.fromOrg ? order.fromOrg.name : "Unknown"
        // }))

        // const response ={
        //     activeOrders:orderCounts[0],
        //     totalCompletedOrders:orderCounts[1],
        //     orderList,
        // }
        // return res.status(200).json({
        //     message:"Technician Dashboard Fetched Successfully!",
        //     response
        // })

        const response = {
          activeOrders: orderCounts[0],
          totalCompletedOrders: orderCounts[1],
          orderList: orderList.map((order) => ({
            ...order.toJSON(),
            fromOrganizationName: order.fromOrg ? order.fromOrg.name : "Unknown",
          })),
        };
    
        return res.status(200).json({
          message: "Technician Dashboard Fetched Successfully!",
          response,
        });

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
      message: "Order status is required and should be either processing, completed, or cancelled!",
    });
  }

  try {
    const whereClause = {
      technician: uid,
      orderStatus:"processing",
    };

    // For processing, include assignment_status filter
    if (orderStatus === "processing") {
      whereClause.assignment_status = {
        [Op.in]: ["assigned_to_technician"],
      };
    }

    if (orderStatus === "completed") {
      whereClause.assignment_status = {
        [Op.in]: ["technician_completed"],
      };
    }
    
    if (orderStatus === "cancelled") {
      whereClause.assignment_status = {
        [Op.in]: ["cancelled"],
      };
    }

    const orders = await OrderReports.findAll({
      where: whereClause,
      include: [
        {
          model:User,
          as: "userDetails",
          attributes: ["id","firstName"],
          include:[
            {
              model: Organization,
              as: "organization",
              attributes: ["name"],
            },
          ]
        },

      ],
    });

    if (!orders.length) {
      return res.status(404).json({ message: "No orders found with the specified status!" });
    }

    res.status(200).json({ message: "Orders fetched successfully!", orders: orders });
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
          as: "toOrg",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "userDetails",
          attributes: ["id", "firstName"],
        },
        {
          model: OrderServices,
          as: "orderServices",
          attributes: ["id", "orderId", "quantity"],
          include: [
            {
              model: TblOrganization_Service,
              as: "orgservice",
              attributes: ["id", "organization_id", "service_id"],
              include: [
                {
                  model: Services,
                  as: "servicess",
                  attributes: ["id", "servicename"],
                },
              ],
            },
          ],
        },
        {
          model: UploadImages,
          as: "orderImages",
          attributes: ["id", "images", "order_id"],
          required: false,
        },
      ],
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found or access denied!" });
    }

    console.log("Raw assignment_status:", order.assignment_status);

    const orderDetails = {
      id: order.id,
      orderId: order.orderId,
      orderStatus: order.orderStatus,
      assignment_status: order.assignment_status || "unassigned",
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
      doctorName: order.userDetails ? order.userDetails.firstName : "Unknown Doctor",
      laboratoryName: order.toOrg ? order.toOrg.name : "Unknown Laboratory",
      orderServices: order.orderServices.map((service) => ({
        id: service.id,
        quantity: service.quantity,
        servicename: service.orgservice?.servicess?.servicename || "Unknown",
      })),
      orderImages: order.orderImages.map((image) => ({
        id: image.id,
        images: JSON.parse(image.images),
        order_id: image.order_id,
      })),
    };

    console.log("Formatted orderDetails:", JSON.stringify(orderDetails, null, 2));

    return res.status(200).json({
      message: "Order fetched successfully!",
      order: orderDetails,
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
      where: {
        technician: uid,
        id: orderId,
        orderStatus:{[Op.in]:[ "processing","completed"]},
        assignment_status: { [Op.in]: ["assigned_to_technician", "technician_completed"] },
      },
    });
    if (!order) {
      return res.status(404).json({
        message: "Order not found, not in valid status, or you don't have permission to upload images for it!",
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
  const { action } = req.query;

  // Input validation
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
    // Find order
    const order = await OrderReports.findOne({
      where: { technician: uid, id: orderId },
    });
    if (!order) {
      return res.status(404).json({
        message: "Order not found or you don't have permission to modify it!",
      });
    }

    // Check current status
    if (action === "cancelled" && order.orderStatus === "processing" && order.assignment_status === "assigned_to_technician") {
      return res.status(400).json({ message: "Order is already in processing status." });
    }
    if (action === "completed" && order.orderStatus === "processing" && order.assignment_status === "technician_completed") {
      return res.status(400).json({ message: "Order is already marked as technician completed." });
    }
    if (order.orderStatus === "completed" && action === "cancelled") {
      return res.status(400).json({ message: "Fully completed order cannot be cancelled!" });
    }

    // Update status
    if (action === "cancelled") {
      order.orderStatus = "processing";
      // assignment_status remains unchanged (e.g., assigned_to_technician)
    } else if (action === "completed") {
      order.orderStatus = "processing";
      order.assignment_status = "technician_completed";
    }

    await order.save();

    // Response message
    const statusMessage = action === "cancelled" ? "set to processing" : "marked as technician completed";
    return res.status(200).json({ message: `Order has been successfully ${statusMessage}!` });
  } catch (error) {
    console.error("Error while updating order:", error);
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

  const TechnicianDashboardOrderSearch = async (req, res) => {
    const uid = req.user?.id;
    if (!uid) {
      return res.status(401).json({ message: "Unauthorized: User not found!" });
    }
  
    // Extract the search term from the first query parameter key
    const searchTerm = Object.keys(req.query)[0];
    console.log("Search Term:", searchTerm);
  
    if (!searchTerm || searchTerm.trim() === "") {
      return res.status(400).json({ message: "A valid search term is required" });
    }
  
    try {
      // Define the where clause for the database query
      const whereClause = {
        technician: uid,
        [Op.or]: [
          { orderId: { [Op.like]: `%${searchTerm}%` } },
          { orderDate: { [Op.like]: `%${searchTerm}%` } },
        ],
      };
  
      // Fetch orders from the database
      const orders = await OrderReports.findAll({
        where: whereClause,
        include: [
          {
            model: Organization,
            as: "fromOrg",
            attributes: ["name"],
            required: false,
          },
        ],
        order: [["orderDate", "DESC"]],
      });
  
      console.log("Raw Orders:", JSON.stringify(orders, null, 2));
  
      // Filter orders to ensure search term matches
      const filteredOrders = orders.filter((order) => {
        const orderIdMatch = order.orderId.toLowerCase().includes(searchTerm.toLowerCase());
        const orderDateMatch = order.orderDate.toString().toLowerCase().includes(searchTerm.toLowerCase());
        const orgNameMatch =
          order.fromOrg && order.fromOrg.name.toLowerCase().includes(searchTerm.toLowerCase());
  
        return orderIdMatch || orderDateMatch || orgNameMatch;
      });
  
      if (!filteredOrders || filteredOrders.length === 0) {
        return res.status(404).json({ message: "No orders found matching the search criteria!" });
      }
  
      // Format the filtered orders for the response
      const formattedOrders = filteredOrders.map((order) => ({
        id: order.id,
        orderId: order.orderId,
        orderDate: order.orderDate,
        orderStatus: order.orderStatus,
        assignment_status: order.assignment_status,
        fromOrganizationName: order.fromOrg ? order.fromOrg.name : "Unknown",
        toothName: order.toothName,
        shades: order.shades,
        totalAmount: order.totalAmount,
        patientName: order.patientName,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      }));
  
      return res.status(200).json({
        message: "Orders fetched successfully!",
        totalResults: formattedOrders.length,
        orders: formattedOrders,
      });
    } catch (error) {
      console.error("Error in SearchAPI:", error);
      return res.status(500).json({ message: "Internal Server Error: " + error.message });
    }
  };

  const ClearAllCompletedOrders = async (req, res) => {
    const uid = req.user?.id;
    if (!uid) {
      return res.status(401).json({ message: "Unauthorized: User not found!" });
    }
  
    try {
      const [affectedRows] = await OrderReports.update(
        { technician: null },
        {
          where: {
            technician: uid,
            orderStatus: "processing",
            assignment_status: "technician_completed",
          },
        }
      );
  
      if (affectedRows === 0) {
        return res.status(404).json({ message: "No technician-completed orders found!" });
      }
  
      return res.status(200).json({ message: "All technician-completed orders cleared successfully" });
    } catch (error) {
      console.error("Error in ClearAllCompletedOrders:", error);
      return res.status(500).json({ message: "Internal Server Error: " + error.message });
    }
  };
  
  const ClearAllCancelledOrders = async (req, res) => {
    const uid = req.user?.id;
    if (!uid) {
      return res.status(401).json({ message: "Unauthorized: User not found!" });
    }
  
    try {
      const [affectedRows] = await OrderReports.update(
        { technician: null },
        {
          where: {
            technician: uid,
            orderStatus: "cancelled",
          },
        }
      );
  
      if (affectedRows === 0) {
        return res.status(404).json({ message: "No cancelled orders found for this technician!" });
      }
  
      return res.status(200).json({ message: "All cancelled orders cleared successfully" });
    } catch (error) {
      console.error("Error in ClearAllCancelledOrders:", error);
      return res.status(500).json({ message: "Internal Server Error: " + error.message });
    }
  };

module.exports = {
  technicianDashboardData,
  FetchTechnicianOrdersByStatus,
  ViewOrderDetails,
  CancelAndCloseOrder,
  UploadImagesByTechnician,
  SearchAPI,
  TechnicianDashboardOrderSearch,
  ClearAllCompletedOrders,
  ClearAllCancelledOrders
};