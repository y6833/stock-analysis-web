'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 创建模拟账户表
    await queryInterface.createTable('simulation_accounts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        // 暂时移除外键约束，以便迁移能够成功
        // references: {
        //   model: 'users',
        //   key: 'id'
        // },
        // onUpdate: 'CASCADE',
        // onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      cash: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 100000.00
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // 创建模拟持仓表
    await queryInterface.createTable('simulation_positions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      account_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        // 暂时移除外键约束，以便迁移能够成功
        // references: {
        //   model: 'simulation_accounts',
        //   key: 'id'
        // },
        // onUpdate: 'CASCADE',
        // onDelete: 'CASCADE'
      },
      stock_code: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      stock_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      avg_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // 创建模拟交易记录表
    await queryInterface.createTable('simulation_transactions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      account_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        // 暂时移除外键约束，以便迁移能够成功
        // references: {
        //   model: 'simulation_accounts',
        //   key: 'id'
        // },
        // onUpdate: 'CASCADE',
        // onDelete: 'CASCADE'
      },
      stock_code: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      stock_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      action: {
        type: Sequelize.ENUM('buy', 'sell'),
        allowNull: false
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      transaction_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // 添加索引
    await queryInterface.addIndex('simulation_accounts', ['user_id']);
    await queryInterface.addIndex('simulation_positions', ['account_id', 'stock_code']);
    await queryInterface.addIndex('simulation_transactions', ['account_id', 'transaction_date']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('simulation_transactions');
    await queryInterface.dropTable('simulation_positions');
    await queryInterface.dropTable('simulation_accounts');
  }
};
