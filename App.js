const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const logger = require("morgan");
const swaggerUi = require("swagger-ui-express");
const rateLimit = require("express-rate-limit")

const { connectDB, sequelize } = require("./config/db");
require("./Models/associations");

dotenv.config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5001;

// Connect to Database
connectDB();

const limiter=rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, 
  message: { error: "Too many requests, please try again later." },
  headers: true,
})

// Middleware

// app.use(morgan("dev"));
app.use(
  cors({
    origin:[ "http://localhost:3000","http://localhost:3001","http://localhost:3002","https://platix-client.vercel.app"],
    credentials: true,
    methods: "GET,POST,PUT,DELETE", 
    allowedHeaders: "Content-Type,Authorization", 
  })
);
app.use(express.json());  // Use express.json() for parsing JSON requests
app.use(express.urlencoded({ limit: '10mb', extended: true }));  // Handle URL-encoded data

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use("/admin", adminRoutes);


// Test route
app.use(logger("dev"))
app.get("/", (req, res) => {
  res.send("Server is running...");
});

app.use("/organization",organizationtype)
app.use("/api/organization",organization)
// app.use("/api/service",organization)
app.use("/user",UserRouter)
app.use("/order",OrderRouter)




// for mobile
app.use("/login",require("./userRoutes/auth/authRouter"))
app.use("/dashboard",require("./userRoutes/DashBoard.router"))
app.use("/profile",require("./userRoutes/Profile.router"))
app.use("/dentist",require("./userRoutes/Dentist/Dentist.router"))
app.use("/labrotory",require("./userRoutes/Labrotory/lab.router"))
app.use("/notifications",require("./userRoutes/Notification.router"))

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// app.listen(PORT2, () => {
//   console.log(`Server running on port ${PORT2}`);
// });

sequelize
  .sync()
  .then(() => {
    console.log("Database & tables created!");
  })
  .catch((err) => {
    console.error("Unable to create the database:", err);
});

