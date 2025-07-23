'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, TEXT, DECIMAL } = app.Sequelize;

  const PortfolioHolding = app.model.define('portfolio_holding', {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    portfolioId: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      field: 'portfolio_id',
    },
    stockCode: {
      type: STRING(20),
      allowNull: false,
      field: 'stock_code',
    },
    stockName: {
      type: STRING(50),
      allowNull: false,
      field: 'stock_name',
    },
    quantity: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    averageCost: {
      type: DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'average_cost',
    },
    currentPrice: {
      type: DECIMAL(10, 2),
      allowNull: true,
      field: 'current_price',
    },
    notes: {
      type: TEXT,
      allowNull: true,
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
    tableName: 'portfolio_holdings',
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['portfolio_id', 'stock_code'],
        name: 'idx_portfolio_stock',
      },
    ],
  });

  PortfolioHolding.associate = function () {    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || '';

    // 使用 this 而不是 app.model.PortfolioHolding
    this.belongsTo(app.model.UserPortfolio, { foreignKey: 'portfolioId' });
  };

  return PortfolioHolding;
};
