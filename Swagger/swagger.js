const swaggerAutogen = require('swagger-autogen')();

const outputFile ="../Swagger/swagger-output.json"; 
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
  swagger: '2.0', // Ensuring Swagger 2.0 format
  info: {
    title: 'Platix API',
    description: 'API documentation for Platix Server',
    version: '1.0.0',
  },
  servers: [
    {
      url: 'https://platix-server.vercel.app',
      description: 'Production Server',
    },
    {
      url: 'http://localhost:5001',
      description: 'Local Development Server',
    },
  ],
  basePath: '/',
  schemes: ['http', 'https'],
  paths: {}, // This will be filled automatically
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
