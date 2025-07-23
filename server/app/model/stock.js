'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE } = app.Sequelize;

  const Stock = app.model.define('stock', {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    symbol: {
      type: STRING(20),
      allowNull: false,
      unique: true,
      comment: '股票代码',
    },
    tsCode: {
      type: STRING(20),
      allowNull: true,
      field: 'ts_code',
      comment: 'Tushare代码',
    },
    name: {
      type: STRING(100),
      allowNull: false,
      comment: '股票名称',
    },
    area: {
      type: STRING(50),
      allowNull: true,
      comment: '地区',
    },
    industry: {
      type: STRING(50),
      allowNull: true,
      comment: '行业',
    },
    market: {
      type: STRING(50),
      allowNull: true,
      comment: '市场类型',
    },
    listDate: {
      type: STRING(20),
      allowNull: true,
      field: 'list_date',
      comment: '上市日期',
    },
    fullname: {
      type: STRING(200),
      allowNull: true,
      comment: '公司全称',
    },
    enname: {
      type: STRING(200),
      allowNull: true,
      comment: '英文名称',
    },
    cnspell: {
      type: STRING(50),
      allowNull: true,
      comment: '拼音缩写',
    },
    exchange: {
      type: STRING(50),
      allowNull: true,
      comment: '交易所',
    },
    currType: {
      type: STRING(10),
      allowNull: true,
      field: 'curr_type',
      comment: '货币类型',
    },
    listStatus: {
      type: STRING(10),
      allowNull: true,
      field: 'list_status',
      comment: '上市状态',
    },
    delistDate: {
      type: STRING(20),
      allowNull: true,
      field: 'delist_date',
      comment: '退市日期',
    },
    isHs: {
      type: STRING(10),
      allowNull: true,
      field: 'is_hs',
      comment: '是否沪深港通',
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
  });

  Stock.associate = function () {    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || '';

    // 防止重复关联
    if (Stock.associations && Object.keys(Stock.associations).length > 0) {
      return;
    }

    // 投资组合持仓
    this.hasMany(app.model.PortfolioHolding, {
      foreignKey: 'stockCode',
      sourceKey: 'symbol',
      as: `${prefix}_${prefix}_stockHoldings`
    });

    // 交易记录
    this.hasMany(app.model.TradeRecord, {
      foreignKey: 'stockCode',
      sourceKey: 'symbol',
      as: `${prefix}_${prefix}_stockTrades`
    });
  };

  return Stock;
};
