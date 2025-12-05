const { DataTypes } = require("sequelize");
const { sequelizePrimary } = require("../../config/db");
const bcrypt = require("bcryptjs");
const Role = require("./Role"); // Import Role model for association

const User = sequelizePrimary.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    lastName: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "roles",
        key: "id",
      },
    },

    department: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },

    position: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },

    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    taxId: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    address: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },

    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
  },
  {
    tableName: "users",
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  }
);

// Instance method: compare password
User.prototype.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Associations
User.belongsTo(Role, { foreignKey: "roleId", as: "role" });

// Self-reference for creator/updater
User.belongsTo(User, { foreignKey: "createdBy", as: "creator" });
User.belongsTo(User, { foreignKey: "updatedBy", as: "updater" });

module.exports = User;
