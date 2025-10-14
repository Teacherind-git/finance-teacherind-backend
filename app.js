const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const Role = require("./models/Role");

dotenv.config();
connectDB();

const app = express();

// ✅ Configure CORS properly
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*", // frontend URL
    credentials: true, // allow cookies or auth headers
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
