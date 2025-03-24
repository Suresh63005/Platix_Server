const swaggerAutogen = require('swagger-autogen')();

const outputFile ="../Swagger/swagger-output.json"; 
const isProduction = process.env.NODE_ENV === "production";
const endpointsFiles = [
  '../AdminRoutes/AdminRoute',
  '../AdminRoutes/OrganizationType.router',
  '../AdminRoutes/Organizations.router',
  '../AdminRoutes/ReportUser/Reports',
  '../AdminRoutes/User.router',

  '../userRoutes/DashBoard.router',
  '../userRoutes/Notification.router',
  '../userRoutes/Profile.router',
  '../userRoutes/auth/authRouter',
  '../userRoutes/Dentist/Dentist.router',
  '../userRoutes/Delivery/Delivery.router.js',
  '../userRoutes/Labrotory/lab.router',
  '../userRoutes/Owner/Owner.router.js',
];

const doc = {
  swagger: "2.0",
  info: {
    title: "Platix API",
    description: "API documentation for Platix Server",
    version: "1.0.0",
  },
  servers: [
    {
      url: isProduction
        ? "https://platix-server.vercel.app"
        : "http://localhost:5001",
      description: isProduction ? "Production Server" : "Local Development Server",
    },
  ],
  basePath: "/",
  schemes: isProduction ? ["https"] : ["http"],
  paths: {}, // Auto-generated
};

swaggerAutogen(outputFile, endpointsFiles, doc)
  .then(() => {
    console.log("✅ Swagger JSON generated successfully!");
    process.exit(0); // Ensure script exits properly
  })
  .catch((error) => {
    console.error("❌ Swagger generation failed:", error);
    process.exit(1);
  });
