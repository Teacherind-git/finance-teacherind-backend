const Expense = require("../../models/primary/Expense");
const logger = require("../../utils/logger");
const { getPaginationParams } = require("../../utils/pagination");

// CREATE
exports.createExpense = async (req, res) => {
  try {
    const { expenseDate, category, subCategory, description, amount } =
      req.body;
    const userId = req.user?.id;

    if (!userId) {
      logger.warn("Create fee structure failed: Missing user info");
      return res
        .status(400)
        .json({ message: "Unauthorized: Missing user info" });
    }
    console.log('555', expenseDate, category, subCategory, amount);
    

    if (!expenseDate || !category || !subCategory || !amount) {
      return res.status(400).json({
        message: "expenseDate, category, subCategory and amount are required",
      });
    }

    const expense = await Expense.create({
      expenseDate,
      category,
      subCategory,
      description,
      amount,
      createdBy: userId,
      updatedBy: userId,
    });

    logger.info(`Expense created: ${expense.id}`, { payload: req.body });
    res.status(201).json(expense);
  } catch (error) {
    logger.error("Failed to create expense", {
      error: error.message,
      payload: req.body,
    });
    res.status(500).json({ message: "Failed to create expense" });
  }
};

// READ ALL
exports.getAllExpenses = async (req, res) => {
  try {
    // ✅ allowed fields for sorting
    const allowedSortFields = [
      "expenseDate",
      "amount",
      "category",
      "createdAt",
    ];

    const { page, limit, offset, sortBy, sortOrder } = getPaginationParams(
      req,
      allowedSortFields,
      "expenseDate"
    );

    // ✅ use findAndCountAll for pagination
    const { rows: expenses, count: total } = await Expense.findAndCountAll({
      order: [[sortBy, sortOrder]],
      limit,
      offset,
    });

    logger.info(`Fetched ${expenses.length} expenses (page ${page})`);

    res.json({
      data: expenses,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Failed to fetch expenses", {
      error: error.message,
    });
    res.status(500).json({ message: "Failed to fetch expenses" });
  }
};

// READ ONE
exports.getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);

    if (!expense) {
      logger.warn(`Expense not found: ${req.params.id}`);
      return res.status(404).json({ message: "Expense not found" });
    }

    logger.info(`Fetched expense: ${req.params.id}`);
    res.json(expense);
  } catch (error) {
    logger.error(`Failed to fetch expense: ${req.params.id}`, {
      error: error.message,
    });
    res.status(500).json({ message: "Failed to fetch expense" });
  }
};

// UPDATE
exports.updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);

    if (!expense) {
      logger.warn(`Expense not found for update: ${req.params.id}`);
      return res.status(404).json({ message: "Expense not found" });
    }

    const { expenseDate, category, subCategory, description, amount } =
      req.body;

    await expense.update({
      expenseDate,
      category,
      subCategory,
      description,
      amount,
    });

    logger.info(`Expense updated: ${req.params.id}`, {
      payload: req.body,
    });

    res.json(expense);
  } catch (error) {
    logger.error(`Failed to update expense: ${req.params.id}`, {
      error: error.message,
      payload: req.body,
    });
    res.status(500).json({ message: "Failed to update expense" });
  }
};

// DELETE
exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);

    if (!expense) {
      logger.warn(`Expense not found for deletion: ${req.params.id}`);
      return res.status(404).json({ message: "Expense not found" });
    }

    await expense.destroy();

    logger.info(`Expense deleted: ${req.params.id}`);
    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    logger.error(`Failed to delete expense: ${req.params.id}`, {
      error: error.message,
    });
    res.status(500).json({ message: "Failed to delete expense" });
  }
};
