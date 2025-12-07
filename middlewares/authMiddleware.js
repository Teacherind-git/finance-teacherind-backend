const jwt = require('jsonwebtoken');
const User = require('../models/primary/User');
const Role = require('../models/primary/Role');
const logger = require('../utils/logger');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Authorization header missing or malformed', {
      path: req.originalUrl,
      ip: req.ip,
    });

    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({
      where: { id: decoded.id },
      include: [{ model: Role, as: 'role' }],
    });

    if (!user) {
      logger.warn('Authenticated user not found', {
        userId: decoded.id,
        path: req.originalUrl,
      });

      return res.status(404).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('JWT authentication failed', {
      message: error.message,
      path: req.originalUrl,
      ip: req.ip,
    });

    return res.status(401).json({ message: 'Invalid token' });
  }
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role.name)) {
      logger.warn('Unauthorized role access attempt', {
        userId: req.user?.id,
        role: req.user?.role?.name,
        allowedRoles,
        path: req.originalUrl,
      });

      return res.status(403).json({ message: 'Forbidden: Access denied' });
    }

    next();
  };
};

module.exports = { protect, authorizeRoles };
