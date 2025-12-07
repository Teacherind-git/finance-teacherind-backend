const User = require("../../models/primary/User");
const Role = require("../../models/primary/Role");
const { Op } = require("sequelize");
const logger = require("../../utils/logger");

/* ================= GET ALL USERS ================= */
exports.getAllUsers = async (req, res) => {
  try {
    const { type } = req.query;

    logger.info("Fetching users", {
      requestedBy: req.user.id,
      role: req.user.role?.name,
      type,
    });

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

    /* ---------- Normal User ---------- */
    if (req.user.role.name === "User") {
      whereCondition = { createdBy: req.user.id };
    }

    /* ---------- SuperAdmin ---------- */
    if (req.user.role.name === "SuperAdmin") {
      if (type === "SuperAdmin") {
        whereCondition = { createdBy: req.user.id };
      } else if (type === "Others") {
        whereCondition = { createdBy: { [Op.ne]: req.user.id } };
      }
    }

    const users = await User.findAll({
      where: whereCondition,
      attributes: { exclude: ["password"] },
      include: commonInclude,
      order: [["id", "ASC"]],
    });

    const usersWithCreatorName = users.map((u) => {
      const json = u.toJSON();
      json.creatorName = u.creator
        ? `${u.creator.firstName} ${u.creator.lastName}`.trim()
        : null;
      return json;
    });

    logger.info(`Users fetched: ${users.length}`);

    res.status(200).json({
      success: true,
      users: usersWithCreatorName,
    });
  } catch (error) {
    logger.error("Error fetching users", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ================= CREATE USER ================= */
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

    logger.info("Creating user", {
      email,
      roleName,
      createdBy: req.user.id,
    });

    const role = await Role.findOne({ where: { name: roleName } });
    if (!role) {
      logger.warn("Invalid role during user creation", { roleName });
      return res
        .status(400)
        .json({ success: false, message: "Invalid role" });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      logger.warn("Duplicate user email", { email });
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });
    }

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
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    logger.info("User created successfully", { userId: user.id });

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    logger.error("Error creating user", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ================= UPDATE USER ================= */
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

    logger.info("Updating user", {
      userId: req.params.id,
      updatedBy: req.user.id,
    });

    const user = await User.findByPk(req.params.id);
    if (!user) {
      logger.warn("User not found for update", { id: req.params.id });
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (roleName) {
      const role = await Role.findOne({ where: { name: roleName } });
      if (!role)
        return res
          .status(400)
          .json({ success: false, message: "Invalid role" });
      user.roleId = role.id;
    }

    user.firstName = firstName ?? user.firstName;
    user.lastName = lastName ?? user.lastName;
    user.email = email ?? user.email;
    user.department = department ?? user.department;
    user.position = position ?? user.position;
    user.phone = phone ?? user.phone;
    user.taxId = taxId ?? user.taxId;

    if (address) {
      user.address = { ...user.address, ...address };
    }

    user.updatedBy = req.user.id;

    await user.save();

    logger.info("User updated", { userId: user.id });

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    logger.error("Error updating user", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ================= DELETE USER ================= */
exports.deleteUser = async (req, res) => {
  try {
    logger.info("Deleting user", {
      userId: req.params.id,
      deletedBy: req.user.id,
    });

    const user = await User.findByPk(req.params.id);
    if (!user) {
      logger.warn("User not found for delete", { id: req.params.id });
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await user.destroy();

    logger.info("User deleted", { userId: req.params.id });

    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    logger.error("Error deleting user", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
