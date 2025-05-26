'use strict';

module.exports = app => {
  // 确保所有模型都已加载
  app.beforeStart(async () => {
    // 加载所有模型
    const models = app.model.models;

    // 用于跟踪已经关联的模型
    const associatedModels = new Set();

    // 建立模型之间的关联关系
    Object.keys(models).forEach(modelName => {
      // 跳过已经关联的模型
      if (associatedModels.has(modelName)) {
        return;
      }

      // 检查模型是否有 associate 方法
      if (models[modelName].associate && typeof models[modelName].associate === 'function') {
        try {
          // 调用 associate 方法
          models[modelName].associate();
          // 标记为已关联
          associatedModels.add(modelName);
          console.log(`关联模型成功: ${modelName}`);
        } catch (error) {
          console.error(`关联模型失败: ${modelName}`, error);
        }
      }
    });

    // 所有模型关联关系已在各自的模型文件中定义
    console.log('所有模型关联关系已在各自的模型文件中定义');
  });
};
