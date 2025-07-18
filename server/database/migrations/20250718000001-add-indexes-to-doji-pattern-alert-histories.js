'use strict';

/**
 * 为十字星形态提醒历史记录表添加索引
 * 优化查询性能
 */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        // 添加索引
        await queryInterface.addIndex('doji_pattern_alert_histories', ['alert_id'], {
            name: 'idx_doji_pattern_alert_histories_alert_id',
        });

        await queryInterface.addIndex('doji_pattern_alert_histories', ['triggered_at'], {
            name: 'idx_doji_pattern_alert_histories_triggered_at',
        });

        await queryInterface.addIndex('doji_pattern_alert_histories', ['acknowledged'], {
            name: 'idx_doji_pattern_alert_histories_acknowledged',
        });

        // 添加复合索引，用于按提醒ID和触发时间查询
        await queryInterface.addIndex('doji_pattern_alert_histories', ['alert_id', 'triggered_at'], {
            name: 'idx_doji_pattern_alert_histories_alert_id_triggered_at',
        });

        // 添加复合索引，用于按确认状态和触发时间查询
        await queryInterface.addIndex('doji_pattern_alert_histories', ['acknowledged', 'triggered_at'], {
            name: 'idx_doji_pattern_alert_histories_acknowledged_triggered_at',
        });
    },

    down: async (queryInterface, Sequelize) => {
        // 移除索引
        await queryInterface.removeIndex('doji_pattern_alert_histories', 'idx_doji_pattern_alert_histories_alert_id');
        await queryInterface.removeIndex('doji_pattern_alert_histories', 'idx_doji_pattern_alert_histories_triggered_at');
        await queryInterface.removeIndex('doji_pattern_alert_histories', 'idx_doji_pattern_alert_histories_acknowledged');
        await queryInterface.removeIndex('doji_pattern_alert_histories', 'idx_doji_pattern_alert_histories_alert_id_triggered_at');
        await queryInterface.removeIndex('doji_pattern_alert_histories', 'idx_doji_pattern_alert_histories_acknowledged_triggered_at');
    }
};