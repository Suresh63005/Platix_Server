const asyncHandler = require("../../Middlewares/errorHandler");
const { sequelize } = require("../../config/db");
const OrderReports = require("../../Models/ReportsModel/OrderReport.model");
const UserReports = require("../../Models/ReportsModel/User.model");
const Organization = require("../../Models/Organization.model");
const TblOrganizationType = require("../../Models/TblOrganizationType.model");
const { formatDateFields } = require("../../helper/formatedDate");
const Roles = require("../../Models/TblRoles.model");
const { Op } = require("sequelize");

// ✅ Create or Update Order Report
const upsertOrderReport = asyncHandler(async (req, res) => {
  const { 
    id, 
    orderDate, 
    userUUID, 
    fromOrganization,
    fromOrganizationUsername,
    toOrganization, // doctor name
    orderStatus,  // doctor mobile no
    MobileNo,
    subTotal, 
    tax,
    serviceCharges,
    totalAmount,
    paidAmount,
    paymentMethod,
    patientName,
    patientAge,
    patientGender,
    patientProblem
  } = req.body;

  console.log(req.body);
  const transaction = await sequelize.transaction();

  try {
    // 🔍 Validate fromOrganization
    const fromOrgExists = await TblOrganizationType.findByPk(fromOrganization);
    if (!fromOrgExists) {
      return res.status(400).json({ error: "Invalid fromOrganization ID" });
    }
    
    const toOrgExists = await TblOrganizationType.findByPk(toOrganization);
    if (!toOrgExists) {
      return res.status(400).json({ error: "Invalid toOrganization ID" });
    }
    
    console.log(1)
    let orderReport;

    if (id) {
      // Update existing order
      orderReport = await OrderReports.findByPk(id, { transaction });

      if (!orderReport) {
        await transaction.rollback();
        return res.status(404).json({ error: "Order report not found" });
      }

      await orderReport.update(
        { 
          id, 
          orderDate, 
          userUUID, 
          fromOrganization,
          fromOrganizationUsername,
          toOrganization, // doctor name
          orderStatus,  // doctor mobile no
          MobileNo,
          subTotal, 
          tax,
          serviceCharges,
          totalAmount,
          paidAmount,
          paymentMethod,
          patientName,
          patientAge,
          patientGender,
          patientProblem  
        },
        { transaction }
      );

      await transaction.commit();
      return res.status(200).json({ message: "Order report updated", data: orderReport });
    } else {
      // Create new order report
      orderReport = await OrderReports.create(
        { 
          orderDate, 
          userUUID, 
          fromOrganization,
          fromOrganizationUsername,
          toOrganization, // doctor name
          orderStatus,  // doctor mobile no
          MobileNo,
          subTotal, 
          tax,
          serviceCharges,
          totalAmount,
          paidAmount,
          paymentMethod,
          patientName,
          patientAge,
          patientGender,
          patientProblem  
        },
        { transaction }
      );

      await transaction.commit();
      return res.status(201).json({ message: "Order report created", data: orderReport });
    }
  } catch (error) {
    await transaction.rollback();
    console.error("Error in upsertOrderReport:", error);
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});


// ✅ Get All Order Reports (with Pagination & Associations)
const getAllOrderReports = asyncHandler(async (req, res) => {
 
  try {
    const orderReports = await OrderReports.findAll({
      include: [
        { 
          model: UserReports,
           as: "userDetails" ,
           include:[
            {
              model: Organization, as: "organization", attributes: ["id", "name"]
            }
           ]
        },
        { model: Organization, as: "toOrg", attributes: ["id", "name"] },
      ],
      order:[["createdAt","DESC"]]
    });

    // Convert orderReports to JSON
    const formattedReports = orderReports.map(report => {
      const reportJson = report.toJSON();
      return {
        ...formatDateFields(reportJson, ["orderDate"]), 
        Username: reportJson.user ? reportJson.user.firstName : null, 
        FromOrganization: reportJson.fromOrg ? reportJson.fromOrg.organizationType : null,
      };
    });

    res.status(200).json({ data: formattedReports });
  } catch (error) {
    console.error("Error fetching order reports:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const filterByOrderDate = async (req, res) => {
  try {
    const { fromDate, toDate } = req.params;

    // Check if both fromDate and toDate are provided
    if (!fromDate || !toDate) {
      return res.status(400).json({ message: "Both fromDate and toDate are required." });
    }

    // Check if the dates are valid
    const from = new Date(fromDate);
    const to = new Date(toDate);

    // Validate date format
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({ message: "Invalid date format." });
    }

    // Set the time for the "to" date to the end of the day
    to.setHours(23, 59, 59, 999); // h-m-s-ms

    // Fetch the orders based on the date range
    const orders = await OrderReports.findAll({
      where: {
        createdAt: {
          [Op.gte]: from,  // Greater than or equal to 'from' date
          [Op.lte]: to     // Less than or equal to 'to' date
        }
      },
      include: [
        { 
          model: UserReports,
           as: "userDetails" ,
           include:[
            {
              model: Organization, as: "organization", attributes: ["id", "name"]
            }
           ]
        },
        { model: Organization, as: "toOrg", attributes: ["id", "name"] },
      ],
      order:[["createdAt","DESC"]]
    });

    res.json({ data: orders });

  } catch (error) {
    console.error("Error fetching users by date:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


module.exports = {
  upsertOrderReport,
  getAllOrderReports,
  filterByOrderDate
};