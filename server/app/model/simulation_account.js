'use strict';

module.exports = app => {
  const { STRING, INTEGER, DECIMAL, DATE } = app.Sequelize;

  const SimulationAccount = app.model.define('simulation_account', {
    id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: INTEGER,
      allowNull: false,
      field: 'user_id',
    },
    name: {
      type: STRING(100),
      allowNull: false,
    },
    cash: {
      type: DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 100000.00,
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
    tableName: 'simulation_accounts',
    underscored: true,
  });

  SimulationAccount.associate = function () {    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || '';

    app.model.SimulationAccount.belongsTo(app.model.User, { foreignKey: 'userId' });
    app.model.SimulationAccount.hasMany(app.model.SimulationPosition, { foreignKey: 'accountId' });
    app.model.SimulationAccount.hasMany(app.model.SimulationTransaction, { foreignKey: 'accountId' });
  };

  return SimulationAccount;
};
