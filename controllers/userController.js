const User = require("../models/primary/User");
const Role = require("../models/primary/Role");

// ✅ Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ["password"] }, // 🔒 exclude password
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["name"], // only include role name
        },
      ],
      order: [["id", "ASC"]],
    });

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error("❌ Error fetching users:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Create user
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
      address, // { country, state, postalCode, ... }
    } = req.body;

    // Check role
    const role = await Role.findOne({ where: { name: roleName } });
    if (!role)
      return res.status(400).json({ success: false, message: "Invalid role" });

    // Check if user already exists
    const existing = await User.findOne({ where: { email } });
    if (existing)
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });

    // Create new user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      roleId: role.id,
      department: department || "",
      position: position || "",
      phone: phone || "",
      taxId: taxId || "",
      address: address || {},
    });

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    console.error("❌ Error creating user:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Update user
exports.updateUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      roleName,
      department,
      position,
      phone,
      taxId,
      address,
    } = req.body;

    const user = await User.findByPk(req.params.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // Update role if provided
    if (roleName) {
      const role = await Role.findOne({ where: { name: roleName } });
      if (!role)
        return res
          .status(400)
          .json({ success: false, message: "Invalid role" });
      user.roleId = role.id;
    }

    // Update fields
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    user.department = department || user.department;
    user.position = position || user.position;
    user.phone = phone || user.phone;
    user.taxId = taxId || user.taxId;

    if (address) {
      // Merge new address fields with existing ones
      user.address = { ...user.address, ...address };
    }

    await user.save();

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("❌ Error updating user:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    await user.destroy();

    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting user:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
