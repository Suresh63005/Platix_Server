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
      id,
      fromOrganization,
      patientName,
      orderId,
      patientId,
      toOrganization,
      serviceId = [],
      orderDate,
      requiredDate,
      toothName,
      shades,
      remarks,
      reasonForScan,
      userUUID,
      sub_total,
      tax,
      service_charges,
      paid_amount,
      total_amount,
      payment_method,
      order_status,
    } = req.body;

    const isCancel = req.params.cancel === "cancel";
    const genereateUniqueId=async(field,model)=>{
      let uniqueId;
      let exists;
      do{
        uniqueId=`#${Math.floor(100000000 + Math.random() * 900000000)}`
        exists=await model.findOne({where:{[field] : uniqueId}})
      } while(exists){
        return uniqueId;
      }
    }

    let orderReport;

    if (req.method === "POST") {
      if (id) {
        // Update existing order
        orderReport = await OrderReports.findByPk(id, { transaction });

        if (!orderReport) {
          return res.status(404).json({ success: false, message: "Order not found." });
        }

        console.log(`Updating order ${id}`);
        await orderReport.update(
          {
            fromOrganization,
            patientName,
            orderId,
            patientId,
            toOrganization,
            orderDate,
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
      } else {
        const uniqueOrderId=orderId ||  (await genereateUniqueId("orderId",OrderReports))
        const uniquePatientId =orderId ||  (await genereateUniqueId("patientId",OrderReports))
        // Create new order
        console.log("Creating a new order");
        orderReport = await OrderReports.create(
          {
            fromOrganization,
            patientName,
            orderId : uniqueOrderId,
            patientId : uniquePatientId ,
            toOrganization,
            orderDate,
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

      // Handle order services if provided
      if (serviceId.length > 0) {
        console.log(`Managing services for order ${orderReport.id}`);

        // Remove existing services for this order
        await OrderServices.destroy({ where: { orderId: orderReport.id }, transaction });

        // Add new services
        const servicesToAdd = await Promise.all(
          serviceId.map(async (item) => {
            const service = await TblOrganization_Service.findByPk(item.id, { transaction });

            if (!service) throw new Error(`Service with ID ${item.id} not found`);

            return {
              orderId: orderReport.id,
              orgserviceId: item.id,
              quantity: item.quantity,
              price: service.price * item.quantity,
            };
          })
        );

        await OrderServices.bulkCreate(servicesToAdd, { transaction });
      }

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: "Order processed successfully.",
        data: orderReport,
      });
    }

    if (req.method === "PUT" && isCancel) {
      // Cancel an order
      console.log(`Cancelling order with id ${id}`);
      orderReport = await OrderReports.findByPk(id, { transaction });

      if (!orderReport) {
        return res.status(404).json({ success: false, message: "Order not found." });
      }

      if (orderReport.orderStatus === "cancelled") {
        return res.status(400).json({ success: false, message: "Order is already cancelled." });
      }

      await orderReport.update({ orderStatus: "cancelled" }, { transaction });

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: "Order cancelled successfully.",
        data: orderReport,
      });
    }

    return res.status(400).json({ success: false, message: "Invalid request method." });
  } catch (error) {
    await transaction.rollback();
    console.error("Error processing order:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
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

        const orderServices = await OrderServices.findAll({
            where: { orderId: orderReport.id },
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
                orderServices,
                toOrganizationDetails, 
            },
        });
    } catch (error) {
        console.error("Error fetching order report:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

module.exports = { fromDentist,orderDetails };
