const { sequelizePrimary } = require("../../config/db");

const BasePay = require("../../models/primary/BasePay");
const ClassRange = require("../../models/primary/ClassRange");
const Syllabus = require("../../models/primary/Syllabus");

async function seedBasePay() {
  try {
    console.log("Starting BasePay Seeder...");

    await sequelizePrimary.authenticate();

    const classRanges = await ClassRange.findAll({ where: { isDeleted: false } });
    const syllabuses = await Syllabus.findAll();

    // =========================
    // CLASS RANGE MAP
    // =========================

    const classMap = {};

    classRanges.forEach((c) => {
      const key = `${c.fromClass}-${c.toClass}`;
      classMap[key] = c.id;
    });

    console.log("ClassMap:", classMap);

    // =========================
    // SYLLABUS MAP
    // =========================

    const syllabusMap = {};

    syllabuses.forEach((s) => {
      syllabusMap[s.name] = s.id;
    });

    console.log("SyllabusMap:", syllabusMap);

    const classLabels = ["1-4", "5-7", "8-10", "11-12"];

    // =========================
    // BASE PAY CONFIG
    // =========================

    const basePayConfig = [
      // SLAB 1
      {
        slab: "slab1",
        board: "White Board",
        syllabus: ["CBSE", "State"],
        values: [125, 135, 150, 170],
      },
      {
        slab: "slab1",
        board: "White Board",
        syllabus: ["ICSE", "IGCSE"],
        values: [135, 145, 160, 180],
      },
      {
        slab: "slab1",
        board: "Pen Tab",
        syllabus: ["CBSE", "State"],
        values: [131, 141, 156, 176],
      },
      {
        slab: "slab1",
        board: "Pen Tab",
        syllabus: ["ICSE", "IGCSE"],
        values: [141, 151, 166, 186],
      },

      // SLAB 2
      {
        slab: "slab2",
        board: "White Board",
        syllabus: ["CBSE", "State"],
        values: [135, 145, 160, 180],
      },
      {
        slab: "slab2",
        board: "White Board",
        syllabus: ["ICSE", "IGCSE"],
        values: [145, 155, 170, 190],
      },
      {
        slab: "slab2",
        board: "Pen Tab",
        syllabus: ["CBSE", "State"],
        values: [141, 151, 166, 186],
      },
      {
        slab: "slab2",
        board: "Pen Tab",
        syllabus: ["ICSE", "IGCSE"],
        values: [151, 161, 176, 196],
      },

      // SLAB 3
      {
        slab: "slab3",
        board: "White Board",
        syllabus: ["CBSE", "State"],
        values: [145, 155, 170, 190],
      },
      {
        slab: "slab3",
        board: "White Board",
        syllabus: ["ICSE", "IGCSE"],
        values: [155, 165, 180, 200],
      },
      {
        slab: "slab3",
        board: "Pen Tab",
        syllabus: ["CBSE", "State"],
        values: [151, 161, 176, 196],
      },
      {
        slab: "slab3",
        board: "Pen Tab",
        syllabus: ["ICSE", "IGCSE"],
        values: [161, 171, 186, 206],
      },
    ];

    let createdCount = 0;

    // =========================
    // INSERT LOOP
    // =========================

    for (const config of basePayConfig) {
      for (let i = 0; i < classLabels.length; i++) {
        const classLabel = classLabels[i];
        const classRangeId = classMap[classLabel];

        if (!classRangeId) {
          console.log("❌ Missing ClassRange:", classLabel);
          continue;
        }

        for (const syllabusName of config.syllabus) {
          const syllabusId = syllabusMap[syllabusName];

          if (!syllabusId) {
            console.log("❌ Missing Syllabus:", syllabusName);
            continue;
          }

          const [record, created] = await BasePay.findOrCreate({
            where: {
              slab: config.slab,
              classRangeId: classRangeId,
              syllabusId: syllabusId,
              board: config.board,
            },
            defaults: {
              basePay: config.values[i],
            },
          });

          if (created) createdCount++;
        }
      }
    }

    console.log(`✅ BasePay seeding completed. Created ${createdCount} rows`);

    process.exit();
  } catch (error) {
    console.error("Seeder Error:", error);
    process.exit(1);
  }
}

seedBasePay();