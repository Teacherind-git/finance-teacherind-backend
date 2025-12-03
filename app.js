const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { connectDBs } = require("./config/db");

//primary routes
const authRoutes = require("./routes/primary/authRoutes");
const userRoutes = require("./routes/primary/userRoutes");
const classRoutes = require("./routes/primary/classRoutes");
const feeRoutes = require("./routes/primary/feeRoutes");
const packageRoutes = require("./routes/primary/packageRoutes");
const tutorPayRuleRoutes = require("./routes/primary/tutorPayRule");
const studentRoutes = require("./routes/primary/studentRoutes");

dotenv.config();
connectDBs();

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/class", classRoutes);
app.use("/api/fee-structure", feeRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/tutor-pay", tutorPayRuleRoutes);
app.use("/api/students", studentRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
