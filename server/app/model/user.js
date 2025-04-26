'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, BOOLEAN, TEXT } = app.Sequelize;

  const User = app.model.define('user', {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: STRING(30),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    email: {
      type: STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: STRING(100),
      allowNull: false,
    },
    role: {
      type: STRING(10),
      allowNull: false,
      defaultValue: 'user',
      validate: {
        isIn: [['user', 'premium', 'admin']],
      },
    },
    status: {
      type: STRING(10),
      allowNull: false,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'inactive', 'suspended']],
      },
    },
    nickname: {
      type: STRING(30),
      allowNull: true,
    },
    bio: {
      type: TEXT,
      allowNull: true,
    },
    phone: {
      type: STRING(20),
      allowNull: true,
    },
    location: {
      type: STRING(100),
      allowNull: true,
    },
    website: {
      type: STRING(100),
      allowNull: true,
    },
    avatar: {
      type: TEXT('long'),
      allowNull: true,
    },
    lastLogin: {
      type: DATE,
      allowNull: true,
    },
    createdAt: {
      type: DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DATE,
      allowNull: false,
    },
  });

  User.associate = function () {
    app.model.User.hasOne(app.model.UserPreference, { foreignKey: 'userId' });
  };

  return User;
};
