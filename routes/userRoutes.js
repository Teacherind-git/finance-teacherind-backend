const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const { getAllUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');

router.use(protect);
router.get('/', authorizeRoles('admin'), getAllUsers);
router.post('/', authorizeRoles('admin'), createUser);
router.put('/:id', authorizeRoles('admin'), updateUser);
router.delete('/:id', authorizeRoles('admin'), deleteUser);

module.exports = router;
