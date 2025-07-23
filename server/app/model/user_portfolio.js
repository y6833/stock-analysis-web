'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, TEXT, BOOLEAN } = app.Sequelize;

  const UserPortfolio = app.model.define('user_portfolio', {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      field: 'user_id',
    },
    name: {
      type: STRING(50),
      allowNull: false,
      defaultValue: '默认组合',
    },
    description: {
      type: TEXT,
      allowNull: true,
    },
    isDefault: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_default',
    },
    createdAt: {
      type: DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DATE,
      allowNull: false,
      field: 'updated_at',
    },
  }, {
    tableName: 'user_portfolios',
    underscored: true,
  });

  UserPortfolio.associate = function () {    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || '';

    // 使用 this 而不是 app.model.UserPortfolio
    this.belongsTo(app.model.User, { foreignKey: 'userId' });
    this.hasMany(app.model.PortfolioHolding, { foreignKey: 'portfolioId' });
    this.hasMany(app.model.TradeRecord, { foreignKey: 'portfolioId' });

    // 风险监控配置
    this.hasMany(app.model.RiskMonitoringConfig, { foreignKey: 'portfolioId' });

    // VaR计算记录
    this.hasMany(app.model.VarCalculation, { foreignKey: 'portfolioId' });

    // 投资组合收益率记录
    this.hasMany(app.model.PortfolioReturn, { foreignKey: 'portfolioId' });
  };

  return UserPortfolio;
};
