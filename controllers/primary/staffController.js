const fs = require("fs");
const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");
const Staff = require("../../models/primary/Staff");
const StaffDocument = require("../../models/primary/StaffDocument");
const User = require("../../models/primary/User");
const Role = require("../../models/primary/Role");
const StaffPayroll = require("../../models/primary/StaffPayroll");
const logger = require("../../utils/logger");
const SecondaryUser = require("../../models/secondary/User");
const { getPaginationParams } = require("../../utils/pagination");


/* ================= CREATE STAFF (STEP 1) ================= */
exports.createStaff = async (req, res) => {
  try {
    const data = req.body;

    logger.info("Creating staff", {
      email: data.email,
      createdBy: req.user.id,
    });

    // ✅ Check existing user
    const existingUser = await User.findOne({
      where: { email: data.email },
    });

    let hashedPassword = null;
    if (!existingUser && data.password) {
      hashedPassword = await bcrypt.hash(data.password, 10);
    }

    // ✅ Profile photo upload
    if (req.files?.profilePhoto) {
      data.profilePhoto = `/uploads/profile/${req.files.profilePhoto[0].filename}`;
    }

    // ✅ Parse bank details
    data.bankDetails = data.bankDetails ? JSON.parse(data.bankDetails) : null;

    data.createdBy = req.user.id;

    // ✅ Create staff
    const staff = await Staff.create(data);

    // ✅ Create default payroll immediately
    await StaffPayroll.findOrCreate({
      where: {
        staffId: staff.id,
      },
      defaults: {
        createdBy: req.user.id,
      },
    });

    let user = null;

    // ✅ Create user if not existing
    if (!existingUser) {
      const roleName = data.roleName || "Staff";

      const role = await Role.findOne({
        where: { name: roleName },
      });

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

/* ================= DELETE STAFF ================= */
exports.deleteStaff = async (req, res) => {
  try {
    logger.info("Soft deleting staff", {
      staffId: req.params.id,
      deletedBy: req.user?.id,
    });

    const staff = await Staff.findOne({
      where: {
        id: req.params.id,
        isDeleted: false,
      },
      include: ["documents"],
    });

    if (!staff) {
      logger.warn(`Staff not found for delete: ${req.params.id}`);
      return res.status(404).json({ message: "Not found" });
    }

    await staff.update({
      isDeleted: true,
      isActive: false, // ✅ optional (if exists)
      updatedBy: req.user?.id || null,
    });

    logger.info("Staff soft deleted", {
      staffId: staff.id,
    });

    res.json({ success: true, message: "Staff deleted successfully" });
  } catch (error) {
    logger.error("Error soft deleting staff", error);
    res.status(500).json({ message: "Failed to delete staff" });
  }
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

/* ================= GET ALL STAFF ================= */
exports.getAllStaff = async (req, res) => {
  try {
    logger.info("Fetching all staff");

    const { page, limit, sortBy, sortOrder } = getPaginationParams(
      req,
      [
        "fullName",
        "email",
        "createdAt",
        "updatedAt",
        "department",
        "position",
        "status",
      ],
      "updatedAt"
    );

    const staffList = await Staff.findAll({
      where: { isDeleted: false },
      include: [{ model: StaffDocument, as: "documents" }],
    });

    const staffEmails = staffList.map((s) => s.email);

    const newUsers = await User.findAll({
      where: {
        roleId: 3,
        isDeleted: false,
        email: { [Op.notIn]: staffEmails },
      },
      include: [{ model: Role, as: "role", attributes: ["name"] }],
    });

    const createdByIds = [
      ...staffList.map((s) => s.createdBy),
      ...newUsers.map((u) => u.createdBy),
    ].filter(Boolean);

    const creators = await User.findAll({
      where: { id: { [Op.in]: createdByIds }, isDeleted: false },
      attributes: ["id", "firstName", "lastName"],
    });

    const creatorMap = {};
    creators.forEach((c) => {
      creatorMap[c.id] = `${c.firstName} ${c.lastName}`;
    });

    const formattedStaff = staffList.map((s) => ({
      ...s.toJSON(),
      fullName: s.fullName || s.fullname || "",
      roleName: "Staff",
      createdBy: s.createdBy ? creatorMap[s.createdBy] || "Unknown" : null,
    }));

    const formattedUsers = newUsers.map((u) => ({
      ...u.toJSON(),
      fullName: `${u.firstName} ${u.lastName}`,
      roleName: u.role?.name || "",
      documents: [],
      status: u.status ? "Active" : "Inactive",
      createdBy: u.createdBy ? creatorMap[u.createdBy] || "Unknown" : null,
    }));

    let combinedList = [...formattedStaff, ...formattedUsers];

    combinedList.sort((a, b) => {
      const A = a[sortBy];
      const B = b[sortBy];
      if (!A) return 1;
      if (!B) return -1;
      return sortOrder === "ASC" ? (A > B ? 1 : -1) : A < B ? 1 : -1;
    });

    const totalRecords = combinedList.length;
    const start = (page - 1) * limit;
    const paginatedData = combinedList.slice(start, start + limit);

    return res.status(200).json({
      success: true,
      data: paginatedData,
      pagination: {
        totalRecords,
        currentPage: page,
        pageSize: limit,
        totalPages: Math.ceil(totalRecords / limit),
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    logger.error("Error fetching staff list", error);
    return res.status(500).json({ message: "Failed to fetch staff" });
  }
};

/* ================= GET ALL TUTORS ================= */
exports.getAllTutors = async (req, res) => {
  try {
    logger.info("Fetching all tutors");

    const { page, limit, offset, sortBy, sortOrder } = getPaginationParams(
      req,
      ["id", "fullName", "email", "status"],
      "id"
    );

    const { count, rows } = await SecondaryUser.findAndCountAll({
      where: { role: 3 },
      attributes: ["id", "fullName", "email", "phone", "status"],
      limit,
      offset,
      order: [[sortBy, sortOrder]],
      raw: true,
    });

    const formattedTutors = rows.map((tutor) => ({
      id: tutor.id,
      fullName: tutor.fullName,
      email: tutor.email,
      phone: tutor.phone,
      position: "Tutor",
      department: "Teaching",
      status: tutor.status === 1 ? "Active" : "Inactive",
    }));

    return res.status(200).json({
      success: true,
      data: formattedTutors,
      pagination: {
        totalRecords: count,
        currentPage: page,
        pageSize: limit,
        totalPages: Math.ceil(count / limit),
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    logger.error("Error fetching tutor list", error);
    return res.status(500).json({ success: false, message: "Failed to fetch tutors" });
  }
};

/* ================= GET ALL COUNSELORS ================= */
exports.getAllCounselors = async (req, res) => {
  try {
    logger.info("Fetching all counselors");

    const { page, limit, offset, sortBy, sortOrder } = getPaginationParams(
      req,
      ["id", "fullName", "email", "status"],
      "id"
    );

    const { count, rows } = await SecondaryUser.findAndCountAll({
      where: { role: 2 },
      attributes: ["id", "fullName", "email", "phone", "status"],
      limit,
      offset,
      order: [[sortBy, sortOrder]],
      raw: true,
    });

    const formattedCounselors = rows.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      email: c.email,
      phone: c.phone,
      position: "Counselor",
      department: "Academic",
      status: c.status === 1 ? "Active" : "Inactive",
    }));

    return res.status(200).json({
      success: true,
      data: formattedCounselors,
      pagination: {
        totalRecords: count,
        currentPage: page,
        pageSize: limit,
        totalPages: Math.ceil(count / limit),
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    logger.error("Error fetching counselor list", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch counselors" });
  }
};

