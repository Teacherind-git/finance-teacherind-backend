// controllers/tutorController.js
const TutorPayRule = require("../models/TutorPayRule");
const TutorIncrement = require("../models/TutorIncrement");

exports.getTutorPayRules = async (req, res) => {
  const rule = await TutorPayRule.findOne({
    include: [{ model: TutorIncrement, as: "increments" }],
  });
  res.json(rule);
};

exports.saveTutorPayRule = async (req, res) => {
  const { basePercentage, ratingBonus, increments } = req.body;

  const rule = await TutorPayRule.create({ basePercentage, ratingBonus });
  if (increments && increments.length > 0) {
    await TutorIncrement.bulkCreate(
      increments.map((i) => ({
        tutorRuleId: rule.id,
        classRange: i.classRange,
        incrementPercentage: i.incrementPercentage,
      }))
    );
  }

  res.status(201).json({ message: "Tutor pay rule saved", rule });
};
