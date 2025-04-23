const Notification = require("../../Models/Notification.model");
const User = require("../../Models/ReportsModel/User.model");
const axios=require("axios")

const createOrder = async (req, res) => {
    const uid = req.user?.id;
    const { amount } = req.body;

    try {
        const user = await User.findOne({ where: { id: uid } });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const { firstName, lastName, email, mobileNo } = user;
        const orderId = `ORDER_${Date.now()}`;

        const orderData = {
            order_id: orderId,
            order_amount: amount,
            order_currency: "INR", 
            customer_details: {
                customer_id: uid, 
                customer_name: `${firstName} ${lastName}`,
                customer_email: email,
                customer_phone: mobileNo,
            },
            return_url: 'https://webhook.site/a2962864-e51f-41b5-ab30-bb29a34f8768',
            notify_url: 'http://website.com/notify',
        };

        const apiUrl =
            process.env.CASHFREE_ENV === 'production'
                ? 'https://api.cashfree.com/pg/orders'
                : 'https://sandbox.cashfree.com/pg/orders';

        const headers = {
            'Content-Type': 'application/json',
            'x-client-id': process.env.CASHFREE_CLIENT_ID?.trim(),
            'x-client-secret': process.env.CASHFREE_CLIENT_SECRET?.trim(),
            'x-api-version': '2023-08-01',
        };

        // Send request to Cashfree API
        const response = await axios.post(apiUrl, orderData, { headers });
    
        return res.json(response.data);
    } catch (error) {
        console.error('Error creating order:', error.response?.data || error.message);
        return res.status(500).json({ message: 'Internal Server Error', error: error.response?.data || error.message });
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

        // Send push notification if user has OneSignal ID
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

module.exports={createOrder,getPaymentByOrderId}
