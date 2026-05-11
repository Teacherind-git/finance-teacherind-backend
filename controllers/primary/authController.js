const User = require("../../models/primary/User");
const Role = require("../../models/primary/Role");
const jwt = require("jsonwebtoken");
const logger = require("../../utils/logger");
const crypto = require("crypto");
const sendMail = require("../../utils/sendMail");

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
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 🔒 CHECK: isDeleted
    if (user.isDeleted) {
      logger.warn(`Login blocked (deleted user): ${email}`);
      return res.status(400).json({
        success: false,
        code: "ACCOUNT_DELETED",
        message: "Your account has been deleted. Please contact administrator.",
      });
    }

    // 🔒 CHECK: status
    if (user.status === "Inactive") {
      logger.warn(`Login blocked (inactive user): ${email}`);
      return res.status(400).json({
        success: false,
        code: "ACCOUNT_INACTIVE",
        message: "Your account is inactive. Please contact administrator.",
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({
        // ✅ changed from 401 → 400
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
    res.status(400).json({
      // ✅ optional: also changed from 500 → 400
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
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    logger.info(`Forgot password request: ${email}`);

    const user = await User.findOne({
      where: { email },
    });

    // SECURITY:
    // don't reveal if user exists
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If account exists, reset email sent",
      });
    }

    // GENERATE TOKEN
    const resetToken = crypto.randomBytes(32).toString("hex");

    // HASH TOKEN
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // SAVE TOKEN
    user.resetPasswordToken = hashedToken;

    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

    await user.save();

    // RESET URL
    const resetUrl =
      `${process.env.FRONTEND_URL}` + `/reset-password?token=${resetToken}`;

    // SEND EMAIL
    await sendMail(
      user.email,
      "Reset Password",
      `
      <div style="font-family:sans-serif">
        <h2>Reset Password</h2>

        <p>
          Click the link below to reset your password:
        </p>

        <a href="${resetUrl}">
          ${resetUrl}
        </a>

        <p>
          This link expires in 15 minutes.
        </p>
      </div>
      `,
    );

    logger.info(`Reset password email sent: ${email}`);

    return res.status(200).json({
      success: true,
      message: "Reset email sent",
    });
  } catch (error) {
    logger.error("Forgot password error", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    logger.info("Reset password attempt");

    // HASH TOKEN
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      where: {
        resetPasswordToken: hashedToken,
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    // CHECK EXPIRY
    if (new Date(user.resetPasswordExpire) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Reset token expired",
      });
    }

    // UPDATE PASSWORD
    user.password = password;

    // CLEAR TOKEN
    user.resetPasswordToken = null;

    user.resetPasswordExpire = null;

    await user.save();

    logger.info(`Password reset successful: ${user.email}`);

    return res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    logger.error("Reset password error", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
