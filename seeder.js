const { faker } = require('@faker-js/faker');
const { sequelize } = require('./config/db');
const OrderReports = require('./Models/ReportsModel/OrderReport.model');

// Predefined UUIDs
const organizationUUIDs = [
  '02ce99ba-4fe0-4ec3-8927-b6bd1a1b1b58',
];

const userUUIDs = [
  'afd724ad-fbd7-4292-84ba-fde3a60c52a2',

];

// Function to generate and insert dummy data
const generateDummyData = async () => {
  try {
    // Sync the models with the database
    await sequelize.sync();  // Ensure tables exist

    // Number of records you want to insert
    const numberOfRecords = 1;

    for (let i = 0; i < numberOfRecords; i++) {
      const orderData = {
        orderDate: faker.date.past(),
        userUUID: faker.helpers.arrayElement(userUUIDs),
        fromOrganization: faker.helpers.arrayElement(organizationUUIDs),
        toOrganization: faker.helpers.arrayElement(organizationUUIDs),
        orderStatus: faker.helpers.arrayElement(["pending", "processing", "completed", "cancelled"]),
        MobileNo: faker.phone.number(),
        subTotal: faker.commerce.price(50, 500),
        tax: faker.commerce.price(5, 50),
        serviceCharges: faker.commerce.price(2, 20),
        totalAmount: faker.commerce.price(100, 1000),
        paidAmount: faker.commerce.price(50, 1000),
        paymentMethod: faker.helpers.arrayElement(["credit card", "debit card", "paypal", "cash"]),
        patientName: faker.person.fullName(),
        patientAge: faker.number.int({ min: 18, max: 99 }),
        patientGender: faker.helpers.arrayElement(["male", "female"]),
        patientProblem: faker.lorem.words(3),
      };

      // Insert data into the OrderReports table
      await OrderReports.create(orderData);
      console.log(`Inserted dummy data for order ${i + 1}`);
    }

    console.log("Dummy data insertion completed!");
  } catch (error) {
    console.error("Error inserting dummy data: ", error);
  }
};

// Run the seeder function
generateDummyData();