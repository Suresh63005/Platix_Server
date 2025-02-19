const { Op, where } = require("sequelize");
const Organization = require("../../Models/Organization.model");
const OrderReports = require("../../Models/ReportsModel/OrderReport.model");
const Services = require("../../Models/TblServices.model");
const TblOrganization_Service = require("../../Models/tblOrganizationService");
const OrderServices = require("../../Models/ReportsModel/OrderServices.model");
const User = require("../../Models/ReportsModel/User.model");
const { sequelize } = require("../../config/db");

const fromDentist = async (req, res) => {
  const transaction = await sequelize.transaction();  // Start a new transaction

  try {
    const {
      id, // ID may or may not be provided for update
      fromOrganization,
      patientName,
      orderId,
      patientId,
      toOrganization,
      serviceId,
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

    let orderReport;
      // POST logic: Create or update an order
      if (id) {
        // Update existing order
        orderReport = await OrderReports.findByPk(id, { transaction });

        if (orderReport) {
          console.log(`Updating order ${id}`);
          await orderReport.update({
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
            sub_total,
            tax,
            service_charges,
            paid_amount,
            total_amount,
            payment_method,
            order_status,
          }, { transaction });
        } else {
          console.log(`Order with id ${id} not found`);
          return res.status(404).json({ success: false, message: "Order not found." });
        }
      } else {
        // Create a new order if no id is provided
        console.log("Creating a new order");
        orderReport = await OrderReports.create({
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
          sub_total,
          tax,
          service_charges,
          paid_amount,
          total_amount,
          payment_method,
          order_status,
        }, { transaction });
      }

    //   if (serviceId && serviceId.length > 0) {
    //     console.log(`Handling services for order ${orderReport.id}`);
    
    //     // Delete existing services for this order (if any)
    //     await OrderServices.destroy({ where: { orderId: orderReport.id }, transaction });
    
    //     // Add new services
    //     await Promise.all(
    //         serviceId.map(async (item) => {
    //             let service = await TblOrganization_Service.findOne({
    //                 where: {
    //                     service_id: item.id,
    //                     organization_id: fromOrganization, // Ensure service belongs to the organization
    //                 },
    //                 transaction
    //             });
    
    //             // If service is not found, create it in TblOrganization_Service
    //             if (!service) {
    //                 console.log(`Service with ID ${item.id} not found. Creating new entry...`);
    //                 service = await TblOrganization_Service.create({
    //                     id: item.id,  // Ensure the ID matches the expected UUID format
    //                     service_id: item.id,
    //                     organization_id: fromOrganization,
    //                     price: 0, // Set a default price, update later if needed
    //                 }, { transaction });
    //             }
    
    //             // Ensure numeric calculation
    //             const price = parseFloat(service.price) * parseInt(item.quantity);
    
    //             // Insert into OrderServices
    //             await OrderServices.create({
    //                 orderId: orderReport.id,
    //                 orgserviceId: service.id, // Use the primary key of TblOrganization_Service
    //                 quantity: item.quantity,
    //                 price: price,
    //             }, { transaction });
    //         })
    //     );
    // }
    

      // Commit the transaction after success
      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: "Order processed successfully.",
        data: orderReport,
      });

    
  } catch (error) {
    // Rollback the transaction if there is any error
    await transaction.rollback();

    console.error("Error processing Order:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
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
