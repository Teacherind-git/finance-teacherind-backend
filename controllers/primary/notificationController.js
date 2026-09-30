const { Op } = require("sequelize");
const Notification = require("../../models/primary/Notification");
const {
  canSeePlanExpiry,
} = require("../../utils/cronScripts/createPlanExpiryNotifications");

exports.createNotification = async (req, res) => {
  try {
    const {
      userId,
      type = "MANUAL",
      title,
      message,
      referenceKey = `manual-${Date.now()}`,
      notificationDate = new Date().toISOString().slice(0, 10),
    } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({
        success: false,
        message: "userId, title, and message are required",
      });
    }

    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      referenceKey,
      notificationDate,
    });

    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create notification",
    });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const where = { userId: req.user.id };
    // Hide plan expiries from users who no longer qualify (e.g. role changed)
    if (!canSeePlanExpiry(req.user)) {
      where.type = { [Op.ne]: "PLAN_EXPIRY" };
    }
    const [notifications, unreadCount] = await Promise.all([
      Notification.findAll({
        where,
        order: [["createdAt", "DESC"]],
        limit: 50,
      }),
      Notification.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
};

exports.acknowledgeNotification = async (req, res) => {
  try {
    const deleted = await Notification.destroy({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to acknowledge notification",
    });
  }
};