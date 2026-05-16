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

    ensureDirExists(uploadPath);

    cb(null, uploadPath);
  },

  filename(req, file, cb) {
    // ✅ Get original extension
    const ext = path.extname(file.originalname);

    // ✅ Get filename without extension
    const name = path.basename(file.originalname, ext);

    // ✅ Clean filename (optional)
    const cleanName = name.replace(/\s+/g, "_");

    // ✅ Final filename
    cb(null, `${cleanName}${ext}`);
  },
});

module.exports = multer({ storage });