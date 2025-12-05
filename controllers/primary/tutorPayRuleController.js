const PayRuleConfig = require("../../models/primary/TutorPayRule");

// ---- Helper: Load or create empty config ----
async function getConfigRow() {
  let row = await PayRuleConfig.findOne();

  if (!row) {
    row = await PayRuleConfig.create({
      config: {
        basePays: [],
        increment: {
          monthlyThreshold: 40,
          aboveRules: [],
          belowRules: [],
        },
        decrement: [],
      },
    });
  }

  return row;
}

// Update (frontend sends full JSON)
exports.updatePayRules = async (req, res) => {
  const newConfig = req.body;

  let config = await PayRuleConfig.findOne();
  if (!config) {
    config = await PayRuleConfig.create({ config: newConfig });
  } else {
    await config.update({ config: newConfig });
  }

  res.json({ success: true, config: newConfig });
};

/* =======================================================
   GET ALL BASE PAY ENTRIES
======================================================= */
exports.getBasePays = async (req, res) => {
  const row = await getConfigRow();
  res.json(row.config.basePays || []);
};

/* =======================================================
   CREATE NEW BASE PAY
======================================================= */
exports.createBasePay = async (req, res) => {
  const { classRange, basePay } = req.body;

  const row = await getConfigRow();
  const cfg = row.config;

  // create manual ID
  const newId =
    cfg.basePays.length > 0 ? cfg.basePays[cfg.basePays.length - 1].id + 1 : 1;

  const newEntry = {
    id: newId,
    classRange,
    basePay,
  };

  cfg.basePays.push(newEntry);
  await row.update({ config: cfg });

  res.json(newEntry);
};

/* =======================================================
   UPDATE BASE PAY
======================================================= */
exports.updateBasePay = async (req, res) => {
  const { id } = req.params;
  const { classRange, basePay } = req.body;

  const row = await getConfigRow();
  const cfg = row.config;

  const index = cfg.basePays.findIndex((p) => p.id == id);

  if (index === -1)
    return res.status(404).json({ message: "Base pay not found" });

  cfg.basePays[index] = {
    ...cfg.basePays[index],
    classRange: classRange ?? cfg.basePays[index].classRange,
    basePay: basePay ?? cfg.basePays[index].basePay,
  };

  await row.update({ config: cfg });

  res.json(cfg.basePays[index]);
};

/* =======================================================
   DELETE BASE PAY
======================================================= */
exports.deleteBasePay = async (req, res) => {
  const { id } = req.params;

  const row = await getConfigRow();
  const cfg = row.config;

  const newList = cfg.basePays.filter((p) => p.id != id);

  if (newList.length === cfg.basePays.length)
    return res.status(404).json({ message: "Base pay not found" });

  cfg.basePays = newList;

  await row.update({ config: cfg });

  res.json({ success: true });
};
