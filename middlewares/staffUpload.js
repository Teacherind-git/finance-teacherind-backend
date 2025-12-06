const multer = require("multer");
const path = require("path");
const fs = require("fs");

const ensureDirExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination(req, file, cb) {
    let uploadPath = "public/uploads/documents";

    if (file.fieldname === "profilePhoto") {
      uploadPath = "public/uploads/profile";
    }

    // ✅ ensure folder exists
    ensureDirExists(uploadPath);

    cb(null, uploadPath);
  },

  filename(req, file, cb) {
    const cleanName = file.originalname.replace(/\s+/g, "");
    cb(null, `${Date.now()}-${cleanName}`);
  },
});

module.exports = multer({ storage });
