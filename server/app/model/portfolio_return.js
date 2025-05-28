'use strict'

module.exports = (app) => {
  const { INTEGER, DATE, DECIMAL } = app.Sequelize

  const PortfolioReturn = app.model.define(
    'portfolio_return',
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
      },
      portfolioId: {
        type: INTEGER.UNSIGNED,
        allowNull: true,
        field: 'portfolio_id',
      },
      returnDate: {
        type: DATE,
        allowNull: false,
        field: 'return_date',
        comment: '收益率日期',
      },
      dailyReturn: {
        type: DECIMAL(10, 8),
        allowNull: false,
        field: 'daily_return',
        comment: '日收益率',
      },
      portfolioValue: {
        type: DECIMAL(15, 2),
        allowNull: false,
        field: 'portfolio_value',
        comment: '当日投资组合价值',
      },
      benchmarkReturn: {
        type: DECIMAL(10, 8),
        allowNull: true,
        field: 'benchmark_return',
        comment: '基准收益率',
      },
      excessReturn: {
        type: DECIMAL(10, 8),
        allowNull: true,
        field: 'excess_return',
        comment: '超额收益率',
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
      tableName: 'portfolio_returns',
      underscored: true,
    }
  )

  PortfolioReturn.associate = function () {
    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || ''

    // 关联用户 - 使用唯一前缀防止别名冲突
    PortfolioReturn.belongsTo(app.model.User, {
      foreignKey: 'userId',
      as: `${prefix}_portfolioReturnBelongsToUser`,
    })

    // 关联投资组合
    PortfolioReturn.belongsTo(app.model.UserPortfolio, {
      foreignKey: 'portfolioId',
      as: `${prefix}_portfolio`,
    })
  }

  return PortfolioReturn
}
