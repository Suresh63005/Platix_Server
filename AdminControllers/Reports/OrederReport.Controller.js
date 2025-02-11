const asyncHandler = require("../../Middlewares/errorHandler");
const { sequelize } = require("../../config/db");
const OrderReports = require("../../Models/ReportsModel/OrderReport.model");
const UserReports = require("../../Models/ReportsModel/User.model");
const Organization = require("../../Models/Organization.model");
const TblOrganizationType = require("../../Models/TblOrganizationType.model");
const { formatDateFields } = require("../../helper/formatedDate");

// ✅ Create or Update Order Report
const upsertOrderReport = asyncHandler(async (req, res) => {
  const { 
    id, 
    orderDate, 
    userUUID, 
    fromOrganization,
    fromOrganizationUsername, // doctor name
    MobileNo,  // doctor mobile no
    toOrganization,
    orderStatus, 
    patientName,
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
          orderDate, 
          userUUID, 
          fromOrganization,  
          fromOrganizationUsername,  
          MobileNo,  
          toOrganization,  
          orderStatus,  
          patientName,  
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
          MobileNo,  
          toOrganization,  
          orderStatus,  
          patientName,  
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
        { model: UserReports, as: "user", attributes: ["firstName"] },
        { model: TblOrganizationType, as: "fromOrg", attributes: ["id", "organizationType"] },
        { model: TblOrganizationType, as: "toOrg", attributes: ["id", "organizationType"] },
      ],
    });

    // Convert orderReports to JSON
    const formattedReports = orderReports.map(report => {
      const reportJson = report.toJSON();
      return {
        ...formatDateFields(reportJson, ["orderDate"]), 
        Username: reportJson.user ? reportJson.user.firstName : null, 
        FromOrganization: reportJson.fromOrg ? reportJson.fromOrg.organizationType : null, // Extract from organization
        ToOrganization: reportJson.toOrg ? reportJson.toOrg.organizationType : null, // Extract to organization
      };
    });

    res.status(200).json({ data: formattedReports });
  } catch (error) {
    console.error("Error fetching order reports:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = {
  upsertOrderReport,
  getAllOrderReports,
};
