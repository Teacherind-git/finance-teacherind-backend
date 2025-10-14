const User = require("../models/User");
const jwt = require("jsonwebtoken");
const Role = require("../models/Role");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

// ✅ Register new user
exports.register = async (req, res) => {
  try {
    const { name, email, password, roleName } = req.body;

    if (!name || !email || !password || !roleName) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const role = await Role.findOne({ name: roleName });
    if (!role)
      return res.status(400).json({ success: false, message: "Invalid role" });

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const user = await User.create({ name, email, password, role: role._id });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: role.name,
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).populate("role");

    if (user && (await user.matchPassword(password))) {
      res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          token: generateToken(user._id),
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            position: user.position,
          },
        },
      });
    } else {
      res
        .status(404)
        .json({ success: false, message: "Invalid email or password" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
