'use strict';

module.exports = app => {
  const { STRING, INTEGER, DECIMAL, DATE, ENUM } = app.Sequelize;

  const SimulationTransaction = app.model.define('simulation_transaction', {
    id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    accountId: {
      type: INTEGER,
      allowNull: false,
      field: 'account_id',
    },
    stockCode: {
      type: STRING(20),
      allowNull: false,
      field: 'stock_code',
    },
    stockName: {
      type: STRING(100),
      allowNull: false,
      field: 'stock_name',
    },
    action: {
      type: ENUM('buy', 'sell'),
      allowNull: false,
    },
    quantity: {
      type: INTEGER,
      allowNull: false,
    },
    price: {
      type: DECIMAL(10, 2),
      allowNull: false,
    },
    amount: {
      type: DECIMAL(15, 2),
      allowNull: false,
    },
    transactionDate: {
      type: DATE,
      allowNull: false,
      defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
      field: 'transaction_date',
    },
  }, {
    tableName: 'simulation_transactions',
    underscored: true,
    timestamps: false,
  });

  SimulationTransaction.associate = function() {
    app.model.SimulationTransaction.belongsTo(app.model.SimulationAccount, { foreignKey: 'accountId' });
  };

  return SimulationTransaction;
};
