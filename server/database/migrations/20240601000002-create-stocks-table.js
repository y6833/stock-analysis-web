'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { STRING, INTEGER, DATE, DECIMAL, TEXT } = Sequelize;
    
    // 创建 stocks 表
    await queryInterface.createTable('stocks', {
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
      ts_code: {
        type: STRING(20),
        allowNull: true,
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
      list_date: {
        type: STRING(20),
        allowNull: true,
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
      curr_type: {
        type: STRING(10),
        allowNull: true,
        comment: '货币类型',
      },
      list_status: {
        type: STRING(10),
        allowNull: true,
        comment: '上市状态',
      },
      delist_date: {
        type: STRING(20),
        allowNull: true,
        comment: '退市日期',
      },
      is_hs: {
        type: STRING(10),
        allowNull: true,
        comment: '是否沪深港通',
      },
      created_at: {
        type: DATE,
        allowNull: false,
      },
      updated_at: {
        type: DATE,
        allowNull: false,
      },
    });

    // 添加索引
    await queryInterface.addIndex('stocks', ['symbol'], {
      name: 'idx_stocks_symbol',
    });

    await queryInterface.addIndex('stocks', ['ts_code'], {
      name: 'idx_stocks_ts_code',
    });

    await queryInterface.addIndex('stocks', ['industry'], {
      name: 'idx_stocks_industry',
    });

    await queryInterface.addIndex('stocks', ['market'], {
      name: 'idx_stocks_market',
    });
  },

  down: async (queryInterface) => {
    // 删除 stocks 表
    await queryInterface.dropTable('stocks');
  }
};
