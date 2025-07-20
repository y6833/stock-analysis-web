'use strict'

/**
 * 十字星形态用户设置模型
 */
module.exports = (app) => {
  const { STRING, INTEGER, JSON, DATE } = app.Sequelize

  const DojiPatternUserSettings = app.model.define(
    'doji_pattern_user_settings',
    {
      id: {
        type: INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '主键ID',
      },
      userId: {
        type: INTEGER,
        allowNull: false,
        unique: true,
        comment: '用户ID',
        references: {
          model: 'users',
          key: 'id',
        },
      },
      settings: {
        type: JSON,
        allowNull: false,
        comment: '设置数据JSON',
      },
      createdAt: {
        type: DATE,
        allowNull: false,
        defaultValue: app.Sequelize.NOW,
        comment: '创建时间',
      },
      updatedAt: {
        type: DATE,
        allowNull: false,
        defaultValue: app.Sequelize.NOW,
        comment: '更新时间',
      },
    },
    {
      tableName: 'doji_pattern_user_settings',
      comment: '十字星形态用户设置表',
      indexes: [
        {
          unique: true,
          fields: ['userId'],
        },
      ],
    }
  )

  // 关联关系
  DojiPatternUserSettings.associate = function () {
    // 关联用户表
    DojiPatternUserSettings.belongsTo(app.model.User, {
      foreignKey: 'userId',
      as: 'user',
    })
  }

  return DojiPatternUserSettings
}
