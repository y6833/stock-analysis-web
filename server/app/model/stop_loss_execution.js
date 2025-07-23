'use strict';

module.exports = (app) => {
  const { STRING, INTEGER, DECIMAL, BOOLEAN, DATE, TEXT, JSON } = app.Sequelize;

  const StopLossExecution = app.model.define(
    'stop_loss_execution',
    {
      id: {
        type: INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: INTEGER.UNSIGNED,
        allowNull: false,
        field: 'user_id',
        comment: '用户ID',
      },
      orderId: {
        type: INTEGER.UNSIGNED,
        allowNull: false,
        field: 'order_id',
        comment: '止损订单ID',
      },
      symbol: {
        type: STRING(20),
        allowNull: false,
        comment: '股票代码',
      },
      executionType: {
        type: STRING(20),
        allowNull: false,
        field: 'execution_type',
        comment: '执行类型: stop_loss, take_profit, partial_take_profit',
      },
      triggerPrice: {
        type: DECIMAL(10, 4),
        allowNull: false,
        field: 'trigger_price',
        comment: '触发价格',
      },
      executionPrice: {
        type: DECIMAL(10, 4),
        allowNull: false,
        field: 'execution_price',
        comment: '执行价格',
      },
      quantity: {
        type: INTEGER,
        allowNull: false,
        comment: '执行数量',
      },
      originalQuantity: {
        type: INTEGER,
        allowNull: false,
        field: 'original_quantity',
        comment: '原始持仓数量',
      },
      remainingQuantity: {
        type: INTEGER,
        allowNull: false,
        field: 'remaining_quantity',
        comment: '剩余数量',
      },
      averageCost: {
        type: DECIMAL(10, 4),
        allowNull: false,
        field: 'average_cost',
        comment: '平均成本',
      },
      realizedPnl: {
        type: DECIMAL(15, 4),
        allowNull: false,
        field: 'realized_pnl',
        comment: '已实现盈亏',
      },
      realizedPnlPercentage: {
        type: DECIMAL(8, 4),
        allowNull: false,
        field: 'realized_pnl_percentage',
        comment: '已实现盈亏百分比',
      },
      commission: {
        type: DECIMAL(10, 4),
        allowNull: false,
        defaultValue: 0,
        comment: '手续费',
      },
      slippage: {
        type: DECIMAL(10, 4),
        allowNull: true,
        comment: '滑点',
      },
      executionMethod: {
        type: STRING(20),
        allowNull: false,
        field: 'execution_method',
        comment: '执行方式: manual, automatic',
      },
      isSuccessful: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_successful',
        comment: '是否执行成功',
      },
      errorMessage: {
        type: STRING(500),
        allowNull: true,
        field: 'error_message',
        comment: '错误信息',
      },
      marketConditions: {
        type: JSON,
        allowNull: true,
        field: 'market_conditions',
        comment: '执行时市场条件',
      },
      performanceMetrics: {
        type: JSON,
        allowNull: true,
        field: 'performance_metrics',
        comment: '执行绩效指标',
      },
      executionTime: {
        type: DATE,
        allowNull: false,
        field: 'execution_time',
        comment: '执行时间',
      },
      notes: {
        type: TEXT,
        allowNull: true,
        comment: '执行备注',
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
    },
    {
      tableName: 'stop_loss_executions',
      timestamps: true,
      underscored: true,
      comment: '止损止盈执行记录表',
    }
  );

  StopLossExecution.associate = function () {    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || '';

    // 关联用户 - 使用唯一别名
    app.model.StopLossExecution.belongsTo(app.model.User, {
      foreignKey: 'userId',
      as: `${prefix}_${prefix}_stopLossExecutionUser`,
    });

    // 关联止损订单
    app.model.StopLossExecution.belongsTo(app.model.StopLossOrder, {
      foreignKey: 'orderId',
      as: `${prefix}_${prefix}_order`,
    });
  };

  return StopLossExecution;
};
