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

  PageGroup.associate = function () {    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || '';
    

    // 防止重复关联
    if (PageGroup.associations && Object.keys(PageGroup.associations).length > 0) {
      return;
    }

    // 页面关联
    this.belongsToMany(app.model.SystemPage, {
      through: app.model.PageGroupMapping,
      foreignKey: 'groupId',
      otherKey: 'pageId',
      as: `${prefix}_${prefix}_groupSystemPages`,
    });
  };

  return PageGroup;
};
