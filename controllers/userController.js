const User = require("../models/User");
const Role = require("../models/Role");

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .populate("role", "name") // populate role name
      .lean();
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create user
exports.createUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
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
      firstName,
      lastName,
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

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error("❌ Error creating user:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
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
    res.status(200).json({ success: true, data: user });
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
  res.status(200).json({ success: true, message: "User deleted" });
};
