const { Op } = require("sequelize");
const Organization = require("../../Models/Organization.model");
const OrderReports = require("../../Models/ReportsModel/OrderReport.model");
const User = require("../../Models/ReportsModel/User.model");
const OrderServices = require("../../Models/ReportsModel/OrderServices.model");
const TblOrganization_Service = require("../../Models/tblOrganizationService");
const Services = require("../../Models/TblServices.model");
const TblOrganizationType = require("../../Models/TblOrganizationType.model");
const Roles = require("../../Models/TblRoles.model");
const Notification = require("../../Models/Notification.model");
const axios=require("axios")

// getall dashboard data and searching also
const getAll = async (req, res) => {
  const uid = req.user?.id;
  if (!uid) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { search } = req.query;

  try {
    let orderList = [];
    let activeOrders = 0;
    let completedOrders = 0;

    [activeOrders, completedOrders] = await Promise.all([
      OrderReports.count({ where: { orderStatus: "processing", delivery_boy: uid } }),
      OrderReports.count({ where: { orderStatus: "completed", delivery_boy: uid } })
    ]);
    // If search query is provided, perform search
    if (search) {
      orderList = await OrderReports.findAll({
        where: {
          [Op.or]: [
            { orderId: { [Op.like]: `%${search}%` } },
            { "$toOrg.name$": { [Op.like]: `%${search}%` } }
          ],
          delivery_boy: uid,
          orderStatus: "processing"
        },
        include: [
          {
            model: Organization,
            as: 'toOrg',
            attributes: ['name'],
          },
          {
            model: Organization,
            as: 'fromOrg',
            attributes: ['name'],
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // if (orderList.length === 0) {
      //   return res.status(404).json({ message: "No orders found matching your search." });
      // }

    } else {
      // If no search term is provided, retrieve active orders and completed orders 
      orderList = await OrderReports.findAll({
        include: [
          {
            model: Organization,
            attributes: ['name'],
            as: 'toOrg',
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        where: {
          delivery_boy: uid,
          orderStatus: "processing"
        }
      });
    }

    const response = {
      activeOrders,
      completedOrders,
      orderList: orderList.map(order => ({
        ...order.toJSON(),
      }))
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error fetching order counts:', error);
    return res.status(500).json({
      message: 'Failed to retrieve order counts. Please try again later.',
      error: error.message
    });
  }
};

//get all active || cancelled || closed order data
const deliveryAllOrders = async (req, res) => {
  const uid = req.user?.id;
  const { orderStatus } = req.params;

  if (!uid) {
    return res.status(401).json({ message: "Unauthorized. Please log in." });
  }
  const validOrderStatuses = ["processing", "completed", "cancelled"];
  if (!validOrderStatuses.includes(orderStatus)) {
    return res.status(400).json({ message: "Invalid order status. Valid statuses are 'processing', 'completed', or 'cancelled'." });
  }

  try {
    const allOrders = await OrderReports.findAll({
      where: {
        orderStatus,
        is_visible_to_delivery: true,
        [Op.or]: [
          { delivery_boy: uid },
        ]
      },
      include: [
        {
          model: User,
          as: 'userDetails',
          attributes: ['id', 'firstName', 'email', 'address', 'hospital_name'],
          include: [
            {
              model: Organization, // from organization
              as: "organization",
              attributes: ["id", "name"]
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      [orderStatus]: allOrders.map(order => ({
        ...order.toJSON(),

      }))
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// get specific id by details
const orderDetailsGetById = async (req, res) => {
  const uid = req.user?.id;
  console.log(uid)
  const { id } = req.params;
  console.log(id)
  if (!uid) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const orderReport = await OrderReports.findOne({
      where: {
        id,
        delivery_boy: uid
      },
      include: [
        {
          model: User,
          as: 'userDetails',
          attributes: ['id', 'firstName', 'email', 'address', 'hospital_name',"googleMapLink"],
          include: [
            {
              model: Organization,
              as: 'organization',
              attributes: ['id', 'name'],
            }
          ]
        },
        {
          model: User,
          as: 'deliveryBoy',
          attributes: ['id', 'firstName', 'lastName', 'email',]
        }
        // here shown doctor details mean useruuid in orderreports table
      ]
    });

    // Fetch the services related to the order
    const orderServices = await OrderServices.findAll({
      where: { orderId: orderReport.id },
      attributes: ['id', 'orderId', 'price', 'quantity'],
      include: [
        {
          model: TblOrganization_Service,
          as: 'orgservice',
          attributes: ['id', 'service_id', 'price'],
          include: [
            {
              model: Services,
              as: 'servicess',
              attributes: ['id', 'servicename']
            }
          ]
        }
      ]
    });

    const toOrganizationDetails = await Organization.findByPk(orderReport.toOrganization, {
      attributes: ['id', 'name'],
      include: [
        {
          model: TblOrganizationType,
          as: 'organizationType',
          attributes: ['id', 'organizationType']
        }
      ]
    });
    const fromOrganizationDetails = await Organization.findByPk(orderReport.fromOrganization, {
      attributes: ['id', 'name'],
      include: [
        {
          model: TblOrganizationType,
          as: 'organizationType',
          attributes: ['id', 'organizationType']
        }
      ]
    });

    const orderData = orderReport.toJSON()
    orderData.doctorDetails = orderData.userDetails; //Creates a new key called doctorDetails and assigns it the value of userDetails (which was loaded from the association).
    delete orderData.userDetails; //Removes the original userDetails key from the object, so only doctorDetails will appear in the final response.

    return res.status(200).json({
      success: true,
      message: "Order report found successfully!",
      data: {
        ...orderData,
        orderServices,
        toOrganizationDetails,
        fromOrganizationDetails
      }
    });

  } catch (error) {
    console.error("Error fetching order report:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

const upsert = async (req, res) => {
  const uid = req.user?.id;
  const { id, userUUID, fromOrganization, toOrganization, toothName, shades, remarks, services } = req.body;
  const orderDate = new Date().toISOString().split('T')[0];
  const servicesArray = Array.isArray(services) ? services : [services];
  const generateUniqueId = async (prefix, model, field) => {
    let uniqueId;
    let exists;
    do {
      uniqueId = `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;
      exists = await model.findOne({ where: { [field]: uniqueId } });
    } while (exists);
    return uniqueId;
  };

  try {
    let orderReport;

    if (id) {
      orderReport = await OrderReports.findByPk(id);

      if (!orderReport) {
        return res.status(404).json({ success: false, message: "Order not found!" });
      }

      orderReport = await orderReport.update({
        userUUID,
        fromOrganization,
        toOrganization,
        orderDate,
        toothName,
        shades,
        remarks,
        delivery_boy: uid,
      });
    } else {
      const orderIdValue = await generateUniqueId("ORD", OrderReports, "orderId");
      orderReport = await OrderReports.create({
        userUUID,
        fromOrganization,
        toOrganization,
        orderDate,
        toothName,
        shades,
        remarks,
        delivery_boy: uid,
        orderId: orderIdValue
      });
    }

    if (servicesArray.length > 0) {
      const orderServicesData = servicesArray.map(service => ({
        orderId: orderReport.id,
        orgserviceId: service.service_id,
        quantity: service.quantity,
        price: service.price
      }));

      await OrderServices.destroy({ where: { orderId: orderReport.id } });
      await OrderServices.bulkCreate(orderServicesData);
    }

    return res.status(id ? 200 : 201).json({
      success: true,
      message: id ? "Order updated successfully!" : "Order created successfully!",
      data: orderReport
    });

  } catch (error) {
    console.error("Error upserting order:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

const closedOrder = async (req, res) => {
  const uid = req.user?.id;

  console.log(uid)
  if (!uid) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { id } = req.params;
  console.log(id);

  try {
    const order = await OrderReports.findOne({
      where: {
        id: id,
        delivery_boy: uid,

      }
    });
    if (!order) {
      return res.status(404).json({ message: "Order not found or not assigned to you." });
    }
    console.log(order)

    if (order.orderStatus === "completed") {
      return res.status(400).json({ message: "Order already closed" });
    }

    await OrderReports.update(
      {
        orderStatus: "completed",
      },
      { where: { id } }
    );

    // notification send
    const sendUser = await User.findByPk(uid);
    const organizationId = sendUser.organization_id;

    console.log(organizationId,"uuuuuuuuuuuuuuuuuuuu");
    (async () => {

      const pushPromise = sendUser?.one_subscription
        ? axios.post(
          "https://onesignal.com/api/v1/notifications",
          {
            app_id: process.env.ONESIGNAL_APP_ID,
            include_player_ids: [sendUser.one_subscription],
            headings: { en: "Order Closed" },
            contents: {
              en: `Order ID ${order.orderId} has been closed by delivery boy`,
            },
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
            },
          }
        )
        : Promise.resolve();

      const notifPromise = Notification.create({
        uid: uid,
        datetime: new Date(),
        title: "Order Closed",
        description: `Order ID ${order.orderId} has been closed by delivery boy`,
      });
      console.log("not2")
      await Promise.allSettled([pushPromise, notifPromise]); // No need to wait in main flow
    })();

    const ownersFromOrganization = await User.findAll({
      where: {
        organization_id: organizationId,
      },
      include: [
        {
          model: Roles,
          as: "role",
          attributes: ["id", "rolename"],
          where: {
            rolename: "owner"
          }
        }
      ]
    });

    console.log(ownersFromOrganization,"ownerrrrrrrrrrrrrrrrrrrrrrr")
    // console.log(ownersFromOrganization, "ownersFromOrganization");
    if (ownersFromOrganization.length > 0) {
      const notifications = ownersFromOrganization.map((owner) => {
        console.log("1111111111");
        return {
          organization_id: organizationId,
          uid: owner.id,
          datetime: new Date(),
          title: "Order Closed",
          description: `Order ID ${order.orderId} has been closed by delivery boy`,

        }
      })
      console.log("notttttttttttttttt")
      await Notification.bulkCreate(notifications)

      //// 🔹 Send push notification (OneSignal)
      const pushNotifications = ownersFromOrganization.filter((owner) => owner.one_subscription).map((owner) => {
        console.log("222222222222222")
        return axios.post("https://onesignal.com/api/v1/notifications", {
          app_id: process.env.ONESIGNAL_APP_ID,
          include_player_ids: [owner.one_subscription],
          headings: { en: "Order Closed" },
          contents: { en: `Order ID ${order.orderId} has been closed by delivery boy` },
        },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
            }
          })
      })

      try {
        await Promise.all(pushNotifications)
        console.log(" Push notifications sent to all owners.");
      } catch (pushError) {
        // console.warn("⚠️ One or more push notifications failed:", pushError.message);
      }
    }

    return res.status(200).json({ success: true, message: "Order closed successfully!" });
  } catch (error) {
    console.error("Error closing orders:", error);
    return res.status(500).json({ message: "Server error" });
  }
}


// Clear cancelled or completed orders
const cancelledAndDestroyOrder = async (req, res) => {
  const { status } = req.params; // should be "completed" or "cancelled"
  const userUUID = req.user?.id;
  if (!userUUID) {
    return res.status(401).json({ message: "Unauthorized!" });
  }
  if (!["completed", "cancelled"].includes(status)) {
    return res.status(400).json({
      message: "Invalid status. Use 'completed' or 'cancelled'.",
    });
  }

  try {
    // Build base where clause
    let whereClause = {
      orderStatus: status,
      is_visible_to_delivery: true,
      // created_by:userUUID,
      delivery_boy: userUUID
    };
    console.log(whereClause, "whereClause");
    // if (status === "completed") {
    //   whereClause.payment_status = "paid";
    // }

    // Check if any such orders exist
    const ordersToUpdate = await OrderReports.findAll({ where: whereClause });

    if (ordersToUpdate.length === 0) {
      return res.status(200).json({
        success: true,
        message: `No ${status} orders found or they have already been deleted.`,
      });
    }

    // Proceed with update
    const [updatedCount] = await OrderReports.update(
      { is_visible_to_delivery: false },
      { where: whereClause }
    );

    return res.status(200).json({
      success: true,
      message: `${updatedCount} ${status} orders created by you have been deleted successfully.`,
    });

  } catch (error) {
    console.error("Error updating cancelled orders:", error.message);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating cancelled orders.",
      error: error.message
    });
  }
};

module.exports = { getAll, deliveryAllOrders, orderDetailsGetById, upsert, closedOrder, cancelledAndDestroyOrder }