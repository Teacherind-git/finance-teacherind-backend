const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../../middlewares/authMiddleware');
const { getAllUsers, createUser, updateUser, deleteUser } = require('../../controllers/primary/userController');

router.use(protect);
router.get('/', authorizeRoles('SuperAdmin', 'Admin'), getAllUsers);
router.post('/', authorizeRoles('SuperAdmin'), createUser);
router.put('/:id', authorizeRoles('SuperAdmin'), updateUser);
router.delete('/:id', authorizeRoles('SuperAdmin'), deleteUser);

module.exports = router;
