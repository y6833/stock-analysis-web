'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_ai_preferences', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        unique: true,
      },
      risk_tolerance: {
        type: Sequelize.ENUM('conservative', 'moderate', 'aggressive'),
        allowNull: false,
        defaultValue: 'moderate',
      },
      investment_horizon: {
        type: Sequelize.ENUM('short', 'medium', 'long'),
        allowNull: false,
        defaultValue: 'medium',
      },
      sector_preferences: { type: Sequelize.JSON, allowNull: true },
      analysis_depth: {
        type: Sequelize.ENUM('basic', 'detailed', 'comprehensive'),
        allowNull: false,
        defaultValue: 'detailed',
      },
      ai_weight: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: false,
        defaultValue: 0.6,
      },
      focus_areas: { type: Sequelize.JSON, allowNull: true },
      exclude_patterns: { type: Sequelize.JSON, allowNull: true },
      notification_settings: { type: Sequelize.JSON, allowNull: true },
      custom_criteria: { type: Sequelize.JSON, allowNull: true },
      learning_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      total_recommendations: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      average_return: {
        type: Sequelize.DECIMAL(8, 4),
        allowNull: true,
      },
      last_recommendation_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('user_ai_preferences')
  },
}
