const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { connectDBs } = require("./config/db");

// Logger
const requestLogger = require("./middlewares/requestLogger");
const errorHandler = require("./middlewares/errorHandler");
const logger = require("./utils/logger");

// Routes
const authRoutes = require("./routes/primary/authRoutes");
const userRoutes = require("./routes/primary/userRoutes");
const classRoutes = require("./routes/primary/classRoutes");
const feeRoutes = require("./routes/primary/feeRoutes");
const packageRoutes = require("./routes/primary/packageRoutes");
const tutorPayRuleRoutes = require("./routes/primary/tutorPayRule");
const studentRoutes = require("./routes/primary/studentRoutes");
const staffRoutes = require("./routes/primary/staffRoutes");

dotenv.config();
connectDBs();

const app = express();

/* ---------------- CORS ---------------- */
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);

/* ---------------- Body parsers ---------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ✅ Request logging (BEFORE routes) */
app.use(requestLogger);

/* ---------------- Static files ---------------- */
app.use("/uploads", express.static("public/uploads"));

/* ---------------- Routes ---------------- */
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/class", classRoutes);
app.use("/api/fee-structure", feeRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/tutor-pay", tutorPayRuleRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/staff", staffRoutes);

/* ✅ Error handler (ALWAYS LAST) */
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`✅ Server running on port ${PORT}`);
});
