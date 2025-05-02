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
const Notification = require("../../Models/Notification.model");
const orderTransaction = require("../../Models/ReportsModel/OrderTransaction.model");
const Roles = require("../../Models/TblRoles.model");
const axios = require("axios");
const UploadImages = require("../../Models/ReportsModel/UploadImages.model");
const { initiateRefund } = require("../Payments/cashFree");
const { sendSMS } = require("../../helper/sendSms");

// If I pass only the userUUID, it means the request is coming from the owner. If I pass both the userUUID and delivery_boy, it means the request is coming from the delivery boy. If I do not pass the delivery_boy and userUUID, it means the request is coming from the dentist.
const fromDentist = async (req, res) => {
  const transaction = await sequelize.transaction({ autocommit: false });
  const userId = req.user.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized!" });
  }

  try {
    const {
      id,
      fromOrganization,
      patientName,
      patientId,
      orderDate,
      transactionId,
      userUUID, // doctor id
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
        where: { id: id },
      }, { transaction });

      if (!orderReport) {
        return res.status(404).json({ success: false, message: "Order not found." });
      }

      console.log("updte started 1");
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
          address,
        },
        { where: { id: id }, transaction }
      );
    } else {
      // Create new order
      const orderIdValue = await generateUniqueId("ORD", OrderReports, "orderId");

      orderReport = await OrderReports.create(
        {
          fromOrganization,
          patientName,
          orderId: orderIdValue,
          patientId,
          toOrganization,
          orderDate,
          requiredDate,
          toothName,
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
          payment_status: "unpaid",
          created_by: userId,
        },
        { transaction }
      );

      const creator = await User.findByPk(userId, {
        include: [{ model: Roles, as: "role", attributes: ["id", "rolename"] }],
        transaction,
      });
      const isDentist = creator?.role?.rolename === "Dentist";

      // Doctor received message
      if (!isDentist && userUUID) {
        const doctor = await User.findByPk(userUUID);
        let doctorSubscriptions = doctor?.one_subscription || [];
        if (!Array.isArray(doctorSubscriptions)) {
          console.warn(`Invalid one_subscription for doctor ${userUUID}:`, doctor?.one_subscription);
          doctorSubscriptions = [];
        }

        if (doctorSubscriptions.length > 0) {
          console.log(`Sending push notification to doctor (userUUID: ${userUUID}) for order ${orderReport.orderId} on ${doctorSubscriptions.length} devices`);
          const response = await axios.post(
            "https://onesignal.com/api/v1/notifications",
            {
              app_id: process.env.ONESIGNAL_APP_ID,
              include_player_ids: doctorSubscriptions,
              headings: { en: `Order Received` },
              contents: { en: `Order Received of orderId ${orderReport.orderId}` },
            },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
              },
            }
          );
          console.log(`✅ Push notification sent successfully to doctor (userUUID: ${userUUID}) on ${doctorSubscriptions.length} devices:`, response.data);
        } else {
          console.log(`No push notification sent to doctor (userUUID: ${userUUID}) for order ${orderReport.orderId}: no subscriptions found`);
        }

        console.log(`Creating database notification for doctor (userUUID: ${userUUID}) for order ${orderReport.orderId}`);
        await Notification.create({
          uid: userUUID,
          datetime: new Date(),
          title: `Order Received`,
          description: `Order Received of orderId ${orderReport.orderId}`,
        }, { transaction });
        console.log(`✅ Database notification created for doctor (userUUID: ${userUUID}) for order ${orderReport.orderId}`);
      } else {
        console.log(`No doctor notification sent for order ${orderReport.orderId}: ${isDentist ? "User is a dentist" : "userUUID not provided"}`);
      }

      // send sms lab owner or radilogy owner
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
              rolename: "owner",
            },
          },
        ],
        transaction,
      });

      // Fetch organization type
      const organization = await Organization.findByPk(toOrganization, {
        include: [
          {
            model: TblOrganizationType,
            as: "organizationType",
            attributes: ["id", "organizationType"]
          }
        ]
      });

      const organizationType = organization?.organizationType?.organizationType;

      let smsContent = '';
      if (creator.prefix === "DR") {
        // when doctor create order msg recived radilogy or Dental Laboratory owner
        if (organizationType === 'Radiology') {
          smsContent = `A Radiology order was raised by ${creator.firstName, creator.lastName} on ${new Date(orderReport.createdAt).toISOString().split('T')[0]}. Check it on the Platix app. Download from Play Store or App Store. – Team Platix`;
        } else if (organizationType === 'Dental Laboratory') {
          smsContent = `A lab order was raised by ${creator.firstName, creator.lastName} on ${new Date(orderReport.createdAt).toISOString().split('T')[0]}. Check it on the Platix app. Download from Play Store or App Store. – Team Platix`;
        } else {
          console.log('Unknown organization type. SMS not sent.');
          return;
        }

        if (ownersFromOrganization.length > 0) {
          console.log(`Sending SMS to ${ownersFromOrganization.length} owners for order ${orderReport.orderId}`);

          for (const owner of ownersFromOrganization) {
            const phoneNumber = owner.mobile;

            if (phoneNumber) {
              await sendSMS(smsContent, phoneNumber);
              console.log(`SMS sent to ${phoneNumber}: ${smsContent}`);
            } else {
              console.log(`No phone number available for owner (userId: ${owner.id}) for order ${orderReport.orderId}. SMS not sent.`);
            }
          }
        } else {
          console.log(`No owners found for organization (organization_id: ${toOrganization}) for order ${orderReport.orderId}. SMS not sent.`);
        }
      } else {
        // msg recived dentist when delivery boy create an order
        const dentist = await User.findByPk(orderReport.userUUID, { transaction });
        if (!dentist) {
          await transaction.rollback();
          return res.status(404).json({
            success: false,
            message: "Dentist not found",
          });
        }
        smsContent = `Deliver boy ${creator.firstName} ${creator.lastName} created an order in ${organization.name}`;
        await sendSMS(smsContent,dentist.mobileNo)
      }


    }

    const sendUser = await User.findByPk(userId);
    let userSubscriptions = sendUser?.one_subscription || [];
    if (!Array.isArray(userSubscriptions)) {
      console.warn(`Invalid one_subscription for user ${userId}:`, sendUser?.one_subscription);
      userSubscriptions = [];
    }

    if (userSubscriptions.length > 0) {
      console.log(`Sending push notification to user (userId: ${userId}) for order ${orderReport.orderId} on ${userSubscriptions.length} devices`);
      const response = await axios.post(
        "https://onesignal.com/api/v1/notifications",
        {
          app_id: process.env.ONESIGNAL_APP_ID,
          include_player_ids: userSubscriptions,
          headings: { en: `${id ? "Order Updated" : "Order Confirmation"}` },
          contents: {
            en: `${id ? `Order ${orderReport.orderId} has been successfully Updated` : `Order ${orderReport.orderId} has been successfully confirmed and is now being processed`}.`,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
          },
        }
      );
      console.log(`✅ Push notification sent successfully to user (userId: ${userId}) on ${userSubscriptions.length} devices:`, response.data);
    } else {
      console.log(`No push notification sent to user (userId: ${userId}) for order ${orderReport.orderId}: no subscriptions found`);
    }

    console.log(`Creating database notification for user (userId: ${userId}) for order ${orderReport.orderId}`);
    await Notification.create({
      uid: userId,
      datetime: new Date(),
      title: `${id ? "Order Updated" : "Order Confirmation"}`,
      description: `${id ? `Order ${orderReport.orderId} has been successfully Updated` : `Order ${orderReport.orderId} has been successfully confirmed and is now being processed`}.`,
    });
    console.log(`✅ Database notification created for user (userId: ${userId}) for order ${orderReport.orderId}`);

    // Fetch organization owners
    console.log(`Fetching owners for organization (organization_id: ${toOrganization}) for order ${orderReport.orderId}`);
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
            rolename: "owner",
          },
        },
      ],
      transaction,
    });

    console.log(`Found ${ownersFromOrganization.length} owners for organization (organization_id: ${toOrganization}) for order ${orderReport.orderId}`);

    if (ownersFromOrganization.length > 0) {
      console.log(`Creating database notifications for ${ownersFromOrganization.length} organization owners for order ${orderReport.orderId}`);
      const notifications = ownersFromOrganization.map((owner) => ({
        organization_id: toOrganization,
        uid: owner.id,
        datetime: new Date(),
        title: "New Order Received",
        description: `New Order ${orderReport.orderId} has been received to your organization.`,
      }));
      await Notification.bulkCreate(notifications, { transaction });
      console.log(`✅ Database notifications created for ${ownersFromOrganization.length} organization owners for order ${orderReport.orderId}`);

      const pushNotifications = ownersFromOrganization.flatMap((owner) => {
        let ownerSubscriptions = owner.one_subscription || [];
        if (!Array.isArray(ownerSubscriptions)) {
          console.warn(`Invalid one_subscription for owner ${owner.id}:`, owner.one_subscription);
          ownerSubscriptions = [];
        }
        if (ownerSubscriptions.length > 0) {
          console.log(`Sending push notification to organization owner (userId: ${owner.id}) for order ${orderReport.orderId} on ${ownerSubscriptions.length} devices`);
          return [
            axios.post(
              "https://onesignal.com/api/v1/notifications",
              {
                app_id: process.env.ONESIGNAL_APP_ID,
                include_player_ids: ownerSubscriptions,
                headings: { en: "New Order Received" },
                contents: { en: `New Order ${orderReport.orderId} has been received to your organization.` },
              },
              {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
                },
              }
            ).then((response) => {
              console.log(`✅ Push notification sent successfully to organization owner (userId: ${owner.id}) on ${ownerSubscriptions.length} devices:`, response.data);
              return response;
            }).catch((error) => {
              console.log(`⚠️ Failed to send push notification to organization owner (userId: ${owner.id}):`, error.message);
              throw error;
            }),
          ];
        } else {
          console.log(`Push notification not sent to organization owner (userId: ${owner.id}) for order ${orderReport.orderId}: no subscriptions available`);
          return [];
        }
      });

      if (pushNotifications.length > 0) {
        try {
          await Promise.all(pushNotifications);
          console.log(`✅ All ${pushNotifications.length} push notifications processed for organization owners for order ${orderReport.orderId}`);
        } catch (pushError) {
          console.warn(`⚠️ One or more push notifications to organization owners failed for order ${orderReport.orderId}:`, pushError.message);
        }
      } else {
        console.log(`No push notifications sent to organization owners for order ${orderReport.orderId}: no owners with subscriptions`);
      }
    } else {
      console.log(`No notifications sent to organization owners for order ${orderReport.orderId}: no owners found for organization (organization_id: ${toOrganization})`);
    }

    if (transactionId) {
      console.log("Processing transaction...");

      await orderTransaction.create(
        {
          orderId: orderReport.id,
          userUUID: userUUID || userId,
          transactionId,
          amount: total_amount,
        },
        { transaction }
      );

      await orderReport.update(
        { payment_status: "paid" },
        { transaction }
      );

      // Notification for payment success
      (async () => {
        const sendUser = await User.findByPk(userId);
        let userSubscriptions = sendUser?.one_subscription || [];
        if (!Array.isArray(userSubscriptions)) {
          console.warn(`Invalid one_subscription for user ${userId}:`, sendUser?.one_subscription);
          userSubscriptions = [];
        }

        const pushPromise = userSubscriptions.length > 0
          ? (console.log(`Sending push notification to user (userId: ${userId}) for payment of order ${orderReport.orderId} on ${userSubscriptions.length} devices`),
            axios.post(
              "https://onesignal.com/api/v1/notifications",
              {
                app_id: process.env.ONESIGNAL_APP_ID,
                include_player_ids: userSubscriptions,
                headings: { en: "Payment Successful" },
                contents: {
                  en: `Payment Successful of orderId ${orderReport.orderId}`,
                },
              },
              {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
                },
              }
            ).then((response) => {
              console.log(`✅ Push notification sent successfully to user (userId: ${userId}) for payment of order ${orderReport.orderId} on ${userSubscriptions.length} devices:`, response.data);
              return response;
            }).catch((error) => {
              console.log(`⚠️ Failed to send push notification to user (userId: ${userId}) for payment of order ${orderReport.orderId}:`, error.message);
              throw error;
            }))
          : (console.log(`No push notification sent to user (userId: ${userId}) for payment of order ${orderReport.orderId}: no subscriptions found`),
            Promise.resolve());

        console.log(`Creating database notification for user (userId: ${userId}) for payment of order ${orderReport.orderId}`);
        const notifPromise = Notification.create({
          uid: userId,
          datetime: new Date(),
          title: "Payment Successful",
          description: `Payment Successful of orderId ${orderReport.orderId}`,
        }, { transaction }).then(() => {
          console.log(`✅ Database notification created for user (userId: ${userId}) for payment of order ${orderReport.orderId}`);
        });

        await Promise.allSettled([pushPromise, notifPromise]);
      })();
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
              status: false,
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
    if (transaction.finished !== "commit") {
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
  const userId = req.user.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const { cancel } = req.params;
  const { id } = req.body;

  if (!cancel || !id) {
    return res.status(400).json({
      success: false,
      message: "Cancel parameter and order ID are required",
    });
  }

  const transaction = await sequelize.transaction({ autocommit: false });

  try {
    const orderReport = await OrderReports.findByPk(id, { transaction });
    if (!orderReport) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Update order status to cancelled
    await orderReport.update(
      { orderStatus: "cancelled" },
      { transaction }
    );

    // Notify the dentist (userUUID)
    const dentist = await User.findByPk(orderReport.userUUID, { transaction });
    if (!dentist) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Dentist not found",
      });
    }

    try {
      await Notification.create(
        {
          uid: orderReport.userUUID,
          datetime: new Date(),
          title: "Order Cancelled",
          description: `Order ${orderReport.orderId} has been cancelled.`,
        },
        { transaction }
      );
      console.log(`Notification created successfully for dentist ID ${orderReport.userUUID} for order ID ${orderReport.orderId}`);
    } catch (error) {
      console.error(`Failed to create notification for dentist ID ${orderReport.userUUID} for order ID ${orderReport.orderId}:`, error.message);
    }

    let dentistSubscriptions = dentist.one_subscription || [];
    if (!Array.isArray(dentistSubscriptions)) {
      console.warn(`Invalid one_subscription for dentist ${orderReport.userUUID}:`, dentist.one_subscription);
      dentistSubscriptions = [];
    }


    if (dentistSubscriptions.length > 0) {
      try {
        const response = await axios.post(
          "https://onesignal.com/api/v1/notifications",
          {
            app_id: process.env.ONESIGNAL_APP_ID,
            include_player_ids: dentistSubscriptions,
            headings: { en: "Order Cancelled" },
            contents: {
              en: `Order ${orderReport.orderId} has been cancelled.`,
            },
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
            },
          }
        );
        console.log(`OneSignal push notification sent successfully to dentist ID ${orderReport.userUUID} for order ID ${orderReport.orderId} on ${dentistSubscriptions.length} devices:`, response.data);
      } catch (error) {
        console.error(`Failed to send OneSignal push notification to dentist ID ${orderReport.userUUID} for order ID ${orderReport.orderId}:`, error.response?.data || error.message);
      }
    } else {
      console.log(`No OneSignal push notification sent to dentist ID ${orderReport.userUUID} for order ID ${orderReport.orderId}: no subscriptions found`);
    }

    // Notify organization owners
    const ownersFromOrganization = await User.findAll(
      {
        where: {
          organization_id: orderReport.toOrganization,
        },
        include: [
          {
            model: Roles,
            as: "role",
            attributes: ["id", "rolename"],
            where: {
              rolename: "owner",
            },
          },
        ],
      },
      { transaction }
    );

    if (ownersFromOrganization.length > 0) {
      const ownerNotifications = ownersFromOrganization.map((owner) => ({
        organization_id: orderReport.toOrganization,
        uid: owner.id,
        datetime: new Date(),
        title: "Order Cancelled",
        description: `Order ${orderReport.orderId} has been cancelled by the dentist.`,
      }));

      try {
        await Notification.bulkCreate(ownerNotifications, { transaction });
        console.log(`Notifications created successfully for ${ownersFromOrganization.length} owners of organization ID ${orderReport.toOrganization} for order ID ${orderReport.orderId}`);
      } catch (error) {
        console.error(`Failed to create notifications for owners of organization ID ${orderReport.toOrganization} for order ID ${orderReport.orderId}:`, error.message);
      }

      const pushNotifications = ownersFromOrganization
        .filter((owner) => owner.one_subscription && Array.isArray(owner.one_subscription) && owner.one_subscription.length > 0)
        .map((owner) => {
          console.log(`Sending push notification to organization owner ID ${owner.id} for order ID ${orderReport.orderId} on ${owner.one_subscription.length} devices`);
          return axios.post(
            "https://onesignal.com/api/v1/notifications",
            {
              app_id: process.env.ONESIGNAL_APP_ID,
              include_player_ids: owner.one_subscription,
              headings: { en: "Order Cancelled" },
              contents: {
                en: `Order ${orderReport.orderId} has been cancelled by the dentist.`,
              },
            },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
              },
            }
          )
            .then((response) => {
              console.log(`OneSignal push notification sent successfully to organization owner ID ${owner.id} for order ID ${orderReport.orderId} on ${owner.one_subscription.length} devices:`, response.data);
              return response;
            })
            .catch((error) => {
              console.error(`Failed to send OneSignal push notification to organization owner ID ${owner.id} for order ID ${orderReport.orderId}:`, error.response?.data || error.message);
              throw error;
            });
        });

      if (pushNotifications.length > 0) {
        try {
          await Promise.all(pushNotifications);
          console.log(`All ${pushNotifications.length} OneSignal push notifications sent successfully to owners of organization ID ${orderReport.toOrganization} for order ID ${orderReport.orderId}`);
        } catch (error) {
          console.error(`Failed to send one or more OneSignal push notifications to owners of organization ID ${orderReport.toOrganization} for order ID ${orderReport.orderId}:`, error.message);
        }
      } else {
        console.log(`No OneSignal push notifications sent to owners of organization ID ${orderReport.toOrganization} for order ID ${orderReport.orderId}: no owners with valid subscriptions`);
      }
    } else {
      console.log(`No owners found for organization ID ${orderReport.toOrganization} for order ID ${orderReport.orderId}`);
    }

    // Notify assigned technician or delivery boy
    const assignedUsers = [];
    if (orderReport.technician) {
      assignedUsers.push({ id: orderReport.technician, role: "technician" });
    }
    if (orderReport.delivery_boy) {
      assignedUsers.push({ id: orderReport.delivery_boy, role: "delivery boy" });
    }

    if (assignedUsers.length > 0) {
      for (const { id, role } of assignedUsers) {
        const assignedUser = await User.findByPk(id, { transaction });
        if (assignedUser) {
          try {
            await Notification.create(
              {
                uid: id,
                datetime: new Date(),
                title: "Order Cancelled",
                description: `Order ${orderReport.orderId} you were assigned to as ${role} has been cancelled.`,
              },
              { transaction }
            );
            console.log(`Database notification created successfully for ${role} ID ${id} for order ID ${orderReport.orderId}`);
          } catch (error) {
            console.error(`Failed to create database notification for ${role} ID ${id} for order ID ${orderReport.orderId}:`, error.message);
          }

          let assignedUserSubscriptions = assignedUser.one_subscription || [];
          if (!Array.isArray(assignedUserSubscriptions)) {
            console.warn(`Invalid one_subscription for ${role} ${id}:`, assignedUser.one_subscription);
            assignedUserSubscriptions = [];
          }

          if (assignedUserSubscriptions.length > 0) {
            try {
              const response = await axios.post(
                "https://onesignal.com/api/v1/notifications",
                {
                  app_id: process.env.ONESIGNAL_APP_ID,
                  include_player_ids: assignedUserSubscriptions,
                  headings: { en: "Order Cancelled" },
                  contents: {
                    en: `Order ${orderReport.orderId} you were assigned to as ${role} has been cancelled.`,
                  },
                },
                {
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
                  },
                }
              );
              console.log(`OneSignal push notification sent successfully to ${role} ID ${id} for order ID ${orderReport.orderId} on ${assignedUserSubscriptions.length} devices:`, response.data);
            } catch (error) {
              console.error(`Failed to send OneSignal push notification to ${role} ID ${id} for order ID ${orderReport.orderId}:`, error.response?.data || error.message);
            }
          } else {
            console.log(`No OneSignal push notification sent to ${role} ID ${id} for order ID ${orderReport.orderId}: no subscriptions found`);
          }
        } else {
          console.log(`No user found for ${role} ID ${id} for order ID ${orderReport.orderId}`);
        }
      }
    } else {
      console.log(`No technician or delivery boy assigned to order ID ${orderReport.orderId}`);
    }

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
    });
  } catch (error) {
    if (transaction.finished !== "commit") {
      await transaction.rollback();
    }
    console.error("Error cancelling order:", error);
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
        }
      ],
      order: [["createdAt", "DESC"]],
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
  const uid = req.user?.id;
  console.log(uid, "uid from order details");
  if (!uid) {
    return res.status(401).json({ message: "Unauthorized!" })
  }
  const { id } = req.params;
  try {
    const orderReport = await OrderReports.findOne({
      where: {
        id: id,
        userUUID: uid
      },
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
        },
        {
          model: orderTransaction,
          as: 'transactions',
          attributes: ['transactionId', 'amount', 'createdAt'],
        },
        {
          model: UploadImages,
          as: "orderImages",
          attributes: ["order_id", "images"]
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

    const fromOrganizationDetails = await Organization.findByPk(orderReport.fromOrganization, {
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
        toOrganizationDetails,
        fromOrganizationDetails
      },
    });
  } catch (error) {
    console.error("Error fetching order report:", error);
    res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};
// payment report search by date and where orders are completed  . if u passed date then it will filter by date if not then it will filter by completed orders
const PaymentReports = async (req, res) => {
  const uid = req.user?.id;
  if (!uid) {
    return res.status(401).json({ message: "Unauthorized!" });
  }
  try {
    const { fromDate, toDate } = req.query;
    let whereCondition = {
      orderStatus: { [Op.eq]: "completed" },
      payment_status: { [Op.eq]: "paid" },
      userUUID: uid,
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
        }
      ],
      order: [["createdAt", "DESC"]],
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
  const uid = req.user?.id;
  if (!uid) {
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
        }
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

    // const serviceDetails = await TblOrganization_Service.findOne({
    //   where: { organization_id: orderDetails.toOrganization },
    //   include: [
    //     {
    //       model: Services,
    //       as: 'servicess',
    //       attributes: [ "servicename", 'servicedescription']
    //     },

    //   ],
    //   attributes:["id","price"]
    // })

    let toOrganizationName = null;
    let toOrganizationType = null;
    if (orderDetails.toOrganization) {
      const toOrganization = await Organization.findByPk(orderDetails.toOrganization, {
        attributes: ['id', 'name'],
        include: [{
          model: TblOrganizationType,
          as: 'organizationType',
          attributes: ['id', 'organizationType']
        }]
      });
      if (toOrganization) {
        toOrganizationName = toOrganization.name;
        toOrganizationType = toOrganization?.organizationType?.organizationType
      }
    }

    return res.status(200).json({
      success: true,
      message: "Payment Details Fetched Successfully",
      data: {
        orderDetails: {
          ...orderDetails.toJSON(),
          toOrganizationName,
          toOrganizationType
        },
        billDetails,
        // serviceDetails
      }
    })
  } catch (error) {
    console.error("Error Occurs While Fetching Payment Reports: ", error)
    res.status(500).json({ message: "Internal Server Error", error: error.message })
  }
}

// order search
const orderAndPaymentSearch = async (req, res) => {
  const uid = req.user?.id;
  if (!uid) {
    return res.status(401).json({ message: "Unauthorized!" });
  }
  const { search } = req.params;

  try {
    const orderReports = await OrderReports.findAll({
      where: {
        orderStatus: "completed",
        userUUID: uid,
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
      order: [["createdAt", "DESC"]],
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
  const uid = req.user?.id;
  if (!uid) {
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
      is_visible_to_customer: true,
      // created_by:userUUID,
    };
    console.log(whereClause, "whereClause");
    if (status === "completed") {
      whereClause.payment_status = "paid";
    }

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
      { is_visible_to_customer: false },
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



const payNow = async (req, res) => {
  const uid = req.user?.id;

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


    //send push notifications
    const sendUser = await User.findByPk(uid)

    let userSubscriptions = sendUser.one_subscription || [];
    if (!Array.isArray(userSubscriptions)) {
      console.warn(`Invalid one_subscription for user ${uid}:`, sendUser.one_subscription);
      userSubscriptions = [];
    }


    if (userSubscriptions.length > 0) {
      try {
        const response = await axios.post(
          "https://onesignal.com/api/v1/notifications",
          {
            app_id: process.env.ONESIGNAL_APP_ID,
            include_player_ids: userSubscriptions,
            headings: { en: "Payment Confirmation" },
            contents: {
              en: `Payment of ${amount} for order ${orderReport.orderId} has been successfully processed.`,
            },
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
            },
          }
        );
        console.log(
          `OneSignal push notification sent successfully to user ID ${uid} for order ID ${orderReport.orderId} on ${userSubscriptions.length} devices:`,
          response.data
        );
      } catch (error) {
        console.error(
          `Failed to send OneSignal push notification to user ID ${uid} for order ID ${orderReport.orderId}:`,
          error.response?.data || error.message
        );
      }
    } else {
      console.log(
        `No OneSignal push notification sent to user ID ${uid} for order ID ${orderReport.orderId}: no subscriptions found`
      );
    }

    await Notification.create({
      uid: uid,
      datetime: new Date(),
      title: "Payment Confirmation",
      description: `Order ${amount} for bill ${orderReport.orderId} has been successfully processed.`
    });

    return res.status(200).json({ message: "Payment is successful", transaction: transaction });

  } catch (error) {
    console.error("Error processing payment:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};


const fetchDentistOrganizations = async (req, res) => {
  try {
    const organizations = await Organization.findAll({
      include: [
        {
          model: TblOrganizationType,
          as: "organizationType",
          where: { organizationType: "Dentist" },
          attributes: ["id", "organizationType"]
        },
      ],
      attributes: [
        "id",
        "name",
        "organizationType_id",
        "address",
        "googleCoordinates",
        "mobile",
        "whatsapp",
        "email",
        "description",
        "gstNumber",
        "designation",
        "businessName",
        "registrationId",
        "file1",
        "file2",
        "admin_id",
        "bankName",
        "accountNumber",
        "accountHolder",
        "ifscCode",
        "upiId",
        "createdAt",
        "updatedAt",
        "deletedAt",
      ],
    });

    if (!organizations || organizations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No organizations with Dentist role found",
      });
    }

    // Transform the data to clean up address and googleCoordinates
    const cleanedOrganizations = organizations.map((org) => {
      let address = org.address;
      let googleCoordinates = org.googleCoordinates;

      // Parse address if it's a stringified JSON
      if (typeof address === "string") {
        try {
          address = JSON.parse(address);
          // Ensure address is an array; if it's a string, wrap it in an array
          address = Array.isArray(address) ? address : [address];
        } catch (e) {
          console.warn(`Invalid JSON in address for org ${org.id}:`, address);
          address = []; // Fallback to empty array if parsing fails
        }
      } else if (!Array.isArray(address)) {
        address = []; // Fallback to empty array if not an array
      }

      // Parse googleCoordinates if it's a stringified JSON
      if (typeof googleCoordinates === "string") {
        try {
          googleCoordinates = JSON.parse(googleCoordinates);
        } catch (e) {
          console.warn(`Invalid JSON in googleCoordinates for org ${org.id}:`, googleCoordinates);
          googleCoordinates = { latitude: null, longitude: null }; // Fallback
        }
      }

      // Ensure googleCoordinates is an object with latitude and longitude
      if (!googleCoordinates || typeof googleCoordinates !== "object") {
        googleCoordinates = { latitude: null, longitude: null };
      }

      return {
        ...org.toJSON(), // Convert Sequelize instance to plain object
        address, // Cleaned address array
        googleCoordinates, // Cleaned coordinates object
      };
    });

    return res.status(200).json({
      success: true,
      message: "Dentist organizations fetched successfully",
      data: cleanedOrganizations,
    });
  } catch (error) {
    console.error("Error fetching Dentist organizations:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  fromDentist,
  orderDetailsgetById,
  orderReport,
  PaymentReports,
  paymenDetailsGetById,
  orderAndPaymentSearch,
  getorganizationDetailsById,
  cancelledAndDestroyOrder,
  payNow,
  cancelledOrders,
  fetchDentistOrganizations,
};