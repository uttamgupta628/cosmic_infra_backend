const dns = require("dns");

dns.setServers([
  "8.8.8.8",
  "1.1.1.1"
]);

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { connectRedis } = require("./config/redis");

const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/projects");
const enquiryRoutes = require("./routes/enquiries");
const siteVisitRoutes = require("./routes/siteVisits");
const redevelopmentRoutes = require("./routes/redevelopment");
const dashboardRoutes = require("./routes/dashboard");
const uploadRoutes = require("./routes/uploads");

connectDB();
connectRedis();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(",") : "*",
  })
);
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => res.json({ status: "ok", message: "Cosmic Infra API is running" }));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/site-visits", siteVisitRoutes);
app.use("/api/redevelopment", redevelopmentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/uploads", uploadRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));