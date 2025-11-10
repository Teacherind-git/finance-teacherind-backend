const express = require('express');
const router = express.Router();
const { register, login, getAllRoles } = require('../../controllers/primary/authController');

router.post('/register', register);
router.post('/login', login);
router.get("/roles", getAllRoles);

module.exports = router;
