const asyncHandler = require("../../Middlewares/errorHandler")
const { sequelize } = require("../../config/db");
const OrderReports = require("../../Models/ReportsModel/OrderReport.model");
const UserReports = require("../../Models/ReportsModel/User.model");
const Organization = require("../../Models/Organization.model");


// ✅ Create or Update Order Report
const upsertOrderReport = asyncHandler(async (req, res) => {
  const { id, OrderDate, user_UUID, From, To, OrderStatus, Patient_Id } = req.body;

  const transaction = await sequelize.transaction(); // Start transaction

  try {
    let orderReport;

    if (id) {
      // Update existing order
      orderReport = await OrderReports.findByPk(id, { transaction });

      if (!orderReport) {
        await transaction.rollback();
        return res.status(404).json({ error: "Order report not found" });
      }

      await orderReport.update(
        { OrderDate, user_UUID, From, To, OrderStatus, Patient_Id },
        { transaction }
      );

      await transaction.commit();
      return res.status(200).json({ message: "Order report updated", data: orderReport });
    } else {
      // Create new order report
      orderReport = await OrderReports.create(
        { OrderDate, user_UUID, From, To, OrderStatus, Patient_Id },
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
        { model: Organization, as: "fromOrg", attributes: ["id"] },
        // { model: Organization, as: "from", attributes: ["id"] },
      ],
    });

    res.status(200).json({ data: orderReports });
  } catch (error) {
    console.error("Error fetching order reports:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = {
  upsertOrderReport,
  getAllOrderReports,
};
