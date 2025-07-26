'use strict'

module.exports = (app) => {
  const { STRING, DECIMAL, DATE, INTEGER, BOOLEAN, TEXT } = app.Sequelize

  const StockDailyData = app.model.define(
    'stock_daily_data',
    {
      id: {
        type: INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '主键ID',
      },
      ts_code: {
        type: STRING(20),
        allowNull: false,
        comment: '股票代码（如000001.SZ）',
      },
      trade_date: {
        type: STRING(8),
        allowNull: false,
        comment: '交易日期（YYYYMMDD格式）',
      },
      open: {
        type: DECIMAL(10, 3),
        allowNull: true,
        comment: '开盘价',
      },
      high: {
        type: DECIMAL(10, 3),
        allowNull: true,
        comment: '最高价',
      },
      low: {
        type: DECIMAL(10, 3),
        allowNull: true,
        comment: '最低价',
      },
      close: {
        type: DECIMAL(10, 3),
        allowNull: true,
        comment: '收盘价',
      },
      pre_close: {
        type: DECIMAL(10, 3),
        allowNull: true,
        comment: '昨收价',
      },
      change: {
        type: DECIMAL(10, 3),
        allowNull: true,
        field: 'change_val',
        comment: '涨跌额',
      },
      pct_chg: {
        type: DECIMAL(10, 3),
        allowNull: true,
        comment: '涨跌幅（%）',
      },
      vol: {
        type: DECIMAL(20, 2),
        allowNull: true,
        comment: '成交量（手）',
      },
      amount: {
        type: DECIMAL(20, 3),
        allowNull: true,
        comment: '成交额（千元）',
      },
      turnover_rate: {
        type: DECIMAL(10, 3),
        allowNull: true,
        comment: '换手率（%）',
      },
      turnover_rate_f: {
        type: DECIMAL(10, 3),
        allowNull: true,
        comment: '换手率（自由流通股）',
      },
      volume_ratio: {
        type: DECIMAL(10, 3),
        allowNull: true,
        comment: '量比',
      },
      pe: {
        type: DECIMAL(10, 3),
        allowNull: true,
        comment: '市盈率（总市值/净利润，亏损的PE为空）',
      },
      pe_ttm: {
        type: DECIMAL(10, 3),
        allowNull: true,
        comment: '市盈率（TTM，亏损的PE为空）',
      },
      pb: {
        type: DECIMAL(10, 3),
        allowNull: true,
        comment: '市净率（总市值/净资产）',
      },
      ps: {
        type: DECIMAL(10, 3),
        allowNull: true,
        comment: '市销率',
      },
      ps_ttm: {
        type: DECIMAL(10, 3),
        allowNull: true,
        comment: '市销率（TTM）',
      },
      dv_ratio: {
        type: DECIMAL(10, 3),
        allowNull: true,
        comment: '股息率（%）',
      },
      dv_ttm: {
        type: DECIMAL(10, 3),
        allowNull: true,
        comment: '股息率（TTM）（%）',
      },
      total_share: {
        type: DECIMAL(20, 2),
        allowNull: true,
        comment: '总股本（万股）',
      },
      float_share: {
        type: DECIMAL(20, 2),
        allowNull: true,
        comment: '流通股本（万股）',
      },
      free_share: {
        type: DECIMAL(20, 2),
        allowNull: true,
        comment: '自由流通股本（万）',
      },
      total_mv: {
        type: DECIMAL(20, 2),
        allowNull: true,
        comment: '总市值（万元）',
      },
      circ_mv: {
        type: DECIMAL(20, 2),
        allowNull: true,
        comment: '流通市值（万元）',
      },
      data_source: {
        type: STRING(50),
        allowNull: false,
        defaultValue: 'tushare',
        comment: '数据来源（tushare/manual/other）',
      },
      cache_priority: {
        type: INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: '缓存优先级（1=用户关注，2=搜索历史，3=热门股票，4=系统推荐）',
      },
      is_active: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: '是否有效（用于软删除）',
      },
      last_updated: {
        type: DATE,
        allowNull: false,
        defaultValue: app.Sequelize.NOW,
        comment: '最后更新时间',
      },
      created_at: {
        type: DATE,
        allowNull: false,
        defaultValue: app.Sequelize.NOW,
        comment: '创建时间',
      },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: app.Sequelize.NOW,
        comment: '更新时间',
      },
    },
    {
      tableName: 'stock_daily_data',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          unique: true,
          fields: ['ts_code', 'trade_date'],
          name: 'uk_stock_daily_data_code_date',
        },
        {
          fields: ['ts_code'],
          name: 'idx_stock_daily_data_ts_code',
        },
        {
          fields: ['trade_date'],
          name: 'idx_stock_daily_data_trade_date',
        },
        {
          fields: ['cache_priority'],
          name: 'idx_stock_daily_data_priority',
        },
        {
          fields: ['last_updated'],
          name: 'idx_stock_daily_data_updated',
        },
        {
          fields: ['is_active'],
          name: 'idx_stock_daily_data_active',
        },
      ],
      comment: '股票日线数据缓存表',
    }
  )

  // 定义模型关联
  StockDailyData.associate = function () {
    // 与股票基础信息表关联
    StockDailyData.belongsTo(app.model.Stock, {
      foreignKey: 'ts_code',
      targetKey: 'tsCode',
      as: 'stock_info',
    })
  }

  return StockDailyData
}
