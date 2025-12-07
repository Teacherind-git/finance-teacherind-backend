const fs = require("fs");
const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");
const Staff = require("../../models/primary/Staff");
const StaffDocument = require("../../models/primary/StaffDocument");
const User = require("../../models/primary/User");
const Role = require("../../models/primary/Role");

/* ================= CREATE STAFF (STEP 1) ================= */
exports.createStaff = async (req, res) => {
  try {
    const data = req.body;

    // 🔍 Check if user already exists
    const existingUser = await User.findOne({ where: { email: data.email } });

    // Hash password only if we might create a user
    let hashedPassword = null;
    if (!existingUser && data.password) {
      hashedPassword = await bcrypt.hash(data.password, 10);
    }

    // Handle profile photo
    if (req.files?.profilePhoto) {
      data.profilePhoto = `/uploads/profile/${req.files.profilePhoto[0].filename}`;
    }

    // Parse bank details
    data.bankDetails = data.bankDetails ? JSON.parse(data.bankDetails) : null;

    data.createdBy = req.user.id;

    // 1️⃣ Create staff (ALWAYS)
    const staff = await Staff.create(data);

    let user = null;

    // 2️⃣ Create user ONLY if not existing
    if (!existingUser) {
      const roleName = data.roleName || "Staff";
      const role = await Role.findOne({ where: { name: roleName } });

      if (!role) {
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

    // ✅ Always success
    return res.status(201).json({
      success: true,
      message: existingUser
        ? "Staff created successfully (existing user linked)"
        : "Staff and user created successfully",
      staffId: staff.id,
      userId: user ? user.id : existingUser?.id,
    });
  } catch (err) {
    console.error("❌ Error creating staff:", err);
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
    if (!staff) return res.status(404).json({ message: "Not found" });

    let { bankDetails } = req.body;

    // ✅ convert back to object
    if (bankDetails && typeof bankDetails === "string") {
      bankDetails = JSON.parse(bankDetails);
    }

    req.body.updatedBy = req.user.id;

    await staff.update(req.body);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= UPLOAD DOCUMENTS (STEP 3) ================= */
exports.uploadDocuments = async (req, res) => {
  try {
    if (!req.files?.documents?.length) {
      return res.status(400).json({ message: "No documents uploaded" });
    }

    const staff = await Staff.findByPk(req.params.id);
    if (!staff) return res.status(404).json({ message: "Not found" });

    await StaffDocument.bulkCreate(
      req.files.documents.map((file) => ({
        staffId: staff.id,
        fileName: file.originalname,
        filePath: `/uploads/documents/${file.filename}`,
        fileType: file.mimetype,
      }))
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= GET STAFF ================= */
exports.getStaff = async (req, res) => {
  const staff = await Staff.findByPk(req.params.id, {
    include: ["documents"],
  });

  if (!staff) return res.status(404).json({ message: "Not found" });
  res.json(staff);
};

exports.getAllStaff = async (req, res) => {
  try {
    // 1️⃣ Fetch all staff
    const staffList = await Staff.findAll({
      include: [
        {
          model: StaffDocument,
          as: "documents",
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // 2️⃣ Extract emails of existing staff
    const staffEmails = staffList.map((staff) => staff.email);

    // 3️⃣ Fetch new users (roleId 3) not in staff
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

    // 4️⃣ Collect all createdBy IDs
    const createdByIds = [
      ...staffList.map((s) => s.createdBy),
      ...newUsers.map((u) => u.createdBy),
    ].filter(Boolean); // remove null/undefined

    // 5️⃣ Fetch users who created these records
    const creators = await User.findAll({
      where: { id: { [Op.in]: createdByIds } },
      attributes: ["id", "firstName", "lastName"],
    });

    const creatorMap = {};
    creators.forEach((c) => {
      creatorMap[c.id] = `${c.firstName} ${c.lastName}`;
    });

    // 6️⃣ Map staff
    const formattedStaff = staffList.map((staff) => {
      const s = staff.toJSON();
      return {
        ...s,
        createdBy: s.createdBy ? creatorMap[s.createdBy] || "Unknown" : null,
      };
    });

    // 7️⃣ Map new users
    const formattedUsers = newUsers.map((user) => {
      const u = user.toJSON();
      return {
        ...u,
        fullName: `${u.firstName} ${u.lastName}`,
        profilePhoto: "",
        roleName: u.role?.name || "",
        documents: [],
        status: u.isActive ? "Active" : "Inactive",
        createdBy: u.createdBy ? creatorMap[u.createdBy] || "Unknown" : null,
      };
    });

    // 8️⃣ Combine both
    const combinedList = [...formattedStaff, ...formattedUsers];

    res.status(200).json(combinedList);
  } catch (error) {
    console.error("Get staff error:", error);
    res.status(500).json({ message: "Failed to fetch staff" });
  }
};

/* ================= DELETE STAFF ================= */
exports.deleteStaff = async (req, res) => {
  const staff = await Staff.findByPk(req.params.id, {
    include: ["documents"],
  });
  if (!staff) return res.status(404).json({ message: "Not found" });

  if (staff.profilePhoto) {
    fs.unlinkSync(`public${staff.profilePhoto}`);
  }

  staff.documents.forEach((doc) => {
    fs.unlinkSync(`public${doc.filePath}`);
  });

  await staff.destroy();
  res.json({ success: true });
};

/* ================= DELETE DOCUMENT ================= */
exports.deleteDocument = async (req, res) => {
  const doc = await StaffDocument.findByPk(req.params.docId);
  if (!doc) return res.status(404).json({ message: "Not found" });

  fs.unlinkSync(`public${doc.filePath}`);
  await doc.destroy();
  res.json({ success: true });
};
