const User = require("../models/User");
const Role = require("../models/Role");

// Get all users
exports.getAllUsers = async (req, res) => {
  const users = await User.find().populate("role");
  res.json(users);
};

// Create user
exports.createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      roleName,
      department,
      position,
      phone,
      taxId,
      address, // { country, state, postalCode }
    } = req.body;

    const role = await Role.findOne({ name: roleName });
    if (!role) return res.status(400).json({ message: "Invalid role" });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already exists" });

    const user = await User.create({
      name,
      email,
      password,
      role: role._id,
      department: department || "",
      position: position || "",
      phone: phone || "",
      taxId: taxId || "",
      address: {
        country: address?.country || "",
        state: address?.state || "",
        postalCode: address?.postalCode || "",
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error("❌ Error creating user:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const {
      name,
      email,
      roleName,
      department,
      position,
      phone,
      taxId,
      address, // { country, state, postalCode }
    } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update role if provided
    if (roleName) {
      const role = await Role.findOne({ name: roleName });
      if (!role) return res.status(400).json({ message: "Invalid role" });
      user.role = role._id;
    }

    // Update basic fields
    user.name = name || user.name;
    user.email = email || user.email;
    user.department = department || user.department;
    user.position = position || user.position;
    user.phone = phone || user.phone;
    user.taxId = taxId || user.taxId;

    // Update address if provided
    if (address) {
      user.address.country = address.country || user.address.country;
      user.address.state = address.state || user.address.state;
      user.address.postalCode = address.postalCode || user.address.postalCode;
    }

    await user.save();
    res.json(user);
  } catch (error) {
    console.error("❌ Error updating user:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  await user.deleteOne();
  res.json({ message: "User deleted" });
};
