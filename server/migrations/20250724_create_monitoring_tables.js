/**
 * Migration to create monitoring tables
 */

'use strict';

module.exports = {
  /**
   * Up migration
   * @param {Object} queryInterface Sequelize QueryInterface
   * @param {Object} Sequelize Sequelize instance
   * @returns {Promise} Migration promise
   */
  up: async (queryInterface, Sequelize) => {
    // Create performance_metrics table
    await queryInterface.createTable('performance_metrics', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      value: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      tags: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    
    // Create system_metrics table
    await queryInterface.createTable('system_metrics', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false
      },
      cpu_load: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      memory_total: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      memory_used: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      memory_free: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    
    // Create error_logs table
    await queryInterface.createTable('error_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false
      },
      severity: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      component: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      stack: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      url: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      user_agent: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      additional_data: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    
    // Create application_logs table
    await queryInterface.createTable('application_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false
      },
      level: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      module: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      details: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    
    // Create indexes
    await queryInterface.addIndex('performance_metrics', ['timestamp', 'type']);
    await queryInterface.addIndex('system_metrics', ['timestamp']);
    await queryInterface.addIndex('error_logs', ['timestamp', 'severity']);
    await queryInterface.addIndex('application_logs', ['timestamp', 'level']);
  },
  
  /**
   * Down migration
   * @param {Object} queryInterface Sequelize QueryInterface
   * @param {Object} Sequelize Sequelize instance
   * @returns {Promise} Migration promise
   */
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('performance_metrics');
    await queryInterface.dropTable('system_metrics');
    await queryInterface.dropTable('error_logs');
    await queryInterface.dropTable('application_logs');
  }
};