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
const axios=require("axios")
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Function to subscribe user to OneSignal and tag them with their email
const subscribeUser = async (email) => {
    try {
        const response = await axios.post(
            'https://onesignal.com/api/v1/players',
            {
                app_id: process.env.ONESIGNAL_APP_ID,
                email: email,  // User's email to subscribe
                tags: { email: email },  // Tagging the user with their email
            },
            {
                headers: {
                    Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        console.log(email)
        console.log('User subscribed and tagged:', response.data);
    } catch (error) {
        console.error('Error subscribing user to OneSignal:', error.response ? error.response.data : error.message);
    }
};

// Function to send OTP via OneSignal
const sendEmail = async (to, subject, text) => {
    const message = {
        app_id: process.env.ONESIGNAL_APP_ID,
        headings: { en: subject },  // Subject of the email
        contents: { en: text },     // OTP text body
        filters: [
            {
                field: 'tag',
                key: 'email',
                relation: '=',
                value: to,  // Filter by the email address
            },
        ],
    };

    try {
        const response = await axios.post(
            'https://onesignal.com/api/v1/notifications',
            message,
            {
                headers: {
                    Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        console.log('OTP email sent:', response.data);
    } catch (error) {
        console.error('Error sending OTP email:', error.response ? error.response.data : error.message);
    }
};

module.exports = {sendEmail,subscribeUser};