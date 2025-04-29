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
const TblOrganizationType = require("../../Models/TblOrganizationType.model");
const { sequelize } = require("../../config/db");
const Roles = require("../../Models/TblRoles.model");
const axios = require("axios");
const Notification = require("../../Models/Notification.model");

const technicianDashboardData = async (req, res) => {
  const uid = req.user?.id;
  if (!uid) {
    return res.status(401).json({ message: "Unauthorized: User not found!" });
  }

  try {
    const ordersExist = await OrderReports.findOne({
      where: { technician: uid },
    });

    if (!ordersExist) {
      return res.status(404).json({ message: "No Orders found" });
    }

    // Count active and completed orders
    const orderCounts = await Promise.all([
      OrderReports.count({
        where: {
          technician: uid,
          orderStatus: "processing",
          technician_assignment_status: "assigned_to_technician",
        },
      }),
      OrderReports.count({
        where: {
          technician: uid,

          technician_assignment_status: "technician_completed",
        },
      }),
    ]);

    // Fetch order list
    const orderList = await OrderReports.findAll({
      where: {
        technician: uid,
        technician_assignment_status: "assigned_to_technician",
      },
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
        }
      ],
      limit: 10,
      order: [['created_at', 'DESC']]
    });

    // Log fromOrganization values
    console.log(
      "Order fromOrganization values:",
      orderList.map((o) => o.fromOrganization)
    );

    const response = {
      activeOrders: orderCounts[0],
      totalCompletedOrders: orderCounts[1],
      orderList,
    };

    return res.status(200).json({
      message: "Technician Dashboard Fetched Successfully!",
      response,
    });
  } catch (error) {
    console.error("Error fetching technician dashboard:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

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

  orderStatus = orderStatus.toLowerCase(); // Normalize case
  if (!["processing", "completed", "cancelled"].includes(orderStatus)) {
    return res.status(400).json({
      message: "Order status is required and should be either processing, completed, or cancelled!",
    });
  }

  try {
    let whereClause = {
      technician: uid,
      is_visible_to_technician: true
    };

    if (orderStatus === "processing") {
      whereClause.orderStatus = "processing";
      whereClause.technician_assignment_status = "assigned_to_technician";

    } else if (orderStatus === "completed") {
      // whereClause.orderStatus = "completed";
      whereClause.technician_assignment_status = "technician_completed";
      
    } else if (orderStatus === "cancelled") {
      whereClause.orderStatus = "cancelled";
      whereClause.assignment_status = "assigned_to_technician"
    }

    const orders = await OrderReports.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "userDetails",
          attributes: ["id", "firstName"],
          include: [
            {
              model: Organization,
              as: "organization",
              attributes: ["name"],
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
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
      where: { id: orderId, technician: uid, },
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
          include:[
            {
              model:Organization,
              as:"organization",
              attributes:["id","name"]
            }
          ]
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

    console.log("Raw assignment_status:", order.technician_assignment_status);

    const orderDetails = {
      id: order.id,
      orderId: order.orderId,
      orderStatus: order.orderStatus,
      technician_assignment_status: order.technician_assignment_status || "unassigned",
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
        technician_assignment_status: { [Op.in]: ["assigned_to_technician", "technician_completed"] },
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
  
const CloseOrder = async (req, res) => {
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
  if (action !== "completed") {
    return res.status(400).json({ message: "Invalid action! Action must be 'completed'." });
  }

  const transaction = await sequelize.transaction({ autocommit: false });

  try {
    // Find technician with organization details
    const technician = await User.findOne({
      where: { id: uid },
      include: [
        {
          model: Organization,
          as: "organization",
          attributes: ["id"],
          include: [
            {
              model: TblOrganizationType,
              as: "organizationType",
              attributes: ["organizationType"],
            },
          ],
        },
      ],
      transaction,
    });

    if (!technician || !technician.organization || !technician.organization.organizationType) {
      await transaction.rollback();
      return res.status(404).json({ message: "User, organization, or organization type not found!" });
    }

    const organizationType = technician.organization.organizationType.organizationType;
    const isRadiology = organizationType === "Radiology";
    const isDentalLaboratory = organizationType === "Dental Laboratory";

    if (!isRadiology && !isDentalLaboratory) {
      await transaction.rollback();
      return res.status(400).json({ message: `Invalid organization type: ${organizationType}` });
    }

    // Find order
    const order = await OrderReports.findOne({
      where: { id: orderId,is_visible_to_technician: true },
      transaction,
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ message: "Order not found!" });
    }

    // Verify technician permission
    if (order.technician !== uid) {
      await transaction.rollback();
      return res.status(403).json({ message: "You don't have permission to modify this order!" });
    }

    // Verify assignment status
    if (order.technician_assignment_status !== "assigned_to_technician") {
      await transaction.rollback();
      return res.status(400).json({ message: "Order cannot be closed by technician in current status!" });
    }

    // Verify organization consistency
    const toOrganization = order.to_organization || order.dataValues.toOrganization;
    if (!toOrganization) {
      await transaction.rollback();
      return res.status(400).json({ message: "Order is missing organization information!" });
    }
    if (toOrganization !== technician.organization.id) {
      await transaction.rollback();
      return res.status(400).json({ message: "Order organization does not match technician's organization!" });
    }

    // Check current status
    if (order.orderStatus === "completed" && order.technician_assignment_status === "technician_completed") {
      await transaction.rollback();
      return res.status(400).json({ message: "Order is already marked as completed." });
    }

    if(isRadiology){
      order.orderStatus = "completed";
      order.technician_assignment_status = "technician_completed";
      await order.save({ transaction });
    }
    else{
      order.orderStatus = "processing";
      order.technician_assignment_status = "technician_completed";
      await order.save({ transaction });
    }

    // Update status

   if(isRadiology){
      order.orderStatus = "completed";
      order.assignment_status = "technician_completed";
      await order.save({ transaction });
    }
    else{
      order.orderStatus = "processing";
      order.assignment_status = "technician_completed";
      await order.save({ transaction });
    }


    // Notify technician (only for Radiology)
    if (isRadiology) {
      try {
        await Notification.create(
          {
            uid: uid,
            datetime: new Date(),
            title: "Order Completed",
            description: `Order ${order.orderId} has been marked as completed by you.`,
          },
          { transaction }
        );
        console.log(`Notification created successfully for technician ID ${uid} for order ID ${order.orderId}`);
      } catch (error) {
        console.error(`Failed to create notification for technician ID ${uid} for order ID ${order.orderId}:`, error.message);
      }

      if (technician.one_subscription) {
        try {
          const response = await axios.post(
            "https://onesignal.com/api/v1/notifications",
            {
              app_id: process.env.ONESIGNAL_APP_ID,
              include_player_ids: [technician.one_subscription],
              headings: { en: "Order Completed" },
              contents: {
                en: `Order ${order.orderId} has been marked as completed by you.`,
              },
            },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
              },
            }
          );
          console.log(`OneSignal push notification sent successfully to technician ID ${uid} for order ID ${order.orderId}`, response.data);
        } catch (error) {
          console.error(`Failed to send OneSignal push notification to technician ID ${uid} for order ID ${order.orderId}:`, error.response?.data || error.message);
        }
      } else {
        console.log(`No OneSignal push notification sent to technician ID ${uid} for order ID ${order.orderId}: one_subscription is missing`);
      }
    }

    // Notify dentist (only for Radiology, if payment_status is paid)
    if (isRadiology && order.payment_status === "paid") {
      const dentist = await User.findOne({
        where: { id: order.userUUID },
        include: [
          {
            model: Organization,
            as: "organization",
            attributes: ["id"],
          },
        ],
        transaction,
      });

      if (!dentist) {
        console.log(`No dentist found for userUUID ${order.userUUID} for order ID ${order.orderId}`);
      } else if (dentist.organization_id !== toOrganization) {
        console.log(`Dentist ID ${order.userUUID} does not belong to the same organization (ID ${toOrganization}) for order ID ${order.orderId}`);
      } else {
        try {
          await Notification.create(
            {
              uid: order.userUUID,
              datetime: new Date(),
              title: "Order Completed",
              description: `Order ${order.orderId} has been marked as completed by the technician.`,
            },
            { transaction }
          );
          console.log(`Notification created successfully for dentist ID ${order.userUUID} for order ID ${order.orderId}`);
        } catch (error) {
          console.error(`Failed to create notification for dentist ID ${order.userUUID} for order ID ${order.orderId}:`, error.message);
        }

        if (dentist.one_subscription) {
          try {
            const response = await axios.post(
              "https://onesignal.com/api/v1/notifications",
              {
                app_id: process.env.ONESIGNAL_APP_ID,
                include_player_ids: [dentist.one_subscription],
                headings: { en: "Order Completed" },
                contents: {
                  en: `Order ${order.orderId} has been marked as completed by the technician.`,
                },
              },
              {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
                },
              }
            );
            console.log(`OneSignal push notification sent successfully to dentist ID ${order.userUUID} for order ID ${order.orderId}`, response.data);
          } catch (error) {
            console.error(`Failed to send OneSignal push notification to dentist ID ${order.userUUID} for order ID ${order.orderId}:`, error.response?.data || error.message);
          }
        } else {
          console.log(`No OneSignal push notification sent to dentist ID ${order.userUUID} for order ID ${order.orderId}: one_subscription is missing`);
        }
      }
    }

    // Notify organization owners (for both Radiology and Dental Laboratory)
    const ownersFromOrganization = await User.findAll(
      {
        where: {
          organization_id: toOrganization,
        },
        include: [
          {
            model: Roles,
            as: "role",
            attributes: ["id", "rolename"],
            where: {
              rolename: "owner",
            },
          },
        ],
      },
      { transaction }
    );

    if (ownersFromOrganization.length > 0) {
      const ownerNotifications = ownersFromOrganization.map((owner) => ({
        organization_id: toOrganization,
        uid: owner.id,
        datetime: new Date(),
        title: "Order Completed",
        description: `Order ${order.orderId} has been marked as completed by the technician.`,
      }));

      try {
        await Notification.bulkCreate(ownerNotifications, { transaction });
        console.log(`Notifications created successfully for ${ownersFromOrganization.length} owners of organization ID ${toOrganization} for order ID ${order.orderId}`);
      } catch (error) {
        console.error(`Failed to create notifications for owners of organization ID ${toOrganization} for order ID ${order.orderId}:`, error.message);
      }

      const pushNotifications = ownersFromOrganization
        .filter((owner) => owner.one_subscription)
        .map((owner) =>
          axios.post(
            "https://onesignal.com/api/v1/notifications",
            {
              app_id: process.env.ONESIGNAL_APP_ID,
              include_player_ids: [owner.one_subscription],
              headings: { en: "Order Completed" },
              contents: {
                en: `Order ${order.orderId} has been marked as completed by the technician.`,
              },
            },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
              },
            }
          )
        );

      if (pushNotifications.length > 0) {
        try {
          const responses = await Promise.all(pushNotifications);
          console.log(`OneSignal push notifications sent successfully to ${pushNotifications.length} owners of organization ID ${toOrganization} for order ID ${order.orderId}`, responses.map((r) => r.data));
        } catch (error) {
          console.error(`Failed to send one or more OneSignal push notifications to owners of organization ID ${toOrganization} for order ID ${order.orderId}:`, error.response?.data || error.message);
        }
      } else {
        console.log(`No OneSignal push notifications sent to owners of organization ID ${toOrganization} for order ID ${order.orderId}: no owners with one_subscription`);
      }
    } else {
      console.log(`No owners found for organization ID ${toOrganization} for order ID ${order.orderId}`);
    }

    await transaction.commit();
    return res.status(200).json({ message: "Order has been successfully technician completed!" });
  } catch (error) {
    if (transaction.finished !== "commit") {
      await transaction.rollback();
    }
    console.error("Error while updating order:", error.stack);
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
  
    // Extract search term from query
    const searchTerm = Object.keys(req.query)[0]?.trim();
    console.log("Search Term:", searchTerm);
  
    if (!searchTerm || searchTerm === "") {
      return res.status(400).json({ message: "A valid search term is required" });
    }
  
    try {
      // Safe search term for SQL
      const searchPattern = `%${searchTerm}%`;
  
      // Fetch orders with search across orderId, orderDate, organization name, and service name
      const orders = await OrderReports.findAll({
        where: {
          technician: uid,
          [Op.or]: [
            { orderId: { [Op.like]: searchPattern } },
            // Cast orderDate to YYYY-MM-DD for search
            OrderReports.sequelize.where(
              OrderReports.sequelize.fn(
                "DATE_FORMAT",
                OrderReports.sequelize.col("order_date"),
                "%Y-%m-%d"
              ),
              { [Op.like]: searchPattern }
            ),
            // Subquery for organization name
            {
              userUUID: {
                [Op.in]: [
                  OrderReports.sequelize.literal(`
                    SELECT id FROM User
                    WHERE organization_id IN (
                      SELECT id FROM Organization
                      WHERE name LIKE :searchPattern
                    )
                  `),
                ],
              },
            },
            // Subquery for service name
            {
              id: {
                [Op.in]: [
                  OrderReports.sequelize.literal(`
                    SELECT order_id FROM OrderServices
                    WHERE orgservice_id IN (
                      SELECT id FROM Organization_Service
                      WHERE service_id IN (
                        SELECT id FROM Services
                        WHERE servicename LIKE :searchPattern
                      )
                    )
                  `),
                ],
              },
            },
          ],
        },
        include: [
          {
            model: User,
            as: "userDetails",
            attributes: ["id", "firstName"],
            required: false,
            include: [
              {
                model: Organization,
                as: "organization",
                attributes: ["id", "name"],
                required: false,
              },
            ],
          },
          {
            model: OrderServices,
            as: "orderServices",
            attributes: ["id"],
            required: false,
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
        ],
        attributes: [
          "id",
          "orderId",
          "orderDate",
          "requiredDate",
          "toothName",
          "shades",
          "remarks",
          "patientId",
          "patientName",
          "subTotal",
          "totalAmount",
          "payment_status",
          "fromOrganization",
        ],
        order: [["orderDate", "DESC"]],
        replacements: { searchPattern },
      });
  
      console.log("Raw Orders:", JSON.stringify(orders, null, 2));
  
      if (!orders || orders.length === 0) {
        return res.status(404).json({ message: "No orders found matching the search criteria!" });
      }
  
      // Map orders to response format
      const filteredOrders = orders.map((order) => ({
        id: order.id,
        orderId: order.orderId,
        orderDate: order.orderDate,
        requiredDate: order.requiredDate,
        toothName: order.toothName,
        shades: order.shades,
        remarks: order.remarks,
        patientId: order.patientId,
        patientName: order.patientName,
        subTotal: order.subTotal,
        totalAmount: order.totalAmount,
        payment_status: order.payment_status,
        fromOrganizationId: order.userDetails?.organization?.id || order.fromOrganization || null,
        fromOrganizationName: order.userDetails?.organization?.name || "Unknown",
        doctorName: order.userDetails?.firstName || "Unknown",
        services: order.orderServices.map((service) => ({
          id: service.id,
          servicename: service.orgservice?.servicess?.servicename || "Unknown",
        })),
      }));
  
      return res.status(200).json({
        message: "Orders fetched successfully!",
        filteredOrders,
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

    const orderData = await OrderReports.findAll(
      {
        where: {
          technician: uid,
          orderStatus: "processing",
          technician_assignment_status: "technician_completed",
          is_visible_to_technician: true
        },
      }
    );

    console.log(orderData, "ttttttttttttttttttttttttttttttt");
  
    try {
      const [affectedRows] = await OrderReports.update(
        { is_visible_to_technician: false },
        {
          where: {
            technician: uid,
            orderStatus: "completed",
            technician_assignment_status: "technician_completed",
            is_visible_to_technician: true
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
        { is_visible_to_technician: false },
        {
          where: {
            technician: uid,
            technician_assignment_status: "cancelled",
            is_visible_to_technician: true
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
  CloseOrder,
  UploadImagesByTechnician,
  SearchAPI,
  TechnicianDashboardOrderSearch,
  ClearAllCompletedOrders,
  ClearAllCancelledOrders
};
