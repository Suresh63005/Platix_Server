const Vendor = require("../Models/Vendor.model");
const axios = require("axios");
require("dotenv").config();

const CASHFREE_BASE_URL = process.env.CASHFREE_ENV === "sandbox" 
  ? "https://sandbox.cashfree.com/pg" 
  : "https://api.cashfree.com/pg";
const CASHFREE_APP_ID = process.env.CASHFREE_CLIENT_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_CLIENT_SECRET;
const CASHFREE_API_VERSION = process.env.CASHFREE_API_VERSION || "2023-08-01";

const createVendor = async (data, transaction) => {
  const {
    organizationId,
    pan,
    gstNumber,
    accountType,
    aadhaar,
    cin,
    businessType,
    drivingLicense,
    voterId,
    passportNumber,
    name,
    email,
    phone,
    bankAccountNumber,
    bankAccountHolder,
    bankIfsc
  } = data;

  console.log("Vendor Input:", data);

  if (!organizationId || !name || !email || !phone || !bankAccountNumber || !bankAccountHolder || !bankIfsc) {
    throw new Error("Missing required fields for Cashfree vendor creation.");
  }

  let vendorId = `vendor_${organizationId}_${Date.now()}`.replace(/[^a-zA-Z0-9]/g, '');

  try {
    const cashfreeResponse = await axios.post(
      `${CASHFREE_BASE_URL}/easy-split/vendors`,
      {
        vendor_id: vendorId,
        status: "ACTIVE",
        name,
        email,
        phone,
        verify_account: true,
        dashboard_access: false,
        schedule_option: 2,
        bank: {
          account_number: bankAccountNumber,
          account_holder: bankAccountHolder,
          ifsc: bankIfsc
        },
        kyc_details: {
          account_type: accountType || "Individual",
          business_type: businessType || "Jewellery",
          pan: pan || "ABCPV1234D",
          uidai: aadhaar || "655675523712",
          gst: gstNumber || "29AAICP2912R1ZR", 
          cin: cin || "L00000Aa0000AaA000000",
          passport_number: passportNumber || "L6892603",
          driving_license: drivingLicense || "",
          voter_id: voterId || ""
        }
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-version": CASHFREE_API_VERSION,
          "x-client-id": CASHFREE_APP_ID,
          "x-client-secret": CASHFREE_SECRET_KEY
        }
      }
    );

    console.log(`Cashfree vendor created: ${vendorId}, status: ${cashfreeResponse.data.status}`);
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    console.error(`Failed to create Cashfree vendor ${vendorId}: ${errorMessage}`);
    throw new Error(`Cashfree vendor creation failed: ${errorMessage}`);
  }

  try {
    const vendor = await Vendor.create(
      {
        organizationId,
        pan,
        gst: gstNumber,
        accountType,
        aadhaar,
        cin,
        businessType,
        drivingLicense,
        voterId,
        passportNumber
      },
      { transaction }
    );

    return vendor;
  } catch (error) {
    console.error(`Failed to create local vendor for organization ${organizationId}: ${error.message}`);
    throw new Error(`Local vendor creation failed: ${error.message}`);
  }
};

module.exports = { createVendor };
