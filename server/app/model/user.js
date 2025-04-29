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
    membership: {
      type: STRING(20),
      allowNull: false,
      defaultValue: 'free',
      validate: {
        isIn: [['free', 'basic', 'premium', 'enterprise']],
      },
    },
    membershipExpires: {
      type: DATE,
      allowNull: true,
      field: 'membership_expires',
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
    lastRefreshTime: {
      type: DATE,
      allowNull: true,
      field: 'last_refresh_time',
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
    // 使用 this 而不是 app.model.User
    this.hasOne(app.model.UserPreference, { foreignKey: 'userId' });

    // 关注的股票
    this.hasMany(app.model.UserWatchlist, { foreignKey: 'userId' });

    // 投资组合
    this.hasMany(app.model.UserPortfolio, { foreignKey: 'userId' });
    this.hasMany(app.model.TradeRecord, { foreignKey: 'userId' });

    // 自定义看板
    this.hasMany(app.model.UserDashboard, { foreignKey: 'userId' });

    // 提醒设置
    this.hasMany(app.model.UserAlert, { foreignKey: 'userId' });

    // 自定义策略
    this.hasMany(app.model.UserStrategy, { foreignKey: 'userId' });

    // 浏览历史
    this.hasMany(app.model.UserBrowsingHistory, { foreignKey: 'userId' });
  };

  return User;
};
