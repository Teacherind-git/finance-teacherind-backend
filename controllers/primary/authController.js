const User = require("../../models/primary/User");
const Role = require("../../models/primary/Role");
const jwt = require("jsonwebtoken");
const logger = require("../../utils/logger");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

// ✅ Register new user
exports.register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      roleName,
      department,
      position,
    } = req.body;

    logger.info(`Register attempt for email: ${email}`);

    if (
      !firstName ||
      !email ||
      !password ||
      !roleName ||
      !department ||
      !position
    ) {
      logger.warn("Registration failed: Missing required fields");
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const role = await Role.findOne({ where: { name: roleName } });
    if (!role) {
      logger.warn(`Invalid role name during registration: ${roleName}`);
      return res.status(400).json({
        success: false,
        message: "Invalid role name",
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      logger.warn(`Registration failed: User already exists (${email})`);
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      roleId: role.id,
      department,
      position,
    });

    logger.info(`User registered successfully: ${user.id}`);

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
    logger.error("Registration error", error);
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

    logger.info(`Login attempt for email: ${email}`);

    if (!email || !password) {
      logger.warn("Login failed: Email or password missing");
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      where: { email },
      include: [{ model: Role, as: "role", attributes: ["id", "name"] }],
    });

    if (!user) {
      logger.warn(`Login failed: User not found (${email})`);
      return res.status(404).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      logger.warn(`Login failed: Wrong password (${email})`);
      return res.status(404).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    logger.info(`Login successful: User ID ${user.id}`);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token: generateToken(user.id),
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName || ""}`.trim(),
        email: user.email,
        role: user.role ? user.role.name : null,
        department: user.department,
        position: user.position,
      },
    });
  } catch (error) {
    logger.error("Login error", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ✅ Get all roles
exports.getAllRoles = async (req, res) => {
  try {
    logger.info("Fetching all roles");

    const roles = await Role.findAll({
      order: [["id", "ASC"]],
    });

    res.status(200).json({
      success: true,
      count: roles.length,
      roles,
    });
  } catch (error) {
    logger.error("Error fetching roles", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch roles",
    });
  }
};
