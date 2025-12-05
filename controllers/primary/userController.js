const User = require("../../models/primary/User");
const Role = require("../../models/primary/Role");
const { Op } = require("sequelize");

// ✅ Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const { type } = req.query; // SuperAdmin / Others

    const commonInclude = [
      {
        model: User,
        as: "creator",
        attributes: ["id", "firstName", "lastName", "email"],
        required: false,
      },
      {
        model: Role,
        as: "role",
        attributes: ["name"],
      },
    ];

    let whereCondition = {};

    // -----------------------------------------
    // 1️⃣ Normal User → only see their created users
    // -----------------------------------------
    if (req.user.role.name === "User") {
      whereCondition = { createdBy: req.user.id };
    }

    // -----------------------------------------
    // 2️⃣ SuperAdmin Special Filtering
    // -----------------------------------------
    if (req.user.role.name === "SuperAdmin") {
      if (type === "SuperAdmin") {
        // Return ONLY users created by logged-in super admin
        whereCondition = { createdBy: req.user.id };
      } else if (type === "Others") {
        // Return users NOT created by logged-in super admin
        whereCondition = { createdBy: { [Op.ne]: req.user.id } };
      }
      // If no query param → return all users (default)
    }

    const users = await User.findAll({
      where: whereCondition,
      attributes: { exclude: ["password"] },
      include: commonInclude,
      order: [["id", "ASC"]],
    });

    // Add creatorName field
    const usersWithCreatorName = users.map((u) => {
      const userJSON = u.toJSON();
      userJSON.creatorName = u.creator
        ? `${u.creator.firstName} ${u.creator.lastName}`.trim()
        : null;
      return userJSON;
    });

    res.status(200).json({ success: true, users: usersWithCreatorName });
  } catch (error) {
    console.error("❌ Error fetching users:", error);
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
      address,
    } = req.body;

    // Validate role
    const role = await Role.findOne({ where: { name: roleName } });
    if (!role)
      return res.status(400).json({ success: false, message: "Invalid role" });

    // Check if email already exists
    const existing = await User.findOne({ where: { email } });
    if (existing)
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });

    // Create user with createdBy & updatedBy
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
      createdBy: req.user.id, // 👈 who created
      updatedBy: req.user.id, // 👈 who updated initially
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

    // Update normal fields
    user.firstName = firstName ?? user.firstName;
    user.lastName = lastName ?? user.lastName;
    user.email = email ?? user.email;
    user.department = department ?? user.department;
    user.position = position ?? user.position;
    user.phone = phone ?? user.phone;
    user.taxId = taxId ?? user.taxId;

    // Update address (merged)
    if (address) {
      user.address = { ...user.address, ...address };
    }

    // 👈 Track who updated the user
    user.updatedBy = req.user.id;

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
