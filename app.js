const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const Role = require('./models/Role');

dotenv.config();
connectDB();

const app = express();
app.use(express.json());

// Seed initial roles (run once)
(async () => {
  const roles = ['admin', 'finance-manager', 'hr'];
  for (const name of roles) {
    const exists = await Role.findOne({ name });
    if (!exists) await Role.create({ name });
  }
})();

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
