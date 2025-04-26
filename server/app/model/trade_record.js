'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, TEXT, DECIMAL } = app.Sequelize;

  const TradeRecord = app.model.define('trade_record', {
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
    tradeType: {
      type: STRING(10),
      allowNull: false,
      field: 'trade_type',
      comment: 'buy: 买入, sell: 卖出',
    },
    quantity: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
    },
    price: {
      type: DECIMAL(10, 2),
      allowNull: false,
    },
    totalAmount: {
      type: DECIMAL(10, 2),
      allowNull: false,
      field: 'total_amount',
    },
    tradeDate: {
      type: DATE,
      allowNull: false,
      field: 'trade_date',
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
    tableName: 'trade_records',
    underscored: true,
  });

  TradeRecord.associate = function () {
    // 使用 this 而不是 app.model.TradeRecord
    this.belongsTo(app.model.User, { foreignKey: 'userId' });
    this.belongsTo(app.model.UserPortfolio, { foreignKey: 'portfolioId' });
  };

  return TradeRecord;
};
