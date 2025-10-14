const User = require('../models/User');
const Role = require('../models/Role');

// Get all users (Admin only)
exports.getAllUsers = async (req, res) => {
  const users = await User.find().populate('role');
  res.json(users);
};

// Create user (Admin)
exports.createUser = async (req, res) => {
  const { name, email, password, roleName } = req.body;

  const role = await Role.findOne({ name: roleName });
  if (!role) return res.status(400).json({ message: 'Invalid role' });

  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: 'Email already exists' });

  const user = await User.create({ name, email, password, role: role._id });
  res.status(201).json(user);
};

// Update user (Admin)
exports.updateUser = async (req, res) => {
  const { name, email, roleName } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (roleName) {
    const role = await Role.findOne({ name: roleName });
    if (!role) return res.status(400).json({ message: 'Invalid role' });
    user.role = role._id;
  }

  user.name = name || user.name;
  user.email = email || user.email;

  await user.save();
  res.json(user);
};

// Delete user (Admin)
exports.deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  await user.deleteOne();
  res.json({ message: 'User deleted' });
};
