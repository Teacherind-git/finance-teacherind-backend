const User = require("../models/primary/User");
const Role = require("../models/primary/Role");
const jwt = require("jsonwebtoken");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

// ✅ Register new user
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, roleName, department, position } = req.body;

    // Validate input
    if (!firstName || !email || !password || !roleName || !department || !position) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Find role by name
    const role = await Role.findOne({ where: { name: roleName } });
    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Invalid role name",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      roleId: role.id,
      department,
      position,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        id: user.id,
        name: `${user.firstName} ${user.lastName || ""}`.trim(),
        email: user.email,
        role: role.name,
        token: generateToken(user.id),
      },
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ✅ Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Fetch user with role
    const user = await User.findOne({
      where: { email },
      include: [{ model: Role, as: "role", attributes: ["id", "name"] }],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(404).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Successful login
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token: generateToken(user.id),
        user: {
          id: user.id,
          name: `${user.firstName} ${user.lastName || ""}`.trim(),
          email: user.email,
          role: user.role ? user.role.name : null,
          department: user.department,
          position: user.position,
        },
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// Get all roles
exports.getAllRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({
      order: [["id", "ASC"]], // optional: sorts by ID ascending
    });

    res.status(200).json({
      success: true,
      count: roles.length,
      data: roles,
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch roles",
    });
  }
};