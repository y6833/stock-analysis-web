'use strict'

// 全局关联初始化标志，确保整个应用中只初始化一次
let associationInitialized = false

module.exports = (app) => {
  // 仅在应用启动时执行一次关联初始化
  app.beforeStart(async () => {
    // 只在app worker中执行，且只执行一次
    if (app.type === 'application' && !associationInitialized) {
      // 设置全局标志，确保多个worker不会重复初始化
      associationInitialized = true
      console.log('开始初始化模型关联关系...')

      try {
        // 加载所有模型
        const models = app.model.models

        // 按照固定顺序进行关联初始化，以避免循环依赖问题
        // 先关联基础模型
        await initModelAssociations(app, models, ['User', 'Stock'])

        // 然后关联依赖于基础模型的其他模型
        await initModelAssociations(app, models)

        console.log('所有模型关联关系初始化完成')
      } catch (err) {
        console.error('模型关联初始化失败:', err)
      }
    }
  })
}

/**
 * 初始化模型关联
 * @param {Object} app - Egg.js 应用实例
 * @param {Object} models - 所有模型对象
 * @param {Array} priorityModels - 优先初始化的模型名称列表
 */
async function initModelAssociations(app, models, priorityModels = []) {
  // 用于跟踪已经关联的模型
  const associatedModels = new Set(priorityModels.filter((name) => !models[name]))

  // 先初始化优先模型
  if (priorityModels && priorityModels.length > 0) {
    for (const modelName of priorityModels) {
      if (models[modelName] && !associatedModels.has(modelName)) {
        await initSingleModelAssociation(app, models, modelName, associatedModels)
      }
    }
  }

  // 初始化其他模型
  for (const modelName of Object.keys(models)) {
    if (!associatedModels.has(modelName)) {
      await initSingleModelAssociation(app, models, modelName, associatedModels)
    }
  }
}

/**
 * 初始化单个模型的关联
 * @param {Object} app - Egg.js 应用实例
 * @param {Object} models - 所有模型对象
 * @param {String} modelName - 模型名称
 * @param {Set} associatedModels - 已关联的模型集合
 */
async function initSingleModelAssociation(app, models, modelName, associatedModels) {
  // 跳过已经关联的模型
  if (associatedModels.has(modelName)) {
    return
  }

  // 检查模型是否有 associate 方法
  if (models[modelName].associate && typeof models[modelName].associate === 'function') {
    try {
      // 添加唯一性前缀，避免别名冲突
      models[modelName]._associationPrefix = `${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 10)}`

      // 调用 associate 方法
      await models[modelName].associate()

      // 标记为已关联
      associatedModels.add(modelName)
      console.log(`关联模型成功: ${modelName}`)
    } catch (error) {
      console.error(`关联模型失败: ${modelName}`, error)
    }
  }
}
