const Notification = require("../../Models/Notification.model");
const User = require("../../Models/ReportsModel/User.model");
const axios = require("axios")
const { splitOrder } = require("./paymentGateway");
const Organization = require("../../Models/Organization.model");
const {generateIdempotencyKey}=require("../../utils/idempotency")

const CASHFREE_BASE_URL = process.env.CASHFREE_ENV === "sandbox" 
  ? "https://sandbox.cashfree.com/pg" 
  : "https://api.cashfree.com/pg";
const CASHFREE_CLIENT_ID = process.env.CASHFREE_CLIENT_ID?.trim();
const CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET?.trim();

const createOrder = async (req, res) => {
  const uid = req.user?.id;
  const { amount, vendorIds } = req.body;

  try {
    // Validate input
    if (!amount || !vendorIds || !Array.isArray(vendorIds) || vendorIds.length !== 2) {
      return res.status(400).json({ message: "Amount and exactly two vendor IDs are required" });
    }

    // Calculate split amounts (95% to first vendor, 5% to second)
    const firstVendorAmount = Math.floor(amount * 0.95);
    const secondVendorAmount = amount - firstVendorAmount;

    // Fetch user
    const user = await User.findOne({ where: { id: uid } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const { firstName, lastName, email, mobileNo } = user;

    // Create order
    const orderId = `ORDER${Date.now()}`;
    const orderData = {
      // order_id: orderId,
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_id: uid,
        customer_name: `${firstName} ${lastName}`,
        customer_email: email,
        customer_phone: mobileNo,
      },

      "order_note": "Tshirt order",
      "order_meta": {
          "return_url": "https://webhook.site/a2962864-e51f-41b5-ab30-bb29a34f8768",
          "notify_url": "http://website.com/notify",
          "payment_methods": "cc,dc"
      }
      ,"order_splits": [
          {
              "vendor_id": "vendortest4o3",
              "percentage": 95,
              "tags": {
                  "product": "topwear"
              }
          },
          {
              "vendor_id": "vendortest4o9",
              "percentage": 5,
              "tags": {
                  "product": "footwear"
              }
          }
      ]
    };

    const orderResponse = await axios.post(
      `${CASHFREE_BASE_URL}/orders`,
      orderData,
      {
        headers: {
          "Content-Type": "application/json",
          "x-client-id": CASHFREE_CLIENT_ID,
          "x-client-secret": CASHFREE_CLIENT_SECRET,
          "x-api-version": "2025-01-01",
        },
      }
    );
    return res.json({
      ...orderResponse.data,
     
    });
  } catch (error) {
    console.error("Error creating order or splitting:", error.response?.data || error.message);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.response?.data || error.message,
    });
  }
};

const getPaymentByOrderId = async (req, res) => {
  const uid = req.user?.id;
  console.log(uid)
  const { order_id } = req.params;

  try {
    // ✅ Select the correct environment (sandbox/production)
    const baseUrl = process.env.CASHFREE_ENV === "production"
      ? "https://api.cashfree.com"
      : "https://sandbox.cashfree.com";

    const apiUrl = `${baseUrl}/pg/orders/${order_id}`;

    const headers = {
      "accept": "application/json",
      "x-api-version": "2023-08-01",
      "x-client-id": process.env.CASHFREE_CLIENT_ID.trim(),
      "x-client-secret": process.env.CASHFREE_CLIENT_SECRET.trim(),
    };

    // ✅ Send GET request with headers
    const response = await axios.get(apiUrl, { headers });

    // // Send push notification if user has OneSignal ID
    (async () => {
      const sendUser = await User.findByPk(uid);
      const pushPromise = sendUser?.one_subscription
        ? axios.post(
          "https://onesignal.com/api/v1/notifications",
          {
            app_id: process.env.ONESIGNAL_APP_ID,
            include_player_ids: [sendUser.one_subscription],
            headings: { en: "Payment Successfull" },
            contents: {
              en: `Payment Successfull of orderId ${order_id}`,
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
        uid: uid,
        datetime: new Date(),
        title: "Payment Successfull",
        description: `Payment Successfull  of orderId ${order_id}`,
      });

      await Promise.allSettled([pushPromise, notifPromise]); // No need to wait in main flow
    })();
    return res.json(response.data);
  } catch (error) {
    console.error("Error getting payment by ID:", error.response?.data || error.message);
    return res.status(500).json({ message: "Internal Server Error", error: error.response?.data || error.message });
  }
};


const fetchPaymentByOrderId = async (order_id) => {
  const baseUrl = process.env.CASHFREE_ENV === "production"
    ? "https://api.cashfree.com"
    : "https://sandbox.cashfree.com";

  const apiUrl = `${baseUrl}/pg/orders/${order_id}`;

  const headers = {
    "accept": "application/json",
    "x-api-version": "2023-08-01",
    "x-client-id": process.env.CASHFREE_CLIENT_ID.trim(),
    "x-client-secret": process.env.CASHFREE_CLIENT_SECRET.trim(),
  };

  try {
    const response = await axios.get(apiUrl, { headers });
    return response.data;
  } catch (error) {
    console.error("Fetch Payment Error:", error.response?.data || error.message);
    throw new Error("Failed to fetch payment info");
  }
};

const splitAmount = async (req, res) => {
  const uid = req.user?.id;  // The authenticated user's ID
  const { order_id, beneficiary_id } = req.body;

  try {
    // 1. Get payment info from Cashfree
    const order = await fetchPaymentByOrderId(order_id);

    if (!order || !order.order_amount) {
      return res.status(404).json({ error: 'Payment info not found for given order_id' });
    }

    const totalAmount = order.order_amount;

    const commission = (totalAmount * 5) / 100;
    const vendorAmount = (totalAmount * 95) / 100;

    const splitDetails = [
      {
        vendor_id: 'merchant_123445',
        amount: commission,
      },
      // for vendor
      {
        vendor_id: beneficiary_id,
        amount: vendorAmount,
      },
    ];

    // Fetch user's details for phone number
    const user = await User.findOne({ where: { id: uid } });
    const customerPhone = user?.mobileNo || ""; // Assuming mobileNo is the phone number

    // 2. Pass order_amount, order_currency, and customer_phone to splitOrder function
    const response = await splitOrder({
      order_id: order_id,
      split: splitDetails,
      order_amount: totalAmount,
      order_currency: 'INR',
      customer_id: uid,
      customer_phone: customerPhone,
    });

    if (response.status === 'OK') {
      res.status(200).json({ message: 'Payment split successfully' });
    } else {
      res.status(400).json({ error: response.message });
    }

  } catch (error) {
    console.error('Error during splitAmount:', error.message);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};


// refund
const initiateRefund = async (orderReport, refund_id, transaction) => {
  const cashfreeOrderId = orderReport.orderId;

  let cashfreeOrderStatus, orderAmount;
  try {
    const response = await axios.get(`${CASHFREE_BASE_URL}/orders/${cashfreeOrderId}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': CASHFREE_API_VERSION,
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
      }
    });

    cashfreeOrderStatus = response.data.order_status;
    orderAmount = response.data.order_amount;
  } catch (err) {
    throw new Error(`Failed to fetch Cashfree order: ${err.response?.data?.message || err.message}`);
  }

  if (cashfreeOrderStatus !== 'PAID') {
    throw new Error("Order is not paid or not eligible for refund");
  }

  try {
    const refundData = {
      refund_amount: parseFloat(orderAmount),
      refund_id,
      refund_note: `Refund for cancelled order ${orderReport.orderId}`,
      refund_speed: 'STANDARD'
    };

    await axios.post(`${CASHFREE_BASE_URL}/orders/${cashfreeOrderId}/refunds`, refundData, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': CASHFREE_API_VERSION,
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-idempotency-key': generateIdempotencyKey()
      }
    });

    await orderReport.update({ orderStatus: 'cancelled' }, { transaction });
    // await notifyUsers(orderReport, orderAmount, transaction);

    return { refund_id, orderAmount };
  } catch (err) {
    const message = err.response?.data?.message || err.message;
    if (err.response?.data?.code === 'refund_id_invalid') {
      throw new Error("Duplicate refund ID provided. Please use a unique refund ID.");
    }
    throw new Error(`Refund failed: ${message}`);
  }
}

module.exports = { createOrder, getPaymentByOrderId, splitAmount, initiateRefund }
