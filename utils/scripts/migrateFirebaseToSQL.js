require("dotenv").config();
const admin = require("firebase-admin");
const path = require("path");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { Sequelize, DataTypes } = require("sequelize");

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

  console.log("✅ Firebase initialized successfully");
}

const db = getFirestore(admin.app("app1"));
const storage = getStorage(admin.app("app1"));

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
// 🚀 Migration Function
// ===============================
const excludedCollections = ["users", "questions", "modules", "sections"];

async function migrateCollection(collectionName) {
  console.log(`\n🚀 Migrating collection: ${collectionName}`);

  const snapshot = await db.collection(collectionName).get();
  if (snapshot.empty) {
    console.log(`⚠️ No documents found in '${collectionName}'`);
    return;
  }

  const docs = [];
  const allFields = {};

  snapshot.forEach((doc) => {
    const data = doc.data();
    const cleanedData = {};

    Object.keys(data).forEach((key) => {
      let value = data[key];

      // CLEAN STRING FIELDS
      if (typeof value === "string") {
        value = value.trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.substring(1, value.length - 1);
        }
      }

      cleanedData[key] = value;

      // Detect data type
      if (!allFields[key]) {
        if (typeof value === "string") {
          allFields[key] = DataTypes.STRING;
        } else if (typeof value === "number") {
          allFields[key] = Number.isInteger(value)
            ? DataTypes.INTEGER
            : DataTypes.FLOAT;
        } else if (value instanceof admin.firestore.Timestamp) {
          allFields[key] = DataTypes.DATE;
          cleanedData[key] = value.toDate();
        } else if (Array.isArray(value) || typeof value === "object") {
          allFields[key] = DataTypes.JSON;
        } else {
          allFields[key] = DataTypes.STRING; // fallback
        }
      }
    });

    docs.push({ firebase_id: doc.id, ...cleanedData });
  });

  // Build sequelize model
  const modelAttributes = {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    firebase_id: { type: DataTypes.STRING, allowNull: false },
  };

  Object.keys(allFields).forEach((field) => {
    modelAttributes[field] = { type: allFields[field] };
  });

  const DynamicModel = sequelize.define(collectionName, modelAttributes, {
    tableName: collectionName,
    timestamps: true,
  });

  await DynamicModel.sync();

  for (const doc of docs) {
    await DynamicModel.upsert(doc);
  }

  console.log(`✅ ${docs.length} records migrated from '${collectionName}'`);
}

// ===============================
// 🏁 Main Migration Runner
// ===============================
async function main() {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to MySQL database.");

    const collections = [
      "classes",
      "modules",
      "sections",
      "subjects",
      "syllabus",
    ];

    for (const name of collections) {
      if (!excludedCollections.includes(name)) {
        await migrateCollection(name);
      }
    }

    console.log("\n🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await sequelize.close();
    console.log("🔒 MySQL connection closed.");
  }
}

main();
