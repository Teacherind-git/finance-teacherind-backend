// scripts/migrateTutors.js

const { Op } = require("sequelize");

const SecondaryUser = require("../../models/secondary/User");
const Tutor = require("../../models/primary/Tutor");
const PrimaryUser = require("../../models/primary/User");

async function migrateTutors() {
  try {
    console.log("Starting tutor migration...");

    /* ===============================
       GET SUPER ADMIN USER
    ================================ */
    const adminUser = await PrimaryUser.findOne({
      where: { roleId: 1 },
      attributes: ["id"],
      raw: true,
    });

    if (!adminUser) {
      console.log("Super admin not found");
      process.exit();
    }

    /* ===============================
       FETCH ALL TUTORS FROM SECONDARY DB
       role = 3
    ================================ */
    const users = await SecondaryUser.findAll({
      where: {
        role: 3,
      },
    });

    console.log(`Found ${users.length} tutors`);

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of users) {
      try {
        /* ===============================
           CHECK EXISTING
        ================================ */
        const existingTutor = await Tutor.findOne({
          where: {
            [Op.or]: [
              { email: user.email || "" },
              { employeeId: user.admissionno || "" },
            ],
          },
        });

        if (existingTutor) {
          console.log(
            `Skipped: ${user.fullname || user.name} already exists`
          );
          skipped++;
          continue;
        }

        /* ===============================
           PREPARE DATA
        ================================ */
        const tutorData = {
          fullName: user.fullname || user.name || "Unknown",

          employeeId:
            user.admissionno ||
            `EMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,

          age: user.age || "0",

          // use existing created_at if available
          joinDate: user.created_at
            ? new Date(user.created_at)
            : new Date(),

          gender: "Male",

          status: user.status === 1 ? "Active" : "Inactive",

          email:
            user.email ||
            `noemail_${Date.now()}_${Math.floor(
              Math.random() * 10000
            )}@example.com`,

          phone: user.phone || "",

          address: user.location || "",

          reportingManager: "",

          qualification: user.qualification || "Not Specified",

          roleName: "Tutor",

          department: "Teaching",

          position: "Tutor",

          /* ===============================
             SALARY
          ================================ */
          workStatus: "Full Time",
          salaryType: "Monthly",
          paymentFreq: "Monthly",
          currentSalary: "0",

          bankDetails: {},

          /* ===============================
             TEACHING DETAILS
          ================================ */
          teachingDetails: [
            {
              className: user.classes || "",
              subject: user.subjects || "",
              syllabus: "",
            },
          ],

          /* ===============================
             EQUIPMENT
          ================================ */
          hasLaptop: false,
          hasWhiteBoard: false,
          hasDigitalPen: false,
          hasMobile: true,

          /* ===============================
             LANGUAGES
          ================================ */
          languages: ["English"],

          /* ===============================
             AVAILABILITY
          ================================ */
          availableDays: [],
          availabilitySlots: [],

          /* ===============================
             ADDITIONAL DETAILS
          ================================ */
          experience: "",
          preferredLocation: user.location || "",
          shortBio: "",

          /* ===============================
             DOCUMENTS
          ================================ */
          documents: [],

          /* ===============================
             SYSTEM
          ================================ */
          isDeleted: false,

          // ✅ SUPER ADMIN
          createdBy: adminUser.id,
          updatedBy: adminUser.id,
        };

        /* ===============================
           CREATE TUTOR
        ================================ */
        await Tutor.create(tutorData);

        console.log(
          `Created tutor: ${tutorData.fullName} (${tutorData.email})`
        );

        created++;
      } catch (error) {
        failed++;

        console.error(
          `Failed migrating user ${user.id}:`,
          error.message
        );
      }
    }

    console.log("\n=================================");
    console.log("Migration Completed");
    console.log("=================================");
    console.log(`Created : ${created}`);
    console.log(`Skipped : ${skipped}`);
    console.log(`Failed  : ${failed}`);
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    process.exit();
  }
}

migrateTutors();