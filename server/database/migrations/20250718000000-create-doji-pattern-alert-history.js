'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('doji_pattern_alert_histories', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED
      },
      alert_id: {
        allowNull: false,
        type: Sequelize.INTEGER.UNSIGNED,
        references: {
          model: 'doji_pattern_alerts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      triggered_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      acknowledged: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      acknowledged_at: {
        allowNull: true,
        type: Sequelize.DATE
      },
      pattern_details: {
        allowNull: true,
        type: Sequelize.JSON,
        comment: '十字星形态详情'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // 添加索引
    await queryInterface.addIndex('doji_pattern_alert_histories', ['alert_id']);
    await queryInterface.addIndex('doji_pattern_alert_histories', ['triggered_at']);
    await queryInterface.addIndex('doji_pattern_alert_histories', ['acknowledged']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('doji_pattern_alert_histories');
  }
};
