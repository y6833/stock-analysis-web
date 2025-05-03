'use strict';

module.exports = app => {
  const { STRING, INTEGER, TEXT, DATE } = app.Sequelize;

  const PageGroup = app.model.define('page_group', {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: STRING(50),
      allowNull: false,
      comment: '组名称',
    },
    description: {
      type: TEXT,
      allowNull: true,
      comment: '组描述',
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

  PageGroup.associate = function() {
    // 页面关联
    this.belongsToMany(app.model.SystemPage, {
      through: app.model.PageGroupMapping,
      foreignKey: 'groupId',
      otherKey: 'pageId',
      as: 'pages',
    });
  };

  return PageGroup;
};
