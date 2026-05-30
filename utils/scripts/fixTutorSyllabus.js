// scripts/fix-tutor-syllabus.js

const Tutor = require("../../models/primary/Tutor");

const updateMode =
  process.argv.includes("-u") ||
  process.argv.includes("--update");

async function run() {
  const tutors = await Tutor.findAll();

  const affected = [];

  for (const tutor of tutors) {
    const teachingDetails = tutor.teachingDetails || [];

    let changed = false;

    const updatedTeachingDetails = teachingDetails.map((detail) => {
      if (
        detail?.syllabus &&
        !Array.isArray(detail.syllabus)
      ) {
        changed = true;

        return {
          ...detail,
          syllabus: [String(detail.syllabus)],
        };
      }

      return detail;
    });

    if (changed) {
      affected.push({
        id: tutor.id,
        employeeId: tutor.employeeId,
        fullName: tutor.fullName,
      });

      if (updateMode) {
        await tutor.update({
          teachingDetails: updatedTeachingDetails,
        });
      }
    }
  }

  console.table(affected);

  console.log(
    `${updateMode ? "Updated" : "Found"} ${affected.length} tutors`
  );

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});