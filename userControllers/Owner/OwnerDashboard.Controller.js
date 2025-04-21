const { Op, literal } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const OrderReports = require("../../Models/ReportsModel/OrderReport.model");
const Organization = require("../../Models/Organization.model");
const OrderService = require("../../Models/ReportsModel/OrderServices.model");
const Services = require("../../Models/TblServices.model");
const { sequelize } = require("../../config/db");
const User = require("../../Models/ReportsModel/User.model");
const OrderServices = require("../../Models/ReportsModel/OrderServices.model");
const TblOrganization_Service = require("../../Models/tblOrganizationService");
const TblOrganizationType = require("../../Models/TblOrganizationType.model");
const Notification = require("../../Models/Notification.model");
const orderTransaction = require("../../Models/ReportsModel/OrderTransaction.model");
const Roles = require("../../Models/TblRoles.model");

const uploadToS3 = require("../../config/fileUpload.aws");
const UploadImages = require("../../Models/ReportsModel/UploadImages.model");

const moment = require("moment-timezone");
const axios  = require("axios");


// Fetch total payable bills, active orders, closed orders, received payments, and order list
const labOrders = async (req, res) => {

  try {
    // console.log(req.user);
    const { organization_id, id, role_id } = req.user;

    console.log(organization_id,"hhhhhhhhhhh")

    console.log(organization_id, "yyyyyyyyyyyyy")

    const user = await User.findOne({
      where: { id, role_id },
    });

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Fetch orders where delivery_boy and technician are NULL and orderStatus is "processing"
    const orders = await OrderReports.findAll({
      where: {
        toOrganization: organization_id,
        orderStatus: "processing",
        delivery_boy: { [Op.is]: null },
        technician: { [Op.is]: null },
      },
      include: [
        {
          model: Organization,
          as: "toOrg",
          attributes: ["name"],
        },
      ],
    });

    if (orders.length === 0) {
      return res.status(404).json({ message: "No orders found" });
    }

    // Fetch order counts in parallel
    const [activeOrders, closedOrders, totalOrders] = await Promise.all([
    // const [activeOrders, totalPayableBills, totalOrders, openOrders, closedOrders] = await Promise.all([

      OrderReports.count({ where: { orderStatus: "processing", toOrganization: organization_id } }),
      OrderReports.count({ where: { orderStatus: "completed", toOrganization: organization_id } }),
      OrderReports.count({ where: { orderStatus: { [Op.in]: ["completed", "cancelled", "processing"] }, toOrganization: organization_id } }),
      
      
    ]);

    // Sum received amounts
    const receivedAmounts =
      (await OrderReports.sum("paidAmount", {
        where: { orderStatus: { [Op.in]: ["completed", "cancelled", "processing"] }, toOrganization: organization_id },
      })) || 0;

    // Format the response
    const response = {
      activeOrders,
      
      totalOrders,
      
      closedOrders,
      totalReceivedAmount: receivedAmounts,
      orderList: orders.map((order) => ({
        ...order.toJSON(),
        fromOrganizationName: order.fromOrganization?.name || "Unknown",
      })),
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching order counts:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Fetch active, closed, and cancelled orders for the laboratory owner
const labAllOrders = async (req, res) => {
  try {
    const { organization_id, id: userId } = req.user;
    console.log(userId, "req.user")
    const { orderStatus } = req.params;

    if (!["completed", "processing", "cancelled"].includes(orderStatus)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    const allOrders = await OrderReports.findAll({
      where: { orderStatus, toOrganization: organization_id ,is_visible_to_owner:true},
      include: [{ model: Organization, as: "toOrg", attributes: ["name"] }],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      [orderStatus]: allOrders.map(order => ({
        ...order.toJSON(),
        fromOrganizationName: order.fromOrganization?.name || null,
      })),
    });

  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// (dashboard) Search orders by order ID or organization name or doctor name or servicename or orderdate(createdat)
const searchOrders = async (req, res) => {
  const { organization_id } = req.user;
  const { search } = req.query;

  try {
    const whereConditions = {
      toOrganization: organization_id,
      orderStatus: "processing",
      delivery_boy: { [Op.is]: null },
      technician: { [Op.is]: null },
      [Op.or]: [
        { orderId: { [Op.like]: `%${search}%` } },
        { "$toOrg.name$": { [Op.like]: `%${search}%` } },
        { "$toOrg.organization_service.servicess.servicename$": { [Op.like]: `%${search}%` } },
        { "$userDetails.firstName$": { [Op.like]: `%${search}%` } },
        { "$userDetails.lastName$": { [Op.like]: `%${search}%` } }
      ]
    };

    const isDate = moment(search, "YYYY-MM-DD", true).isValid();
    if (isDate) {
      whereConditions[Op.or].push({
        createdAt: {
          [Op.between]: [
            moment(search, "YYYY-MM-DD").startOf("day").toDate(),
            moment(search, "YYYY-MM-DD").endOf("day").toDate()
          ]
        }
      });
    }

    const orders = await OrderReports.findAll({
      where: whereConditions,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Organization,
          as: "toOrg",
          attributes: ["name"],
          include: [
            {
              model: TblOrganization_Service,
              as: "organization_service",
              attributes: ["service_id", "price"],
              include: [
                {
                  model: Services,
                  as: "servicess",
                  attributes: ["servicename"],
                },
              ],
            },
          ]
        },
        {
          model: User,
          as: "userDetails", // doctor name
          attributes: ["prefix","firstName", "lastName"]
        }
      ]
    });

    return res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error("Error during order search:", error);
    return res.status(500).json({ message: "An error occurred while searching for orders" });
  }
};

// Retrieve order or payment reports
// const labOrderAndPaymentReport = async (req, res) => {

//   const { organization_id } = req.user;
//   const { report } = req.params;
//   if (!["order", "payment"].includes(report)) return res.status(400).json({ message: "Invalid report type" });

//   try {
//     const reportData = await OrderReports.findAll({where:{toOrganization:organization_id,orderStatus:"completed"}});
//     if (!reportData.length) return res.status(404).json({ message: `No ${report} reports found.` });

//     return res.status(200).json({ message: `${report} reports retrieved successfully`, data: reportData });
//   } catch (error) {
//     console.error(`Error fetching ${report} reports:`, error);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// Retrieve order or payment report by ID
const labOrderAndPaymentReportGetById = async (req, res) => {
  const { organization_id } = req.user;
  if (!organization_id) {
    return res.status(401).json({ message: "Unauthorized" })
  }
  const { id, report } = req.params;
  if (!["order", "payment"].includes(report)) return res.status(400).json({ message: "Invalid report type" });

  try {
    // const attributes = report === "order" ? ["orderId", "orderDate", "fromOrganization", "toOrganization", "patientId", "patientName"] : ["orderId", "orderDate", "fromOrganization", "toOrganization", "patientId", "patientName", "totalAmount", "paidAmount", "paymentMethod", "remarks"];
    const reportData = await OrderReports.findOne({
      where: { id, toOrganization: organization_id },
      // attributes,
      include: [
        {
          model: User,
          as: 'userDetails',
          attributes: ['id', 'firstName', 'email', 'address', 'hospital_name'],
        },
        {
          model: OrderServices,
          as: 'orderServices',
          attributes: ["quantity"],
          include: [
            {
              model: TblOrganization_Service,
              as: "orgservice",
              attributes: ["id", "price"],
              include: [
                {
                  model: Services,
                  as: 'servicess',
                  attributes: ["servicename", 'servicedescription']
                },

              ],
            }
          ]
        },
        {
          model: orderTransaction,
          as: "transactions",
          attributes: ["transactionId", "amount", "createdAt"],
        },
        {
          model: UploadImages,
          as: "orderImages",
          attributes: ["id", "order_id", "images"],
        }
      ]
    });

    if (!reportData) return res.status(404).json({ message: `${report} report with ID ${id} not found.` });
    const toOrganizationDetails = await Organization.findByPk(reportData.toOrganization, {
      attributes: ["id", "name"],
      include: [
        {
          model: TblOrganizationType,
          as: 'organizationType',
          attributes: ["id", "organizationType"],
        }
      ]
    });

    const fromOrganizationDetails = await Organization.findByPk(reportData.fromOrganization, {
      attributes: ["id", "name"],
      include: [
        {
          model: TblOrganizationType,
          as: 'organizationType',
          attributes: ["id", "organizationType"],
        }
      ]
    });

    return res.status(200).json({ message: `${report} report retrieved successfully`, data: reportData, toOrganizationDetails, fromOrganizationDetails });
  } catch (error) {
    console.error(`Error fetching ${report} report with ID ${id}:`, error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

// here is the code for the search functionality for order and payment search by date , if u provide date it will work if not it will also work
const searchOrdersGetByDate = async (req, res) => {
  const { organization_id } = req.user;
  try {
    // Extract report, fromdate, and todate from request parameters
    const { report, fromdate, todate } = req.params;

    // Validate the report type
    if (!['order', 'payment'].includes(report)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report type. Use "order" or "payment".',
      });
    }

    // Initialize whereCondition with organization filter
    let whereCondition = {};
    whereCondition.toOrganization = organization_id;

    // Apply conditions based on report type
    if (report === 'order') {
      // In "order" screen: `orderStatus` is "completed", and `payment_status` can be "paid" or "unpaid"
      whereCondition.orderStatus = 'completed';
      whereCondition.payment_status = { [Op.in]: ['paid', 'unpaid'] };
    } else if (report === 'payment') {
      // In "payment" screen: `orderStatus` is "completed", and `payment_status` should be "paid" only
      whereCondition.orderStatus = 'completed';
      whereCondition.payment_status = 'paid';
    }

    // Apply date filtering if provided
    const dateFilter = {};
    if (fromdate && todate) {
      dateFilter.createdAt = {
        [Op.between]: [
          new Date(fromdate + 'T00:00:00.000Z'),
          new Date(todate + 'T23:59:59.999Z'),
        ],
      };
    } else if (fromdate) {
      dateFilter.createdAt = {
        [Op.gte]: new Date(fromdate + 'T00:00:00.000Z'),
      };
    } else if (todate) {
      dateFilter.createdAt = {
        [Op.lte]: new Date(todate + 'T23:59:59.999Z'),
      };
    }

    // Merge the dateFilter with the whereCondition if there are any date filters
    if (Object.keys(dateFilter).length > 0) {
      whereCondition = { ...whereCondition, ...dateFilter };
    }

    // Fetch the report data based on the whereCondition
    const reportData = await OrderReports.findAll({
      where: whereCondition,
      include: [
        {
          model: Organization,
          as: 'toOrg',
          attributes: ['id', 'name'],
        },
        {
          model: OrderServices,
          as: "orderServices",
          attributes: ["quantity", "price"],
          include: [
            {
              model: TblOrganization_Service,
              as: "orgservice",
              attributes: ["id"],
              required: false,
              include: [
                {
                  model: Services,
                  as: "servicess",
                  attributes: ["servicename"]
                }
              ]
            }
          ]
        },
        {
          model: orderTransaction,
          as: "transactions",
          attributes: ["transactionId", "amount", "createdAt"],
        },
        {
          model: UploadImages,
          as: "orderImages",
          attributes: ["id", "order_id", "images"],
        }
      ],
    });

    // Return the successful response with the report data
    return res.status(200).json({
      success: true,
      message: `${report.charAt(0).toUpperCase() + report.slice(1)} reports fetched successfully!`,
      data: reportData,
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching the reports.',
      error: error.message,
    });
  }
};

// order and payment search
const orderAndPaymentSearch = async (req, res) => {
  const { organization_id } = req.user;
  const { search } = req.params;

  try {
    const orderReports = await OrderReports.findAll({
      where: {
        orderStatus: "completed",
        toOrganization: organization_id,
        [Op.or]: [
          { orderId: { [Op.like]: `%${search}%` } },
          { toothName: { [Op.like]: `%${search}%` } },
          { shades: { [Op.like]: `%${search}%` } },
          { remarks: { [Op.like]: `%${search}%` } },
          { reasonForScan: { [Op.like]: `%${search}%` } },
          { mobileNo: { [Op.like]: `%${search}%` } },
          { patientName: { [Op.like]: `%${search}%` } },
          { patientProblem: { [Op.like]: `%${search}%` } },
          { paymentMethod: { [Op.like]: `%${search}%` } },
          literal(`toOrg.name LIKE '%${search}%'`)
        ],
      },
      include: [
        {
          model: Organization,
          as: "toOrg",
          attributes: ["id", "name"],
          required: false,
        },
      ],
    });

    return res.status(200).json({ orderReports });
  } catch (error) {
    console.error("Error during global search:", error.message);
    return res.status(500).json({
      message: "An error occurred while performing the search",
    });
  }
};

// while creating order search doctor
const searchDoctor = async (req, res) => {
  const { organization_id, id, role_id } = req.user;
  if (!organization_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const { search } = req.params;
  try {
    const results = await User.findAll({
      where: {
        prefix: "DR",
        [Op.or]: [{ firstName: { [Op.like]: `%${search}%` } }, { lastName: { [Op.like]: `%${search}%` } }]
      },
      include: [
        {
          model: Organization,
          as: 'organization',
          attributes: ['id', 'name'],
        }
      ]
    });
    console.log(results, "results")
    return res.status(200).json({ success: true, results });
  } catch (error) {
    console.error("Error searching for doctors:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// assigning service to the delivery boy or technician
const assignService = async (req, res) => {
  const { organization_id } = req.user;
  console.log(organization_id, "organization_id")
  if (!organization_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { orderId, technician, delivery_boy } = req.body;

  if (!orderId) {
    return res.status(400).json({ message: "Order ID is required" });
  }

  try {
    const order = await OrderReports.findOne({ where: { id: orderId, toOrganization: organization_id } });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const updateFields = {};
    let assignedUserId = null;
    if (technician) {
      updateFields.technician = technician;
      updateFields.assignment_status="assigned_to_technician";

      const technicianuser = await User.findOne({ where: { id: technician, organization_id: organization_id } });

      if (!technicianuser) {
        return res.status(404).json({ message: "Technician not found" });
      }
      assignedUserId = technician
    }
    if (delivery_boy) {
      updateFields.delivery_boy = delivery_boy;
      updateFields.assignment_status="assigned_to_delivery_boy"

      const deliveryboyuser = await User.findOne({ where: { id: delivery_boy, organization_id: organization_id } });
      if (!deliveryboyuser) {
        return res.status(404).json({ message: "Delivery Boy not found" });
      }
      assignedUserId=delivery_boy
    }

    if (Object.keys(updateFields).length > 0) {
      await OrderReports.update(updateFields, { where: { id: orderId } });
    }
    if (assignedUserId) {

      const assignedUser=await User.findByPk(assignedUserId)
      await Notification.create({
        uid: assignedUserId,
        datetime: new Date(),
        title: "Order Assigned",
        description: `You have been assigned to order ID ${order.orderId}`,

      })

      //send push notfication
      if(assignedUser?.one_subscription){
        const res=await axios.post("https://onesignal.com/api/v1/notifications",{
          app_id:process.env.ONESIGNAL_APP_ID,
          include_player_ids: [assignedUser.one_subscription],
            headings: { en: "Order Assigned" },
            contents: {
              en: `You have been assigned to order ID ${order.orderId}.`,
            },
        },
      {
        headers:{
          "Content-Type": "application/json",
          Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
        }
      })
      
      }
    }
    return res.status(200).json({ message: "Service assigned successfully" });
  } catch (error) {
    console.error("Error assigning service:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// adding or updating doctor
const upsertDoctor = async (req, res) => {
  const { organization_id } = req.user;

  if (!organization_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const {
    id,
    prefix,
    firstName,
    lastName,
    email,
    mobileNo,
    hospital_name,
    address,
    googleMapLink
  } = req.body;

  try {
    if (id) {
      const doctor = await User.findOne({ where: { id, organization_id } });

      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }
      const updatedDoctor = await doctor.update({
        prefix,
        firstName,
        lastName,
        email,
        mobileNo,
        hospital_name,
        address,
        googleMapLink
      });

      return res.status(200).json({ message: "Doctor updated successfully", doctor: updatedDoctor });
    }

    const existingDoctor = await User.findOne({ where: { email } });
    const existingDoctorByMobile = await User.findOne({ where: { mobileNo } });
    if (existingDoctorByMobile) {
      return res.status(400).json({ message: "Mobile number already exists" });
    }

    if (existingDoctor) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const newDoctor = await User.create({
      prefix,
      firstName,
      lastName,
      email,
      mobileNo,
      hospital_name,
      address,
      googleMapLink,
      role_id: "b83bfdf1-7a7e-4284-8da9-9e332a18f889"
    });

    return res.status(201).json({ message: "Doctor created successfully", doctor: newDoctor });
  } catch (error) {
    console.error("Error during upsert:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

//get all hospital name (organization name ) where organization type is dentist
const getAllHospitalName = async (req, res) => {

  try {
    const organizations = await Organization.findAll({
      include: {
        model: TblOrganizationType,
        as: "organizationType",
        where: {
          organizationType: 'dentist',
        },
        attributes: ['id', 'organizationType', 'description'],
        required: true,
      },
      attributes: ['id', 'name'],
    });
    return res.status(200).json({ message: "Hospital name fetched successfully", hospitalName: organizations });
  } catch (error) {
    console.error("Error fetching hospital names:", error);
    return res.status(500).json({ message: "Internal Server Error" });

  }
}
// for clear notifications 
const clearAllNotifications = async (req, res) => {
  const { organization_id } = req.user;
  try {
    const notifications = await Notification.destroy({
      where: { toOrganization: organization_id },
    })
    return res.status(200).json({ success: true, notifications })
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
}

// If I pass only the userUUID, it means the request is coming from the owner. If I pass both the userUUID and delivery_boy, it means the request is coming from the delivery boy. If I do not pass the delivery_boy and userUUID, it means the request is coming from the dentist.
const ownerUpsertOrder = async (req, res) => {
  const transaction = await sequelize.transaction({ autocommit: false });
  const { organization_id, } = req.user;
  console.log(req.user.id, "req.user")
  if (!organization_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const {
      id,
      fromOrganization,
      patientName,
      patientId,
      orderDate,
      transactionId,
      delivery_boy,
      userUUID,   //doctor id
      toOrganization,
      serviceId = [],
      requiredDate,
      toothName,
      shades,
      remarks,
      reasonForScan,
      sub_total = 0,
      tax = 0,
      service_charges = 0,
      paid_amount = 0,
      total_amount = 0,
      payment_method,
      order_status,
      address,
      created_by,
    } = req.body;

    // Function to generate a unique ID
    const generateUniqueId = async (prefix, model, field) => {
      let uniqueId;
      let exists;
      do {
        uniqueId = `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;
        exists = await model.findOne({ where: { [field]: uniqueId } });
      } while (exists);
      return uniqueId;
    };

    let orderReport;

    if (id) {
      // Update existing order
      orderReport = await OrderReports.findOne({
        where: { id: id, toOrganization: organization_id, orderStatus: "processing" },
      }, { transaction });

      if (!orderReport) {
        return res.status(404).json({ success: false, message: "Order not found." });
      }


      if (cancel) {
        console.log(`Cancelling order ${id}`);
        await orderReport.update(
          { orderStatus: "cancelled" },
          { transaction }
        );
      } else {

        await orderReport.update(
          {
            fromOrganization,
            patientName,
            orderId: orderReport.orderId,
            patientId: patientId || orderReport.patientId,
            toOrganization: organization_id,
            requiredDate,
            toothName,
            orderDate: orderReport.orderDate,
            shades,
            remarks,
            reasonForScan,
            userUUID: userUUID || orderReport.userUUID,
            subTotal: sub_total,
            tax,
            serviceCharges: service_charges,
            paidAmount: paid_amount,
            totalAmount: total_amount,
            paymentMethod: payment_method,
            orderStatus: order_status,
            address
          },
          { transaction }
        );
      }
    } else {
      // Create new order
      const orderIdValue = await generateUniqueId("ORD", OrderReports, "orderId");

      console.log("Creating a new order");
      orderReport = await OrderReports.create(
        {
          fromOrganization,
          patientName,
          orderId: orderIdValue,
          patientId,
          toOrganization: organization_id,
          orderDate,
          requiredDate,
          toothName,
          delivery_boy,
          shades,
          remarks,
          reasonForScan,
          userUUID: userUUID,
          subTotal: sub_total,
          tax,
          serviceCharges: service_charges,
          paidAmount: paid_amount,
          totalAmount: total_amount,
          paymentMethod: payment_method,
          orderStatus: "processing",
          address,
          payment_status: "unpaid",
          created_by: req.user.id ,
        },
        { transaction }
      );
    }

    //send notification
    const ownersFromOrganization = await User.findAll({
      where: {
        organization_id: toOrganization,
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
    })
    // console.log(ownersFromOrganization, "ownersFromOrganization");
    if (ownersFromOrganization.length > 0) {
      const notifications = ownersFromOrganization.map((owner) => {
        return {
          organization_id: toOrganization,
          uid: owner.id,
          datetime: new Date(),
          title: "New Order Received",
          description: `New Order ${orderReport.orderId} has been received to your organization.`,

        }
      })
      await Notification.bulkCreate(notifications, { transaction })

      //// 🔹 Send push notification (OneSignal)
      const pushNotifications = ownersFromOrganization.filter((owner) => owner.one_subscription).map((owner) => {
        return axios.post("https://onesignal.com/api/v1/notifications", {
          app_id: process.env.ONESIGNAL_APP_ID,
          include_player_ids: [owner.one_subscription],
          headings: { en: "New Order Received" },
          contents: { en: `New Order ${orderReport.orderId} has been received to your organization.` },
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
        console.warn("⚠️ One or more push notifications failed:", pushError.message);
      }
    }

    if (transactionId) {
      console.log("Processing transaction...");

      // Insert into orderTransaction table
      await orderTransaction.create(
        {
          orderId: orderReport.id,
          userUUID: userUUID,
          transactionId,
          amount: total_amount,
        },
        { transaction }
      );

      // Update order status to 'paid' IF THEY PAID FULL AMOUNT
      await orderReport.update(
        { payment_status: "paid" },
        { transaction }
      );

      // notification send



    }

    // Update User Address
    // if (address) {
    //   console.log(`Updating address for user ${userUUID || userId}`);
    //   const user = await User.findOne({ where: { id: userUUID || userId }, transaction });

    //   if (user) {
    //     await user.update({ address }, { transaction });
    //     console.log(`Address updated for user ${userUUID}`);
    //   } else {
    //     console.log(`User with ID ${userId || userUUID} not found`);
    //   }
    // }

    // Handle Services
    if (serviceId.length > 0) {
      console.log(`Handling services for order ${orderReport.id}`);

      await OrderServices.destroy({ where: { orderId: orderReport.id }, transaction });

      await Promise.all(
        serviceId.map(async (item) => {
          const service = await TblOrganization_Service.findOne({ where: { id: item.id }, transaction });

          if (!service) {
            return res.status(404).json({
              message: "Organization service not found",
              status: false
            });
          }
          await OrderServices.create(
            {
              orderId: orderReport.id,
              orgserviceId: item.id,
              quantity: item.quantity,
              price: item.quantity * service.price,
            },
            { transaction }
          );
        })
      );
    }

    await transaction.commit();

    return res.status(id ? 200 : 201).json({
      success: true,
      message: id ? "Order updated successfully." : "Order created successfully.",
      data: orderReport,
    });
  } catch (error) {
    // Check if the transaction is not committed yet before rolling back
    if (transaction.finished !== 'commit') {
      await transaction.rollback();
    }

    console.error("Error processing Order:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const cancelledOrders = async (req, res) => {
  const { organization_id } = req.user;
  console.log(organization_id, "organization_id")
  if (!organization_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const { cancel } = req.params;
  const {id}=req.body
  try {
    if (cancel) {
      const orderReport = await OrderReports.findByPk(id);
      if (!orderReport) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }
      await orderReport.update(
        { orderStatus: "cancelled" },
      );
      return res.status(200).json({
        success: true,
        message: "Order cancelled successfully",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid request",
      });
    }
  } catch (error) {
    console.error("Error cancelling order:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// get all technician 
const getAllTechnician = async (req, res) => {
  const { organization_id } = req.user;
  if (!organization_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const technicianRole = await Roles.findOne({
      where: {
        rolename: 'Technician' || 'technician',
      },
    });

    if (!technicianRole) {
      return res.status(404).json({ message: "Technician role not found" });
    }

    const technician = await User.findAll({
      where: {
        organization_id: organization_id,
        role_id: technicianRole.id,
      },
    });

    if (!technician.length === 0) {
      return res.status(404).json({ message: "No technicians found for this organization" });
    }

    return res.status(200).json({
      success: true,
      count: technician.length,
      technicians: technician,
    });

  } catch (error) {
    console.error("Error fetching technicians:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// get all  delivery_boy
const getAllDeliveryBoy = async (req, res) => {
  const { organization_id } = req.user;
  if (!organization_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const DeliveryBoyRole = await Roles.findOne({
      where: {
        rolename: {
          [Op.like]: 'delivery boy',
        }
      }
    });


    if (!DeliveryBoyRole) {
      return res.status(404).json({ message: "DeliveryBoy role not found" });
    }

    const deliveryBoy = await User.findAll({
      where: {
        organization_id: organization_id,
        role_id: DeliveryBoyRole.id
      },
    });

    if (!deliveryBoy.length === 0) {
      return res.status(404).json({ message: "No Delivery Boy found for this organization" });
    }

    return res.status(200).json({
      success: true,
      count: deliveryBoy.length,
      DeliveryBoy: deliveryBoy,
    });

  } catch (error) {
    console.error("Error fetching Delivery Boy:", error);
    return res.status(500).json({ message: "Server error" });
  }
};





const cancelledAndDestroyOrder = async (req, res) => {
  const { status } = req.params; // Expected: 'completed' or 'cancelled'
  const { organization_id, id } = req.user;

  console.log(req.user); // You can remove this in production
  console.log(id, "User ID");

  // Check for valid organization
  if (!organization_id) {
    return res.status(401).json({ message: "Unauthorized: No organization_id found." });
  }

  // Validate status
  if (!["completed", "cancelled"].includes(status)) {
    return res.status(400).json({
      message: "Invalid status. Use 'completed' or 'cancelled'.",
    });
  }

  try {
    // Build dynamic where clause
    const whereClause = {
      orderStatus: status,
      toOrganization: organization_id,
      created_by: id,
      is_visible_to_owner: true, 
    };

    if (status === "completed") {
      whereClause.payment_status = "paid";
    }

    // Find orders that match and haven't been soft-deleted yet
    const ordersToUpdate = await OrderReports.findAll({ where: whereClause });

    if (ordersToUpdate.length === 0) {
      return res.status(200).json({
        success: true,
        message: `No ${status} orders found or they have already been deleted.`,
      });
    }

    // Perform soft delete
    const [updatedCount] = await OrderReports.update(
      { is_visible_to_owner: false },
      { where: whereClause }
    );

    return res.status(200).json({
      success: true,
      message: `${updatedCount} ${status} orders created by you have been deleted successfully.`,
    });
  } catch (error) {
    console.error("Error deleting orders:", error.message);
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting orders.",
    });
  }
};


const raiseInvoiceAndCloseOrder = async (req, res) => {
  const { organization_id } = req.user;
  const { id } = req.params;

  if (!organization_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const checkOrder = await OrderReports.findOne({
      where: {
        id: id,
        toOrganization: organization_id,
      },
    });

    if (!checkOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (checkOrder.orderStatus === "completed" && checkOrder.payment_status === "unpaid") {
      await checkOrder.update({
        orderStatus: "completed",
        payment_status: "processing",
      });

      return res.status(200).json({
        success: true,
        message: "Invoice process started successfully.",
        data: checkOrder,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Order is not eligible for invoice generation.",
      });
    }
  } catch (error) {
    console.error("Error in raiseInvoiceAndCloseOrder:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const editInvoice = async (req, res) => {
  const { organization_id } = req.user;
  const { id } = req.params;
  if (!organization_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const { totalAmount, remarks } = req.body;
  try {
    const order = await OrderReports.findOne({
      where: { id, toOrganization: organization_id, payment_status: { [Op.ne]: "paid" }, },
    });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    await order.update({ totalAmount, remarks });
    return res.status(200).json({ message: "Invoice updated successfully", order });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

const uploadImagesByOwner = async (req, res) => {
  console.log("Reached uploadImagesByOwner API");
  console.log("User:", req.user);
  console.log("Query:", req.query);
  console.log("Files:", req.files);

  const { organization_id, id: userId, role_id } = req.user;
  const { orderId } = req.query;

  if (!orderId) {
    return res.status(400).json({ message: "Order ID is required" });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "At least one image is required!" });
  }

  try {
    const order = await OrderReports.findOne({
      where: {
        toOrganization: organization_id,
        id: orderId,
        orderStatus: { [Op.or]: ["processing", "completed"] },
        delivery_boy: { [Op.is]: null },
        technician: { [Op.is]: null },
      },
      include: [
        {
          model: Organization,
          as: "toOrg",
          attributes: ["name"],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found or you don't have permission to upload images for it!",
      });
    }

    // Upload images to S3
    const imageUploadPromises = req.files.map(async (file) => {
      try {
        const url = await uploadToS3(file, "labImages");
        if (!url) {
          throw new Error(`Failed to upload ${file.originalname} to S3`);
        }
        return url;
      } catch (error) {
        console.error(`Error uploading ${file.originalname}:`, error.message);
        return null; // Handle individual failures gracefully
      }
    });

    const imageUrls = await Promise.all(imageUploadPromises);
    console.log("Uploaded Image URLs:", imageUrls);

    // Check if any uploads succeeded
    const validUrls = imageUrls.filter((url) => url !== null);
    if (validUrls.length === 0) {
      return res.status(500).json({
        message: "Failed to upload any images to S3",
      });
    }

    // Store in database
    const uploadRecord = await UploadImages.create({
      id: uuidv4(),
      uid: userId,
      order_id: orderId,
      images: JSON.stringify(validUrls), // Only store valid URLs
    });

    return res.status(200).json({
      message: "Images uploaded successfully!",
      data: {
        orderId: orderId,
        imageUrls: validUrls,
        uploadRecordId: uploadRecord.id,
      },
    });
  } catch (error) {
    console.error("Error in uploadImagesByOwner:", error.message);
    return res.status(500).json({
      message: "Internal server error: " + error.message,
    });
  }
};

// Fetching orders based on order status for the owner( cancelled, completed, active(processing and completed))
const getRadiologyOwnerOrdersByStatus = async (req, res) => {
  try {
    const { organization_id } = req.user;
    const { orderStatus } = req.params;
    console.log(req.user, "organization_id")
    let whereClause = {
      toOrganization: organization_id,
      is_visible_to_owner: true,
    };

    // Active Orders
    if (orderStatus === "active") {
      whereClause = {
        ...whereClause,
        [Op.or]: [
          { orderStatus: "processing" },
          { orderStatus: "completed", payment_status: "unpaid" },
        ],
      };
    }

    // Completed Orders
    else if (orderStatus === "completed") {
      whereClause = {
        ...whereClause,
        orderStatus: "completed",
        payment_status: "paid",
      };
    }

    // Cancelled Orders
    else if (orderStatus === "cancelled") {
      whereClause = {
        ...whereClause,
        orderStatus: "cancelled",
      };
    } 
    
    else {
      return res.status(400).json({ message: "Invalid order status" });
    }

    const allOrders = await OrderReports.findAll({
      where: whereClause,
      include: [
        { model: Organization, as: "toOrg", attributes: ["name"] },

      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      [orderStatus]: allOrders.map(order => ({
        ...order.toJSON(),
        fromOrganizationName: order.fromOrganization?.name || null,
      })),
    });

  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const payNow = async (req, res) => {
  const { organization_id, id: userId } = req.user; // Extract 'id' as 'userId' from req.user
  console.log(req.user, "req.user");

  if (!organization_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { orderId, transactionId, amount } = req.body;

  try {
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Create the transaction with userId
    const [transaction,orderReport] = await Promise.all([
      orderTransaction.create({orderId,userUUID:userId,transactionId,amount}),
      OrderReports.findByPk(orderId)
    ])

    if (!orderReport) {
      return res.status(404).json({ message: "Order not found" });
    }

    await orderReport.update({ payment_status: "paid" });

    // Send push notification if user has OneSignal ID
    (async () => {
      const sendUser = await User.findByPk(userId);
      const pushPromise = sendUser?.one_subscription
        ? axios.post(
            "https://onesignal.com/api/v1/notifications",
            {
              app_id: process.env.ONESIGNAL_APP_ID,
              include_player_ids: [sendUser.one_subscription],
              headings: { en: "Payment Confirmation" },
              contents: {
                en: `Order ₹${amount} for bill ${orderReport.orderId} has been successfully processed.`,
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
        uid: userId,
        datetime: new Date(),
        title: "Payment Confirmation",
        description: `Order ₹${amount} for bill ${orderReport.orderId} has been successfully processed.`,
      });

      await Promise.allSettled([pushPromise, notifPromise]); // No need to wait in main flow
    })();

    return res.status(200).json({ message: "Payment is successful", transaction });

  } catch (error) {
    console.error("Error processing payment:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};




module.exports = {
  labOrders,
  labAllOrders,
  labOrderAndPaymentReportGetById,
  searchOrders,
  searchDoctor,
  searchOrdersGetByDate,
  orderAndPaymentSearch,
  assignService,
  upsertDoctor,
  clearAllNotifications,
  getAllHospitalName,
  ownerUpsertOrder,
  getAllTechnician,
  uploadImagesByOwner,
  getAllDeliveryBoy,
  cancelledAndDestroyOrder,
  raiseInvoiceAndCloseOrder,
  editInvoice,

  cancelledOrders,
  getRadiologyOwnerOrdersByStatus,
  cancelledOrders,
  payNow

};


