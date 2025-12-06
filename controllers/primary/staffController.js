const fs = require("fs");
const bcrypt = require("bcryptjs");
const Staff = require("../../models/primary/Staff");
const StaffDocument = require("../../models/primary/StaffDocument");
const User = require("../../models/primary/User");
const Role = require("../../models/primary/Role");

/* ================= CREATE STAFF (STEP 1) ================= */

exports.createStaff = async (req, res) => {
  try {
    const data = req.body;

    // Hash password if provided
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    // Handle profile photo
    if (req.files?.profilePhoto) {
      data.profilePhoto = `/uploads/profile/${req.files.profilePhoto[0].filename}`;
    }

    // Parse bank details if sent as string
    data.bankDetails = data.bankDetails ? JSON.parse(data.bankDetails) : null;

    data.createdBy = req.user.id;

    // 1️⃣ Create staff entry
    const staff = await Staff.create(data);

    // 2️⃣ Create user entry for login
    // Determine role
    const roleName = data.roleName || "Staff"; // default role
    const role = await Role.findOne({ where: { name: roleName } });

    if (!role) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const user = await User.create({
      firstName: data.fullName,
      lastName: data.lastName,
      email: data.email,
      password: data.password, // already hashed
      roleId: role.id,
      department: data.department || "",
      position: data.position || "",
      phone: data.phone || "",
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      staffId: staff.id,
      userId: user.id,
    });
  } catch (err) {
    console.error("❌ Error creating staff:", err);
    res.status(500).json({ success: false, message: err.message });
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
    const staffList = await Staff.findAll({
      include: [
        {
          model: StaffDocument,
          as: "documents",
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(staffList);
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
