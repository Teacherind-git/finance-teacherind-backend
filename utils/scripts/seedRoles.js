// seedRoles.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Role = require('../../models/Role');

dotenv.config();

const roles = [
  { name: 'SuperAdmin', permissions: ['*'] },
  { name: 'Admin', permissions: ['manage-users', 'view-finance'] },
  { name: 'User', permissions: ['view-finance', 'edit-finance'] },
  // You can add more roles below any time:
];

const seedRoles = async () => {
  try {
    
    await mongoose.connect('mongodb://localhost:27017/finance-system');
    console.log('✅ Connected to MongoDB');

    for (const roleData of roles) {
      const existingRole = await Role.findOne({ name: roleData.name });
      if (!existingRole) {
        await Role.create(roleData);
        console.log(`🟢 Created role: ${roleData.name}`);
      } else {
        console.log(`🟡 Role already exists: ${roleData.name}`);
      }
    }

    console.log('✅ Role seeding completed!');
    process.exit();
  } catch (err) {
    console.error('❌ Error seeding roles:', err.message);
    process.exit(1);
  }
};

seedRoles();
