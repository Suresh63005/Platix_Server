// const nodemailer = require('nodemailer');

// const sendEmail = async (to, subject, text) => {
//     const transporter = nodemailer.createTransport({
//         service: 'gmail',
//         auth: {
//             user: process.env.EMAIL_USER,
//             pass: process.env.EMAIL_PASS,
//         },
//     });

//     await transporter.sendMail({
//         from: process.env.EMAIL_USER,
//         to,
//         subject,
//         text,
//     });
// };

// module.exports = sendEmail;
// const axios=require("axios")

// // Function to subscribe user to OneSignal and tag them with their email
const subscribeUser = async (email) => {
    try {
        const response = await axios.post(
            'https://onesignal.com/api/v1/players',
            {
                app_id: process.env.ONESIGNAL_APP_ID,
                identifier: email, // Email identifier for OneSignal
                device_type: 11, // 11 represents email subscription
                tags: { email },  // Correct way to set the tag
            },
            {
                headers: {
                    Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        console.log('User subscribed and tagged:', response.data);
    } catch (error) {
        console.error('Error subscribing user to OneSignal:', error.response ? error.response.data : error.message);
    }
};



// // Function to send OTP via OneSignal
// const sendEmail = async (to, subject, text) => {
//     const message = {
//         app_id: process.env.ONESIGNAL_APP_ID,
//         headings: { en: subject },
//         contents: { en: text },
//         include_email_tokens: [to], // This is how OneSignal sends emails
//     };

//     try {
//         const response = await axios.post(
//             'https://onesignal.com/api/v1/notifications',
//             message,
//             {
//                 headers: {
//                     Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
//                     'Content-Type': 'application/json',
//                 },
//             }
//         );
//         console.log('OTP email sent:', response.data);
//     } catch (error) {
//         console.error('Error sending OTP email:', error.response ? error.response.data : error.message);
//     }
// };


// module.exports = {sendEmail,subscribeUser};


require("dotenv").config();
const SibApiV3Sdk = require("sib-api-v3-sdk");

const apiKey = process.env.BREVO_API_KEY;

SibApiV3Sdk.ApiClient.instance.authentications["api-key"].apiKey = apiKey;

const sendEmail = async (toEmail, subject, htmlContent) => {
    const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

    const sender = {
        email: "rajeshkumar73812@gmail.com", // Replace with your verified sender email
        name: "Your App Name"
    };

    const receivers = [{ email: toEmail }];

    try {
        await tranEmailApi.sendTransacEmail({
            sender,
            to: receivers,
            subject,
            htmlContent,
        });

        console.log(`OTP email sent to ${toEmail}`);
        return { success: true, message: "Email sent successfully!" };
    } catch (error) {
        console.error("Failed to send email:", error.message);
        return { success: false, message: error.message };
    }
};

module.exports = { sendEmail,subscribeUser };
