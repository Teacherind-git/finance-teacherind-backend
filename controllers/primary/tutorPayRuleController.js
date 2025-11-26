const PayRule = require("../../models/primary/TutorPayRule");

exports.savePayRule = async (req, res) => {
  try {
    const data = req.body; // full JSON from frontend

    let rule = await PayRule.findOne();

    if (rule) {
      rule.rules_json = data;
      await rule.save();

      return res.status(200).json({
        success: true,
        message: "Pay rule updated successfully",
      });
    }

    await PayRule.create({ rules_json: data });

    return res.status(201).json({
      success: true,
      message: "Pay rule created successfully",
    });
  } catch (error) {
    console.error("❌ Error saving pay rule:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ⭐ Get Pay Rule
exports.getPayRule = async (req, res) => {
  try {
    const rule = await PayRule.findOne();

    return res.status(200).json({
      success: true,
      data: rule ? rule.rules_json : null,
    });
  } catch (error) {
    console.error("❌ Error fetching pay rule:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
