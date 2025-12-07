const fs = require("fs");
const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");
const Staff = require("../../models/primary/Staff");
const StaffDocument = require("../../models/primary/StaffDocument");
const User = require("../../models/primary/User");
const Role = require("../../models/primary/Role");
const logger = require("../../utils/logger");

/* ================= CREATE STAFF (STEP 1) ================= */
exports.createStaff = async (req, res) => {
  try {
    const data = req.body;

    logger.info("Creating staff", {
      email: data.email,
      createdBy: req.user.id,
    });

    const existingUser = await User.findOne({
      where: { email: data.email },
    });

    let hashedPassword = null;
    if (!existingUser && data.password) {
      hashedPassword = await bcrypt.hash(data.password, 10);
    }

    if (req.files?.profilePhoto) {
      data.profilePhoto = `/uploads/profile/${req.files.profilePhoto[0].filename}`;
    }

    data.bankDetails = data.bankDetails
      ? JSON.parse(data.bankDetails)
      : null;

    data.createdBy = req.user.id;

    const staff = await Staff.create(data);

    let user = null;

    if (!existingUser) {
      const roleName = data.roleName || "Staff";
      const role = await Role.findOne({ where: { name: roleName } });

      if (!role) {
        logger.warn(`Invalid role during staff creation: ${roleName}`);
        return res.status(400).json({
          success: false,
          message: "Invalid role",
        });
      }

      user = await User.create({
        firstName: data.fullName,
        lastName: data.lastName,
        email: data.email,
        password: hashedPassword,
        roleId: role.id,
        department: data.department || "",
        position: data.position || "",
        phone: data.phone || "",
        createdBy: req.user.id,
        updatedBy: req.user.id,
      });
    }

    logger.info("Staff created successfully", {
      staffId: staff.id,
      userId: user ? user.id : existingUser?.id,
    });

    return res.status(201).json({
      success: true,
      message: existingUser
        ? "Staff created successfully (existing user linked)"
        : "Staff and user created successfully",
      staffId: staff.id,
      userId: user ? user.id : existingUser?.id,
    });
  } catch (err) {
    logger.error("Error creating staff", err);
    res.status(500).json({
      success: false,
      message: "Failed to create staff",
    });
  }
};

/* ================= UPDATE STAFF (STEP 2) ================= */
exports.updateStaff = async (req, res) => {
  try {
    const staff = await Staff.findByPk(req.params.id);
    if (!staff) {
      logger.warn(`Staff not found for update: ${req.params.id}`);
      return res.status(404).json({ message: "Not found" });
    }

    let { bankDetails } = req.body;
    if (bankDetails && typeof bankDetails === "string") {
      bankDetails = JSON.parse(bankDetails);
      req.body.bankDetails = bankDetails;
    }

    req.body.updatedBy = req.user.id;

    await staff.update(req.body);

    logger.info("Staff updated", {
      staffId: staff.id,
      updatedBy: req.user.id,
    });

    res.json({ success: true });
  } catch (err) {
    logger.error("Error updating staff", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ================= UPLOAD DOCUMENTS (STEP 3) ================= */
exports.uploadDocuments = async (req, res) => {
  try {
    if (!req.files?.documents?.length) {
      logger.warn("No documents uploaded");
      return res.status(400).json({ message: "No documents uploaded" });
    }

    const staff = await Staff.findByPk(req.params.id);
    if (!staff) {
      logger.warn(`Staff not found for document upload: ${req.params.id}`);
      return res.status(404).json({ message: "Not found" });
    }

    await StaffDocument.bulkCreate(
      req.files.documents.map((file) => ({
        staffId: staff.id,
        fileName: file.originalname,
        filePath: `/uploads/documents/${file.filename}`,
        fileType: file.mimetype,
      }))
    );

    logger.info("Staff documents uploaded", {
      staffId: staff.id,
      count: req.files.documents.length,
    });

    res.json({ success: true });
  } catch (err) {
    logger.error("Error uploading staff documents", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ================= GET STAFF ================= */
exports.getStaff = async (req, res) => {
  const staff = await Staff.findByPk(req.params.id, {
    include: ["documents"],
  });

  if (!staff) {
    logger.warn(`Staff not found: ${req.params.id}`);
    return res.status(404).json({ message: "Not found" });
  }

  res.json(staff);
};

/* ================= GET ALL STAFF ================= */
exports.getAllStaff = async (req, res) => {
  try {
    logger.info("Fetching all staff");

    const staffList = await Staff.findAll({
      include: [{ model: StaffDocument, as: "documents" }],
      order: [["createdAt", "DESC"]],
    });

    const staffEmails = staffList.map((staff) => staff.email);

    const newUsers = await User.findAll({
      where: {
        roleId: 3,
        email: { [Op.notIn]: staffEmails },
      },
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["name"],
        },
      ],
      attributes: [
        "id",
        "firstName",
        "lastName",
        "email",
        "createdAt",
        "updatedAt",
        "department",
        "position",
        "isActive",
        "createdBy",
      ],
    });

    const createdByIds = [
      ...staffList.map((s) => s.createdBy),
      ...newUsers.map((u) => u.createdBy),
    ].filter(Boolean);

    const creators = await User.findAll({
      where: { id: { [Op.in]: createdByIds } },
      attributes: ["id", "firstName", "lastName"],
    });

    const creatorMap = {};
    creators.forEach((c) => {
      creatorMap[c.id] = `${c.firstName} ${c.lastName}`;
    });

    const formattedStaff = staffList.map((s) => ({
      ...s.toJSON(),
      createdBy: s.createdBy
        ? creatorMap[s.createdBy] || "Unknown"
        : null,
    }));

    const formattedUsers = newUsers.map((u) => ({
      ...u.toJSON(),
      fullName: `${u.firstName} ${u.lastName}`,
      profilePhoto: "",
      roleName: u.role?.name || "",
      documents: [],
      status: u.isActive ? "Active" : "Inactive",
      createdBy: u.createdBy
        ? creatorMap[u.createdBy] || "Unknown"
        : null,
    }));

    const combinedList = [...formattedStaff, ...formattedUsers];

    logger.info("Staff list fetched", {
      staffCount: formattedStaff.length,
      newUsers: formattedUsers.length,
    });

    res.status(200).json(combinedList);
  } catch (error) {
    logger.error("Error fetching staff list", error);
    res.status(500).json({ message: "Failed to fetch staff" });
  }
};

/* ================= DELETE STAFF ================= */
exports.deleteStaff = async (req, res) => {
  const staff = await Staff.findByPk(req.params.id, {
    include: ["documents"],
  });

  if (!staff) {
    logger.warn(`Staff not found for delete: ${req.params.id}`);
    return res.status(404).json({ message: "Not found" });
  }

  if (staff.profilePhoto) {
    fs.unlinkSync(`public${staff.profilePhoto}`);
  }

  staff.documents.forEach((doc) => {
    fs.unlinkSync(`public${doc.filePath}`);
  });

  await staff.destroy();

  logger.info("Staff deleted", { staffId: staff.id });

  res.json({ success: true });
};

/* ================= DELETE DOCUMENT ================= */
exports.deleteDocument = async (req, res) => {
  const doc = await StaffDocument.findByPk(req.params.docId);
  if (!doc) {
    logger.warn(`Document not found: ${req.params.docId}`);
    return res.status(404).json({ message: "Not found" });
  }

  fs.unlinkSync(`public${doc.filePath}`);
  await doc.destroy();

  logger.info("Staff document deleted", {
    documentId: doc.id,
    staffId: doc.staffId,
  });

  res.json({ success: true });
};
