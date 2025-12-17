require("dotenv").config();
const admin = require("firebase-admin");
const path = require("path");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { Sequelize, DataTypes } = require("sequelize");
const logger = require("../../utils/logger");

// ✅ IMPORT EXISTING USER MODEL
const User = require("../../models/primary/User");

// ===============================
// 🔥 Firebase Setup
// ===============================
if (!admin.apps.length) {
  const serviceAccount = require(path.join(
    __dirname,
    "firebaseServiceAccountKey.json"
  ));

  admin.initializeApp(
    {
      credential: admin.credential.cert(serviceAccount),
      storageBucket: "teacherind-b9eb6.firebasestorage.app",
    },
    "app1"
  );

  logger.info("✅ Firebase initialized successfully");
}

const db = getFirestore(admin.app("app1"));
const storage = getStorage(admin.app("app1"));

// ===============================
// 🧱 Sequelize MySQL Setup
// ===============================
const sequelize = new Sequelize(
  process.env.MYSQL_DB || "teacherind_finanace",
  process.env.MYSQL_USER || "root",
  process.env.MYSQL_PASSWORD || "Thanseem@8547",
  {
    host: process.env.MYSQL_HOST || "localhost",
    dialect: "mysql",
    logging: false,
  }
);

// ===============================
// 🔍 Fetch Admin User ID
// ===============================
async function getAdminUserId() {
  const adminUser = await User.findOne({
    where: { roleId: 1 },
    attributes: ["id"],
  });

  if (!adminUser) {
    throw new Error("❌ Admin user (roleId = 1) not found in users table");
  }

  return adminUser.id;
}

// ===============================
// 🚀 Migration Function
// ===============================
const excludedCollections = ["users", "questions", "modules", "sections"];

async function migrateCollection(collectionName, adminUserId) {
  logger.info(`🚀 Migrating collection: ${collectionName}`);

  const snapshot = await db.collection(collectionName).get();
  if (snapshot.empty) {
    logger.warn(`⚠️ No documents found in '${collectionName}'`);
    return;
  }

  const docs = [];
  const allFields = {};

  snapshot.forEach((doc) => {
    const data = doc.data();
    const cleanedData = {};

    Object.keys(data).forEach((key) => {
      let value = data[key];

      // 🧹 Clean strings
      if (typeof value === "string") {
        value = value.trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
      }

      // 🕒 Firestore Timestamp → Date
      if (value instanceof admin.firestore.Timestamp) {
        value = value.toDate();
      }

      cleanedData[key] = value;

      // 🔍 Detect field type
      if (!allFields[key]) {
        if (typeof value === "string") {
          allFields[key] = DataTypes.STRING;
        } else if (typeof value === "number") {
          allFields[key] = Number.isInteger(value)
            ? DataTypes.INTEGER
            : DataTypes.FLOAT;
        } else if (value instanceof Date) {
          allFields[key] = DataTypes.DATE;
        } else if (Array.isArray(value) || typeof value === "object") {
          allFields[key] = DataTypes.JSON;
        } else {
          allFields[key] = DataTypes.STRING;
        }
      }
    });

    docs.push({
      firebase_id: doc.id,
      ...cleanedData,
      createdBy: adminUserId,
      updatedBy: adminUserId,
    });
  });

  // ===============================
  // 🏗️ Dynamic Sequelize Model
  // ===============================
  const modelAttributes = {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    firebase_id: { type: DataTypes.STRING, allowNull: false },

    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  };

  Object.keys(allFields).forEach((field) => {
    modelAttributes[field] = { type: allFields[field] };
  });

  const DynamicModel = sequelize.define(collectionName, modelAttributes, {
    tableName: collectionName,
    timestamps: true,
  });

  await DynamicModel.sync({ alter: true });

  for (const record of docs) {
    await DynamicModel.upsert(record);
  }

  logger.info(`✅ ${docs.length} records migrated from '${collectionName}'`);
}

// ===============================
// 🏁 Main Runner
// ===============================
async function main() {
  try {
    await sequelize.authenticate();
    logger.info("✅ Connected to MySQL database");

    const adminUserId = await getAdminUserId();
    logger.info(`👤 Admin User ID resolved: ${adminUserId}`);

    const collections = [
      "classes",
      "modules",
      "sections",
      "subjects",
      "syllabus",
    ];

    for (const name of collections) {
      if (!excludedCollections.includes(name)) {
        await migrateCollection(name, adminUserId);
      }
    }

    logger.info("🎉 Migration completed successfully");
  } catch (error) {
    logger.error("❌ Migration failed", {
      message: error.message,
      stack: error.stack,
    });
  } finally {
    await sequelize.close();
    logger.info("🔒 MySQL connection closed");
  }
}

main();
