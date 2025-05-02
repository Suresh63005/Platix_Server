

const dotenv=require("dotenv")
dotenv.config();
const client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

const sendSMS=async(message,phone)=>{
    try {
        const result=await client.messages.create({
            body: message,
            messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
            to: phone
        })
        fetchMessageLog(result.sid)
        console.log(`SMS sent with SID: ${result.sid}`);
        return result;
    } catch (error) {
        console.error('Error sending SMS:', error.message);
        throw error;
    }
}

async function fetchMessageLog(messageSid) {
    try {
      const message = await client.messages(messageSid).fetch();
      console.log('Message Log Entry:');
      console.log({
        sid: message.sid,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        to: message.to,
        from: message.from,
        body: message.body,
        dateSent: message.dateSent,
        price: message.price,
        priceUnit: message.priceUnit,
      });
      return message;
    } catch (error) {
      console.error('Error fetching message log:', error.message, error);
      throw error;
    }
  }
module.exports= { sendSMS }