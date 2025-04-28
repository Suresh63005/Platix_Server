const axios=require("axios")
// Function-based implementation for SplitOrder
async function splitOrder({ order_id, split, order_amount, order_currency, customer_id, customer_phone }) {
  const apiUrl = process.env.CASHFREE_ENV === 'production'
    ? 'https://api.cashfree.com/pg/orders'
    : 'https://sandbox.cashfree.com/pg/orders';

  const headers = {
    'Content-Type': 'application/json',
    'x-client-id': process.env.CASHFREE_CLIENT_ID?.trim(),
    'x-client-secret': process.env.CASHFREE_CLIENT_SECRET?.trim(),
    'x-api-version': '2023-08-01',
  };

  // Log request body for debugging
  console.log("Request payload to Cashfree:", {
    order_id: order_id,
    split_details: split,
    order_amount: order_amount,
    order_currency: order_currency,
    customer_id: customer_id,  // Add customer_id here
    customer_phone: customer_phone, // Add customer_phone here
  });

  try {
    const response = await axios.post(apiUrl, {
      order_id: order_id,
      order_amount: order_amount,
      order_currency: order_currency,
      split_details: split,  // The split details (admin's 5% and vendor's 95%)
      customer_details: { 
        customer_id: customer_id,
        customer_phone: customer_phone, // Add customer phone here
      },  
    }, { headers });

    // Log the full response for debugging
    console.log("Cashfree API Response:", response.data);

    // Handle response based on Cashfree's status code
    if (response.data.status === 'OK') {
      return {
        status: 'OK',
        message: 'Payment split successfully',
      };
    } else {
      console.error('Cashfree error response:', response.data);
      return {
        status: 'ERROR',
        message: response.data.message || 'Failed to split payment',
      };
    }
  } catch (error) {
    // Log the error details
    console.error('Error calling payment gateway:', error.response?.data || error.message);
    throw new Error('Failed to call payment gateway API');
  }
}

module.exports = {
  splitOrder,
};



