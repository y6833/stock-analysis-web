'use strict';

module.exports = app => {
  const { INTEGER, DATE } = app.Sequelize;

  const PageGroupMapping = app.model.define('page_group_mapping', {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    groupId: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      field: 'group_id',
      comment: '组ID',
    },
    pageId: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      field: 'page_id',
      comment: '页面ID',
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

  PageGroupMapping.associate = function() {
    // 页面组关联
    this.belongsTo(app.model.PageGroup, { foreignKey: 'groupId', as: 'group' });
    
    // 页面关联
    this.belongsTo(app.model.SystemPage, { foreignKey: 'pageId', as: 'page' });
  };

  return PageGroupMapping;
};
