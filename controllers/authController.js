const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Role = require('../models/Role');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// Register new user
exports.register = async (req, res) => {
  const { name, email, password, roleName } = req.body;

  const role = await Role.findOne({ name: roleName });
  if (!role) return res.status(400).json({ message: 'Invalid role' });

  const userExists = await User.findOne({ email });
  if (userExists) return res.status(400).json({ message: 'User already exists' });

  const user = await User.create({ name, email, password, role: role._id });
  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: role.name,
    token: generateToken(user._id)
  });
};

// Login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).populate('role');
  if (user && await user.matchPassword(password)) {
    res.json({
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role.name
      }
    });
  } else {
    res.status(401).json({ message: 'Invalid email or password' });
  }
};
