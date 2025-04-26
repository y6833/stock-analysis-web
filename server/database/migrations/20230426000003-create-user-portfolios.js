'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { INTEGER, STRING, DATE, TEXT, DECIMAL, BOOLEAN } = Sequelize;
    
    // 创建投资组合表
    await queryInterface.createTable('user_portfolios', {
      id: { 
        type: INTEGER.UNSIGNED, 
        primaryKey: true, 
        autoIncrement: true 
      },
      user_id: { 
        type: INTEGER.UNSIGNED, 
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: { 
        type: STRING(50), 
        allowNull: false,
        defaultValue: '默认组合'
      },
      description: { 
        type: TEXT, 
        allowNull: true 
      },
      is_default: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      created_at: { 
        type: DATE, 
        allowNull: false 
      },
      updated_at: { 
        type: DATE, 
        allowNull: false 
      }
    });

    // 创建持仓表
    await queryInterface.createTable('portfolio_holdings', {
      id: { 
        type: INTEGER.UNSIGNED, 
        primaryKey: true, 
        autoIncrement: true 
      },
      portfolio_id: { 
        type: INTEGER.UNSIGNED, 
        allowNull: false,
        references: { model: 'user_portfolios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      stock_code: { 
        type: STRING(20), 
        allowNull: false 
      },
      stock_name: { 
        type: STRING(50), 
        allowNull: false 
      },
      quantity: { 
        type: INTEGER.UNSIGNED, 
        allowNull: false,
        defaultValue: 0
      },
      average_cost: { 
        type: DECIMAL(10, 2), 
        allowNull: false,
        defaultValue: 0
      },
      current_price: { 
        type: DECIMAL(10, 2), 
        allowNull: true
      },
      notes: { 
        type: TEXT, 
        allowNull: true 
      },
      created_at: { 
        type: DATE, 
        allowNull: false 
      },
      updated_at: { 
        type: DATE, 
        allowNull: false 
      }
    });

    // 添加联合唯一索引，确保同一个组合中不会有重复的股票
    await queryInterface.addIndex('portfolio_holdings', ['portfolio_id', 'stock_code'], {
      unique: true,
      name: 'idx_portfolio_stock'
    });

    // 创建交易记录表
    await queryInterface.createTable('trade_records', {
      id: { 
        type: INTEGER.UNSIGNED, 
        primaryKey: true, 
        autoIncrement: true 
      },
      user_id: { 
        type: INTEGER.UNSIGNED, 
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      portfolio_id: { 
        type: INTEGER.UNSIGNED, 
        allowNull: false,
        references: { model: 'user_portfolios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      stock_code: { 
        type: STRING(20), 
        allowNull: false 
      },
      stock_name: { 
        type: STRING(50), 
        allowNull: false 
      },
      trade_type: { 
        type: STRING(10), 
        allowNull: false,
        comment: 'buy: 买入, sell: 卖出'
      },
      quantity: { 
        type: INTEGER.UNSIGNED, 
        allowNull: false
      },
      price: { 
        type: DECIMAL(10, 2), 
        allowNull: false
      },
      total_amount: { 
        type: DECIMAL(10, 2), 
        allowNull: false
      },
      trade_date: { 
        type: DATE, 
        allowNull: false 
      },
      notes: { 
        type: TEXT, 
        allowNull: true 
      },
      created_at: { 
        type: DATE, 
        allowNull: false 
      },
      updated_at: { 
        type: DATE, 
        allowNull: false 
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('trade_records');
    await queryInterface.dropTable('portfolio_holdings');
    await queryInterface.dropTable('user_portfolios');
  }
};
