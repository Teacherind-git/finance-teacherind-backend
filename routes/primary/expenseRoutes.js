const express = require('express');
const router = express.Router();
const expenseController = require('../../controllers/primary/expenseController');

router.post('/', expenseController.createExpense);          // Create
router.get('/', expenseController.getAllExpenses);          // Read all
router.get('/:id', expenseController.getExpenseById);       // Read one
router.put('/:id', expenseController.updateExpense);        // Update
router.delete('/:id', expenseController.deleteExpense);     // Delete

module.exports = router;
