const { Op, where, literal } = require("sequelize");
const Organization = require("../../Models/Organization.model");
const OrderReports = require("../../Models/ReportsModel/OrderReport.model");
const Services = require("../../Models/TblServices.model");
const TblOrganization_Service = require("../../Models/tblOrganizationService");
const OrderServices = require("../../Models/ReportsModel/OrderServices.model");
const User = require("../../Models/ReportsModel/User.model");
const { sequelize } = require("../../config/db");
const moment = require("moment");
const TblOrganizationType = require("../../Models/TblOrganizationType.model");
const orderTransaction = require("../../Models/ReportsModel/OrderTransaction.model");

// If I pass only the userUUID, it means the request is coming from the owner. If I pass both the userUUID and delivery_boy, it means the request is coming from the delivery boy. If I do not pass the delivery_boy and userUUID, it means the request is coming from the dentist.
const fromDentist = async (req, res) => {
  const transaction = await sequelize.transaction({ autocommit: false });
  const userId = req.user.id;

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
    } = req.body;

    const { cancel } = req.params;

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
      orderReport = await OrderReports.findByPk(id, { transaction });

      if (!orderReport) {
        return res.status(404).json({ success: false, message: "Order not found." });
      }

      console.log(`Updating order ${id}`);

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
            toOrganization,
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
          toOrganization,
          orderDate: new Date(),
          requiredDate,
          toothName,
          delivery_boy,
          shades,
          remarks,
          reasonForScan,
          userUUID: userUUID || userId,
          subTotal: sub_total,
          tax,
          serviceCharges: service_charges,
          paidAmount: paid_amount,
          totalAmount: total_amount,
          paymentMethod: payment_method,
          orderStatus: "processing",
          address,
          payment_status: "unpaid"
        },
        { transaction }
      );
    }

    if (transactionId) {
      console.log("Processing transaction...");

      // Insert into orderTransaction table
      await orderTransaction.create(
        {
          orderId: orderReport.id,
          userUUID: userUUID || userId,
          transactionId,
          amount: total_amount, // Assuming total_amount is the amount paid
        },
        { transaction }
      );

      // Update order status to 'paid'
      await orderReport.update(
        { payment_status: "paid" },
        { transaction }
      );
    }

    // Update User Address
    if (address) {
      console.log(`Updating address for user ${userUUID || userId}`);
      const user = await User.findOne({ where: { id: userUUID || userId }, transaction });

      if (user) {
        await user.update({ address }, { transaction });
        console.log(`Address updated for user ${userUUID}`);
      } else {
        console.log(`User with ID ${userId || userUUID} not found`);
      }
    }

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

    return res.status(200).json({
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


// order report search by date and where orders are completed  . it is working for 2 apis
const orderReport = async (req, res) => {

  const uid = req.user?.id;
  if (!uid) {
    return res.status(401).json({ message: "Unauthorized!" });
  }
  try {
    const { fromdate, todate } = req.params;

    let whereCondition = {
      orderStatus: {
        [Op.eq]: "completed",
      },
      userUUID: uid
    };

    if (fromdate && todate) {
      whereCondition.createdAt = {
        [Op.between]: [
          new Date(fromdate + 'T00:00:00.000Z'),
          new Date(todate + 'T23:59:59.999Z'),
        ],
      };
    } else if (fromdate) {
      whereCondition.createdAt = {
        [Op.gte]: new Date(fromdate + 'T00:00:00.000Z'),
      };
    } else if (todate) {
      whereCondition.createdAt = {
        [Op.lte]: new Date(todate + 'T23:59:59.999Z'),
      };
    }

    const allOrder = await OrderReports.findAll({
      where: whereCondition,
      include: [
        {
          model: Organization,
          as: "toOrg", 
          attributes: ["id", "name"],
          required: false, 
        },
        {
          model: OrderServices,  
          as: "orderServices",   
          attributes: [ "quantity", "price"],  
          include: [
            {
              model: TblOrganization_Service,    
              as: "orgservice",     
              attributes: ["id"],  
              required: false, 
              include:[
                {
                  model:Services,
                  as:"servicess",
                  attributes:["servicename"]
                }
              ]   
            }
          ]
        }
      ]
    });
    

    return res.status(200).json({
      success: true,
      message: "Order reports fetched successfully.",
      data: allOrder,
    });
  } catch (error) {
    console.error("Error fetching order reports:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

//order details get by id
const orderDetailsgetById = async (req, res) => {
  const uid=req.user?.id;
  if(!uid){
    return res.status(401).json({message: "Unauthorized!" })
  }
  const { id } = req.params;
  try {
    const orderReport = await OrderReports.findByPk(id, {
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
              as: 'orgservice',
              attributes: ['id', 'price'],
              include: [
                {
                  model: Services,
                  as: 'servicess',
                  attributes: ['servicename'],
                }
              ]
            },
          ],
        }
      ],
    });



    if (!orderReport) {
      return res.status(404).json({
        success: false,
        message: "Order Report not found!",
      });
    }

    const toOrganizationDetails = await Organization.findByPk(orderReport.toOrganization, {
      attributes: ["id", "name"],
      include: [
        {
          model: TblOrganizationType,
          as: 'organizationType',
          attributes: ["id", "organizationType"],
        }
      ]
    });



    return res.status(200).json({
      success: true,
      message: "Order Report found successfully!",
      data: {
        ...orderReport.toJSON(),
        toOrganizationDetails


      },
    });
  } catch (error) {
    console.error("Error fetching order report:", error);
    res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};
// payment report search by date and where orders are completed  .
const PaymentReports = async (req, res) => {
  const uid=req.user?.id;
  if (!uid) {
    return res.status(401).json({ message: "Unauthorized!" });
  }
  try {
    const { fromDate, toDate } = req.query;
    let whereCondition = {
      orderStatus: { [Op.eq]: "completed" },
      payment_status:{[Op.eq]:"paid"},
      userUUID:uid,
    }
    if (fromDate && toDate) {
      whereCondition.createdAt = { [Op.between]: [new Date(fromDate), new Date(toDate)] }
    }
    else if (fromDate) {
      whereCondition.createdAt = { [Op.gte]: new Date(fromDate) }
    }
    else if (toDate) {
      whereCondition.createdAt = { [Op.gte]: new Date(fromDate) }
    }
    else if (toDate) {
      whereCondition.createdAt = { [Op.lte]: new Date(toDate), };
    }
    const allOrders = await OrderReports.findAll({
       where: whereCondition,
       include: [
        {
          model: Organization,
          as: "toOrg", 
          attributes: ["id", "name"],
          required: false, 
        },
        {
          model: OrderServices,  
          as: "orderServices",   
          attributes: [ "quantity", "price"],  
          include: [
            {
              model: TblOrganization_Service,    
              as: "orgservice",     
              attributes: ["id"],  
              required: false, 
              include:[
                {
                  model:Services,
                  as:"servicess",
                  attributes:["servicename"]
                }
              ]   
            }
          ]
        }
      ]
      })
    return res.status(200).json({
      success: true,
      message: "Payment Reports Fetched Successfully!",
      data: allOrders
    })
  } catch (error) {
    console.error("Error fetching payment reports:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
}

// payment details get by id
const paymenDetailsGetById = async (req, res) => {
  const uid=req.user?.id;
  if(!uid){
    return res.status(401).json({ message: "Unauthorized!" });
  }
  const { id } = req.params;
  try {
    // Fetch order details
    const orderDetails = await OrderReports.findByPk(id, {
      include: [
        {
          model: User,
          as: 'userDetails',
          attributes: ['id', 'firstName']
        },
      ]
    })
    if (!orderDetails) {
      return res.status(404).json({
        success: false,
        message: "Order Details are not found!"
      })
    }

    const billDetails = await OrderReports.findByPk(id)
    if (!billDetails) {
      return res.status(404).json({ message: "Bill Details are not found!" })
    }

    const serviceDetails = await TblOrganization_Service.findOne({
      where: { organization_id: orderDetails.toOrganization },
      include: [
        {
          model: Services,
          as: 'servicess',
          attributes: [ "servicename", 'servicedescription']
        }
      ]
    })

    let toOrganizationName = null;
    if (orderDetails.toOrganization) {
      const toOrganization = await Organization.findByPk(orderDetails.toOrganization, {
        attributes: ['id', 'name']
      });
      if (toOrganization) {
        toOrganizationName = toOrganization.name;
      }
    }

    return res.status(200).json({
      success: true,
      message: "Payment Details Fetched Successfully",
      data: {
        orderDetails: {
          ...orderDetails.toJSON(),
          toOrganizationName
        },
        billDetails,
        serviceDetails
      }
    })
  } catch (error) {
    console.error("Error Occurs While Fetching Payment Reports: ", error)
    res.status(500).json({ message: "Internal Server Error", error: error.message })
  }
}

// order search
const orderAndPaymentSearch = async (req, res) => {
  const uid=req.user?.id;
  if(!uid){
    return res.status(401).json({ message: "Unauthorized!" });
  }
  const { search } = req.params;

  try {
    const orderReports = await OrderReports.findAll({
      where: {
        orderStatus: "completed",
        userUUID:uid,
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

// get organization details get by id
const getorganizationDetailsById = async (req, res) => {
  const uid=req.user?.id;
  if(!uid){
    return res.status(401).json({ message: "Unauthorized!" });
  }
  const id = req.params.id;

  try {
    const orgDetails = await Organization.findByPk(id);
    if (!orgDetails) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const orgServiceDetails = await TblOrganization_Service.findAll({
      where: { organization_id: id },
      attributes: ["id", "price",],
      include: [
        {
          model: Services,
          as: "servicess",
          attributes: ["servicename"],
        },
      ],
    });


    return res.status(200).json({
      organization: orgDetails,
      services: orgServiceDetails
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const cancelledAndDestroyOrder = async (req, res) => {

  const { status } = req.params;

  const userUUID = req.user?.id;


  try {
    const cancelledOrders = await OrderReports.findAll({
      where: {
        orderStatus: status,
        userUUID
      },
    });
    if (cancelledOrders.length === 0) {
      return res.status(404).json({ message: "No cancelled orders found to delete." });
    }
    const deletedCount = await OrderReports.destroy({
      where: {
        orderStatus: status,
        userUUID
      },
    });

    return res.status(200).json({
      success: true,
      message: `${deletedCount}  ${status} orders have been deleted successfully.`,
    });
  } catch (error) {
    console.error("Error deleting cancelled orders:", error.message);
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting cancelled orders.",
    });
  }
};

const payNow = async (req, res) => {
  const uid = req.user?.id;
  console.log(uid)
  
  if (!uid) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { orderId, transactionId, amount } = req.body;

  try {
    const transaction = await orderTransaction.create({
      orderId,
      userUUID: uid,
      transactionId,
      amount
    });

    const orderReport = await OrderReports.findByPk(orderId);

    if (!orderReport) {
      return res.status(404).json({ message: "Order not found" });
    }

    await orderReport.update(
      { 
        payment_status: "paid"
      }
    );

    return res.status(200).json({ message: "Payment is successful",transaction:transaction });
    
  } catch (error) {
    console.error("Error processing payment:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

module.exports = { fromDentist, orderDetailsgetById, orderReport, PaymentReports, paymenDetailsGetById, orderAndPaymentSearch, getorganizationDetailsById, cancelledAndDestroyOrder,payNow };
