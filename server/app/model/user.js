'use strict';

module.exports = (app) => {
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
    // 会员相关字段已移至 user_membership 表
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
    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || '';

    // 使用 this 而不是 app.model.User
    this.hasOne(app.model.UserPreference, {
      foreignKey: 'userId',
      as: `${prefix}_userPreference`,
    });

    // 会员信息
    this.hasOne(app.model.UserMembership, {
      foreignKey: 'userId',
      as: `${prefix}_userMembership`,
    });

    // 关注的股票
    this.hasMany(app.model.UserWatchlist, {
      foreignKey: 'userId',
      as: `${prefix}_userWatchlists`,
    });

    // 投资组合
    this.hasMany(app.model.UserPortfolio, {
      foreignKey: 'userId',
      as: `${prefix}_userPortfolios`,
    });

    this.hasMany(app.model.TradeRecord, {
      foreignKey: 'userId',
      as: `${prefix}_tradeRecords`,
    });

    // 自定义看板
    this.hasMany(app.model.UserDashboard, {
      foreignKey: 'userId',
      as: `${prefix}_userDashboards`,
    });

    // 提醒设置
    this.hasMany(app.model.UserAlert, {
      foreignKey: 'userId',
      as: `${prefix}_userAlerts`,
    });

    // 自定义策略
    this.hasMany(app.model.UserStrategy, {
      foreignKey: 'userId',
      as: `${prefix}_userStrategies`,
    });

    // 浏览历史
    this.hasMany(app.model.UserBrowsingHistory, {
      foreignKey: 'userId',
      as: `${prefix}_userBrowsingHistories`,
    });

    // 风险监控配置 - 确保别名唯一性
    this.hasMany(app.model.RiskMonitoringConfig, {
      foreignKey: 'userId',
      as: `${prefix}_userHasManyRiskMonitoringConfigs`,
    });

    // VaR计算记录
    this.hasMany(app.model.VarCalculation, {
      foreignKey: 'userId',
      as: `${prefix}_userHasManyVarCalculations`,
    });

    // 投资组合收益率记录
    this.hasMany(app.model.PortfolioReturn, {
      foreignKey: 'userId',
      as: `${prefix}_userHasManyPortfolioReturns`,
    });

    // 风险预警日志
    this.hasMany(app.model.RiskAlertLog, {
      foreignKey: 'userId',
      as: `${prefix}_userHasManyRiskAlertLogs`,
    });

    // 风险预警规则
    this.hasMany(app.model.RiskAlertRule, {
      foreignKey: 'userId',
      as: `${prefix}_userHasManyRiskAlertRules`,
    });

    // 风险监控状态
    this.hasMany(app.model.RiskMonitoringStatus, {
      foreignKey: 'userId',
      as: `${prefix}_userHasManyRiskMonitoringStatuses`,
    });

    // 止损配置
    this.hasMany(app.model.StopLossConfig, {
      foreignKey: 'userId',
      as: `${prefix}_userHasManyStopLossConfigs`,
    });

    // 止损订单
    this.hasMany(app.model.StopLossOrder, {
      foreignKey: 'userId',
      as: `${prefix}_userHasManyStopLossOrders`,
    });

    // 止损执行记录
    this.hasMany(app.model.StopLossExecution, {
      foreignKey: 'userId',
      as: `${prefix}_userHasManyStopLossExecutions`,
    });

    // 压力测试结果
    this.hasMany(app.model.StressTestResult, {
      foreignKey: 'userId',
      as: `${prefix}_userHasManyStressTestResults`,
    });

    // 压力测试场景
    this.hasMany(app.model.StressTestScenario, {
      foreignKey: 'userId',
      as: `${prefix}_userHasManyStressTestScenarios`,
    });

    // 充值请求关联暂时注释，避免循环依赖
    // TODO: 在解决模型加载顺序问题后重新启用
    /*
    // 充值请求 - 用户发起的充值请求
    this.hasMany(app.model.CoinRechargeRequest, {
      as: `${prefix}_userHasManyCoinRechargeRequests`,
      foreignKey: 'userId'
    });

    // 处理的充值请求（管理员）- 管理员处理的充值请求
    this.hasMany(app.model.CoinRechargeRequest, {
      as: `${prefix}_userHasManyProcessedRechargeRequests`,
      foreignKey: 'processedBy'
    });
    */
  };

  return User;
};
