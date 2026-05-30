// scripts/fix-tutor-syllabus.js

const Tutor = require("../../models/primary/Tutor");

const updateMode =
  process.argv.includes("-u") || process.argv.includes("--update");

async function run() {
  const tutors = await Tutor.findAll();

  let updatedCount = 0;

  for (const tutor of tutors) {
    let teachingDetails = tutor.teachingDetails;
    let changed = false;

    // Handle null/undefined
    if (!teachingDetails) {
      continue;
    }

    // Handle JSON string
    if (typeof teachingDetails === "string") {
      try {
        teachingDetails = JSON.parse(teachingDetails);
        changed = true;
      } catch (err) {
        console.log(
          `Skipping Tutor ${tutor.id} (${tutor.fullName}) - Invalid JSON`,
        );
        continue;
      }
    }

    // Handle single object instead of array
    if (!Array.isArray(teachingDetails)) {
      teachingDetails = [teachingDetails];
      changed = true;
    }

    teachingDetails = teachingDetails.map((detail) => {
      const updated = { ...detail };

      // Normalize syllabus
      if (!Array.isArray(updated.syllabus)) {
        updated.syllabus =
          updated.syllabus == null ? [] : [String(updated.syllabus)];

        changed = true;
      }

      // Normalize ids to string
      if (
        updated.className !== undefined &&
        typeof updated.className !== "string"
      ) {
        updated.className = String(updated.className);
        changed = true;
      }

      if (
        updated.subject !== undefined &&
        typeof updated.subject !== "string"
      ) {
        updated.subject = String(updated.subject);
        changed = true;
      }

      return updated;
    });

    if (changed) {
      console.log(
        `[${updateMode ? "UPDATE" : "FOUND"}]`,
        tutor.id,
        tutor.employeeId,
        tutor.fullName,
      );

      if (updateMode) {
        await tutor.update({
          teachingDetails,
        });

        updatedCount++;
      }
    }
  }

  console.log(
    `${updateMode ? "Updated" : "Found"} ${updatedCount} tutor records`,
  );

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
