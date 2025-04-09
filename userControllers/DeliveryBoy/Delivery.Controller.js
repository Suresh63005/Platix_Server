const { Op } = require("sequelize");
const Organization = require("../../Models/Organization.model");
const OrderReports = require("../../Models/ReportsModel/OrderReport.model");
const User = require("../../Models/ReportsModel/User.model");
const OrderServices = require("../../Models/ReportsModel/OrderServices.model");
const TblOrganization_Service = require("../../Models/tblOrganizationService");
const Services = require("../../Models/TblServices.model");
const TblOrganizationType = require("../../Models/TblOrganizationType.model");

// getall dashboard data
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
      OrderReports.count({ where: { orderStatus: "completed",payment_status:"paid", delivery_boy: uid } })
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
          }
        ]
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
        [Op.or]: [
          { delivery_boy: uid }, 
        ]
      },
      include: [
        { model: Organization, as: 'fromOrg', attributes: ['name'] } 
      ]
    });

    return res.status(200).json({
      [orderStatus]: allOrders.map(order => ({
        ...order.toJSON(),
        fromOrganizationName: order.fromOrg?.name || "N/A"  
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
  const { id } = req.params; 
  if (!uid) {
    return res.status(401).json({ success: false, message: "Unauthorized. Please log in." });
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
          attributes: ['id', 'firstName', 'email', 'address', 'hospital_name']
        }
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
          attributes: ['id', 'service_id'],
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
      include:[
        {
          model:TblOrganizationType,
          as:'organizationType',
          attributes:['id','organizationType']
        }
      ]
    });

    return res.status(200).json({
      success: true,
      message: "Order report found successfully!",
      data: {
        ...orderReport.toJSON(),
        orderServices,
        toOrganizationDetails
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
        orderId:orderIdValue
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
    console.log(order)

    if (order.orderStatus === "completed") {
      return res.status(400).json({ message: "Order already closed" });
    }

    await OrderReports.update(
      { 
        orderStatus: "completed", 
        payment_status: "paid" 
      },
      { where: { id } }
    );

    return res.status(200).json({ success: true, message: "Order closed successfully!" });
  } catch (error) {
    console.error("Error closing orders:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports={ getAll ,deliveryAllOrders,orderDetailsGetById,upsert,closedOrder}