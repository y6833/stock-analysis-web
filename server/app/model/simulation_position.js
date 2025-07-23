'use strict';

module.exports = app => {
  const { STRING, INTEGER, DECIMAL, DATE } = app.Sequelize;

  const SimulationPosition = app.model.define('simulation_position', {
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
    quantity: {
      type: INTEGER,
      allowNull: false,
    },
    avgPrice: {
      type: DECIMAL(10, 2),
      allowNull: false,
      field: 'avg_price',
    },
    createdAt: {
      type: DATE,
      field: 'created_at',
    },
    updatedAt: {
      type: DATE,
      field: 'updated_at',
    },
  }, {
    tableName: 'simulation_positions',
    underscored: true,
  });

  SimulationPosition.associate = function () {    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || '';

    app.model.SimulationPosition.belongsTo(app.model.SimulationAccount, { foreignKey: 'accountId' });
  };

  return SimulationPosition;
};
