const { Op, where } = require("sequelize");
const Organization = require("../../Models/Organization.model");
const OrderReports = require("../../Models/ReportsModel/OrderReport.model");
const Services = require("../../Models/TblServices.model");
const TblOrganization_Service = require("../../Models/tblOrganizationService");
const OrderServices = require("../../Models/ReportsModel/OrderServices.model");
const User = require("../../Models/ReportsModel/User.model");
const { sequelize } = require("../../config/db");

const fromDentist = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      id, // Optional: If provided, update the existing order
      fromOrganization,
      patientName,
      orderId,
      patientId,
      toOrganization,
      serviceId,
      requiredDate,
      toothName,
      shades,
      remarks,
      reasonForScan,
      userUUID,
      sub_total, // Fix: Change to subTotal
      tax,
      service_charges, // Fix: Change to serviceCharges
      paid_amount, // Fix: Change to paidAmount
      total_amount, // Fix: Change to totalAmount
      payment_method, // Fix: Change to paymentMethod
      order_status, // Fix: Change to orderStatus
    } = req.body;

    const { cancel } = req.params;

    // Helper function to generate unique IDs
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
      // Update existing order if ID is provided
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
        // Update the order while preserving orderId and patientId
        await orderReport.update(
          {
            fromOrganization,
            patientName,
            orderId: orderReport.orderId, // Preserve existing orderId
            patientId: orderReport.patientId, // Preserve existing patientId
            toOrganization,
            requiredDate,
            toothName,
            shades,
            remarks,
            reasonForScan,
            userUUID,
            subTotal: sub_total,
            tax,
            serviceCharges: service_charges,
            paidAmount: paid_amount,
            totalAmount: total_amount,
            paymentMethod: payment_method,
            orderStatus: order_status,
          },
          { transaction }
        );
      }
    } else {
      // Create a new order if ID is not provided
      const orderIdValue = await generateUniqueId("#", OrderReports, "orderId");
      const patientIdValue = await generateUniqueId("#", OrderReports, "patientId");

      console.log("Creating a new order");
      orderReport = await OrderReports.create(
        {
          fromOrganization,
          patientName,
          orderId: orderIdValue,
          patientId: patientIdValue,
          toOrganization,
          orderDate: new Date(),
          requiredDate,
          toothName,
          shades,
          remarks,
          reasonForScan,
          userUUID,
          subTotal: sub_total,
          tax,
          serviceCharges: service_charges,
          paidAmount: paid_amount,
          totalAmount: total_amount,
          paymentMethod: payment_method,
          orderStatus: order_status,
        },
        { transaction }
      );
    }

    // Handle services if provided
    if (serviceId && serviceId.length > 0) {
      console.log(`Handling services for order ${orderReport.id}`);

      await OrderServices.destroy({ where: { orderId: orderReport.id }, transaction });

      await Promise.all(
        serviceId.map(async (item) => {
          let service = await TblOrganization_Service.findOne({
            where: {
              service_id: item.id,
              organization_id: fromOrganization,
            },
            transaction,
          });

          if (!service) {
            console.log(`Service with ID ${item.id} not found. Creating new entry...`);
            service = await TblOrganization_Service.create(
              {
                id: item.id,
                service_id: item.id,
                organization_id: fromOrganization,
                price: 0,
              },
              { transaction }
            );
          }

          const price = parseFloat(service.price) * parseInt(item.quantity);

          await OrderServices.create(
            {
              orderId: orderReport.id,
              orgserviceId: service.id,
              quantity: item.quantity,
              price: price,
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
    if (transaction) await transaction.rollback();

    console.error("Error processing Order:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const orderReport = async (req, res) => {
  try {
    const { fromdate, todate } = req.params;

    let whereCondition = {
      orderStatus: {
        [Op.eq]: "completed",
      },
    };

    if (fromdate && todate) {
      // Ensure the dates are correctly parsed and compare only the date part
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

const orderDetails = async (req, res) => {
  const { id } = req.params;

  try {
      // Fetch the order report by ID and include associated user details
      const orderReport = await OrderReports.findByPk(id, {
          include: [
              {
                  model: User,
                  as: 'user',  
                  attributes: ['id', 'firstName', 'email', 'address', 'hospital_name'], 
              },
          ],
      });

      if (!orderReport) {
          return res.status(404).json({
              success: false,
              message: "Order Report not found!",
          });
      }

      // Fetch order services along with price, quantity, and service details
      const orderServices = await OrderServices.findAll({
          where: { orderId: orderReport.id },
          attributes: ['id', 'orderId', 'price', 'quantity'],  // Include price and quantity
          include: [
              {
                  model: TblOrganization_Service,
                  as: 'orgservice', 
                  attributes: ['id', 'service_id'], 
                  include: [
                      {
                          model: Services, 
                          as: 'services', 
                          attributes: ['id', 'servicename'], 
                      }
                  ]
              },
          ],
      });

      if (!orderServices || orderServices.length === 0) {
          return res.status(404).json({
              success: false,
              message: "No services found for this order!",
          });
      }

      // Fetch organization details
      const toOrganizationDetails = await Organization.findByPk(orderReport.toOrganization, {
          attributes: ["id", "name"],
      });

      return res.status(200).json({
          success: true,
          message: "Order Report found successfully!",
          data: {
              ...orderReport.toJSON(),
              orderServices,  // Now includes price and quantity
              toOrganizationDetails, 
          },
      });
  } catch (error) {
      console.error("Error fetching order report:", error);
      res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};


const PaymentReports = async(req,res)=>{

  try {
    const {fromDate, toDate}=req.query;
    let whereCondition={
      orderStatus:{[Op.eq]:"completed"}
    }
    if(fromDate && toDate){
      whereCondition.createdAt={[Op.between]:[new Date(fromDate),new Date(toDate)]}
    }
    else if(fromDate){
      whereCondition.createdAt={[Op.gte]:new Date(fromDate)}
    }
    else if(toDate){
      whereCondition.createdAt={[Op.gte]:new Date(fromDate)}
    }
    else if (toDate) {
      whereCondition.createdAt ={[Op.lte]: new Date(toDate),};
    }
    const allOrders = await OrderReports.findAll({where:whereCondition})
    return res.status(200).json({
      success:true,
      message:"Payment Reports Fetched Successfully!",
      data:allOrders
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

const ViewPaymentReportDetails = async(req,res)=>{
  const {id}=req.params;
  try {
    const orderDetails=await OrderReports.findByPk(id,{
      include:[
        {
          model:User,
          as:'user',
          attributes:['id','firstName']
        },
      ]
    })
    if(!orderDetails){
      return res.status(404).json({
        success:false,
        message:"Order Details are not found!"
      })
    }
    const billDetails=await OrderReports.findByPk(id)
    if(!billDetails){
      return res.status(404).json({message:"Bill Details are not found!"})
    }
    const serviceDetails=await TblOrganization_Service.findOne({
      where:{organization_id:orderDetails.fromOrganization},
      include:[
        {
          model:Services,
          as:'service',
          attributes:["id","servicename",'servicedescription']
        }
      ]
    })
    if(!serviceDetails){
      return res.status(404).json({
        success:false,
        message:"Service Details are not found!"
      })
    }
    return res.status(200).json({
      success:true,
      message:"Payment Details Fetched Successfully",
      data:{
        orderDetails,
        billDetails,
        serviceDetails
      }
    })
  } catch (error) {
    console.error("Error Occurs While Fetching Payment Reports: ",error)
    res.status(500).json({message:"Interal Server Error",error:error.message})
  }
}


module.exports = { fromDentist,orderDetails,orderReport ,PaymentReports};
