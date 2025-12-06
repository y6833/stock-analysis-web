'use strict'

module.exports = (app) => {
  const { INTEGER, STRING, TEXT, DECIMAL, DATE, BOOLEAN, JSON } = app.Sequelize

  const DeepseekApiUsage = app.model.define(
    'deepseek_api_usage',
    {
      id: {
        type: INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      requestId: {
        type: STRING(64),
        allowNull: false,
        field: 'request_id',
        comment: '请求唯一标识',
      },
      userId: {
        type: INTEGER.UNSIGNED,
        allowNull: true,
        field: 'user_id',
        comment: '用户ID，可为空（系统调用）',
      },
      apiEndpoint: {
        type: STRING(100),
        allowNull: false,
        field: 'api_endpoint',
        comment: 'API端点路径',
      },
      method: {
        type: STRING(10),
        allowNull: false,
        defaultValue: 'POST',
        comment: 'HTTP方法',
      },
      model: {
        type: STRING(50),
        allowNull: false,
        comment: '使用的AI模型',
      },
      promptTokens: {
        type: INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        field: 'prompt_tokens',
        comment: '输入Token数量',
      },
      completionTokens: {
        type: INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        field: 'completion_tokens',
        comment: '输出Token数量',
      },
      totalTokens: {
        type: INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        field: 'total_tokens',
        comment: '总Token数量',
      },
      responseTimeMs: {
        type: INTEGER.UNSIGNED,
        allowNull: false,
        field: 'response_time_ms',
        comment: '响应时间（毫秒）',
      },
      costCents: {
        type: INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        field: 'cost_cents',
        comment: '成本（美分）',
      },
      success: {
        type: BOOLEAN,
        allowNull: false,
        comment: '请求是否成功',
      },
      statusCode: {
        type: INTEGER,
        allowNull: true,
        field: 'status_code',
        comment: 'HTTP状态码',
      },
      errorMessage: {
        type: TEXT,
        allowNull: true,
        field: 'error_message',
        comment: '错误信息',
      },
      errorCode: {
        type: STRING(50),
        allowNull: true,
        field: 'error_code',
        comment: '错误代码',
      },
      requestData: {
        type: JSON,
        allowNull: true,
        field: 'request_data',
        comment: '请求数据（JSON格式，敏感信息已脱敏）',
      },
      responseData: {
        type: JSON,
        allowNull: true,
        field: 'response_data',
        comment: '响应数据摘要（JSON格式）',
      },
      userAgent: {
        type: STRING(255),
        allowNull: true,
        field: 'user_agent',
        comment: '用户代理',
      },
      ipAddress: {
        type: STRING(45),
        allowNull: true,
        field: 'ip_address',
        comment: 'IP地址',
      },
      sessionId: {
        type: STRING(64),
        allowNull: true,
        field: 'session_id',
        comment: '会话ID',
      },
      createdAt: {
        type: DATE,
        allowNull: false,
        field: 'created_at',
      },
    },
    {
      tableName: 'deepseek_api_usage',
      underscored: true,
      updatedAt: false, // 使用记录不需要更新时间
      indexes: [
        {
          name: 'idx_request_id',
          fields: ['request_id'],
        },
        {
          name: 'idx_user_created',
          fields: ['user_id', 'created_at'],
        },
        {
          name: 'idx_endpoint',
          fields: ['api_endpoint'],
        },
        {
          name: 'idx_success',
          fields: ['success'],
        },
        {
          name: 'idx_created_at',
          fields: ['created_at'],
        },
        {
          name: 'idx_model',
          fields: ['model'],
        },
      ],
    }
  )

  DeepseekApiUsage.associate = function () {
    const prefix = this._associationPrefix || ''

    // 关联用户
    this.belongsTo(app.model.User, {
      foreignKey: 'userId',
      as: `${prefix}_user`,
    })
  }

  // 实例方法
  DeepseekApiUsage.prototype.getCostUSD = function () {
    return this.costCents / 100
  }

  DeepseekApiUsage.prototype.getCostCNY = function (exchangeRate = 7.2) {
    return (this.costCents / 100) * exchangeRate
  }

  DeepseekApiUsage.prototype.getEfficiency = function () {
    if (this.responseTimeMs === 0 || this.totalTokens === 0) {
      return 0
    }
    return this.totalTokens / (this.responseTimeMs / 1000) // tokens per second
  }

  // 类方法
  DeepseekApiUsage.recordUsage = async function (data) {
    const {
      requestId,
      userId,
      apiEndpoint,
      method = 'POST',
      model,
      promptTokens = 0,
      completionTokens = 0,
      totalTokens = 0,
      responseTimeMs,
      success,
      statusCode,
      errorMessage,
      errorCode,
      requestData,
      responseData,
      userAgent,
      ipAddress,
      sessionId,
    } = data

    // 计算成本（基于DeepSeek定价）
    const costCents = this.calculateCost(promptTokens, completionTokens, model)

    return await this.create({
      requestId,
      userId,
      apiEndpoint,
      method,
      model,
      promptTokens,
      completionTokens,
      totalTokens: totalTokens || promptTokens + completionTokens,
      responseTimeMs,
      costCents,
      success,
      statusCode,
      errorMessage,
      errorCode,
      requestData: this.sanitizeRequestData(requestData),
      responseData: this.sanitizeResponseData(responseData),
      userAgent,
      ipAddress,
      sessionId,
    })
  }

  DeepseekApiUsage.calculateCost = function (
    promptTokens,
    completionTokens,
    model = 'deepseek-chat'
  ) {
    // DeepSeek API 定价 (每1000 tokens的价格，单位：美分)
    const pricing = {
      'deepseek-chat': {
        input: 0.14, // $0.0014 per 1K tokens
        output: 0.28, // $0.0028 per 1K tokens
      },
      'deepseek-coder': {
        input: 0.14,
        output: 0.28,
      },
    }

    const modelPricing = pricing[model] || pricing['deepseek-chat']
    const inputCost = (promptTokens / 1000) * modelPricing.input
    const outputCost = (completionTokens / 1000) * modelPricing.output

    return Math.ceil((inputCost + outputCost) * 100) // 转换为美分并向上取整
  }

  DeepseekApiUsage.sanitizeRequestData = function (requestData) {
    if (!requestData) return null

    // 移除敏感信息
    const sanitized = { ...requestData }
    delete sanitized.token
    delete sanitized.apiKey
    delete sanitized.authorization

    // 限制数据大小
    const jsonString = JSON.stringify(sanitized)
    if (jsonString.length > 10000) {
      return { ...sanitized, _truncated: true, _originalSize: jsonString.length }
    }

    return sanitized
  }

  DeepseekApiUsage.sanitizeResponseData = function (responseData) {
    if (!responseData) return null

    // 只保留关键信息
    const sanitized = {
      id: responseData.id,
      object: responseData.object,
      model: responseData.model,
      usage: responseData.usage,
      choices: responseData.choices
        ? responseData.choices.map((choice) => ({
            index: choice.index,
            finish_reason: choice.finish_reason,
            message: choice.message
              ? {
                  role: choice.message.role,
                  content: choice.message.content
                    ? choice.message.content.substring(0, 500) +
                      (choice.message.content.length > 500 ? '...' : '')
                    : null,
                }
              : null,
          }))
        : null,
    }

    return sanitized
  }

  DeepseekApiUsage.getUsageStats = async function (options = {}) {
    const { userId, startDate, endDate, model, apiEndpoint, success } = options

    const whereClause = {}

    if (userId) whereClause.userId = userId
    if (model) whereClause.model = model
    if (apiEndpoint) whereClause.apiEndpoint = apiEndpoint
    if (success !== undefined) whereClause.success = success

    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) whereClause.createdAt[app.Sequelize.Op.gte] = startDate
      if (endDate) whereClause.createdAt[app.Sequelize.Op.lte] = endDate
    }

    const [stats] = await this.findAll({
      attributes: [
        [app.Sequelize.fn('COUNT', app.Sequelize.col('id')), 'totalRequests'],
        [
          app.Sequelize.fn('SUM', app.Sequelize.literal('CASE WHEN success = 1 THEN 1 ELSE 0 END')),
          'successfulRequests',
        ],
        [app.Sequelize.fn('SUM', app.Sequelize.col('total_tokens')), 'totalTokens'],
        [app.Sequelize.fn('SUM', app.Sequelize.col('cost_cents')), 'totalCostCents'],
        [app.Sequelize.fn('AVG', app.Sequelize.col('response_time_ms')), 'avgResponseTime'],
        [app.Sequelize.fn('MAX', app.Sequelize.col('response_time_ms')), 'maxResponseTime'],
        [app.Sequelize.fn('MIN', app.Sequelize.col('response_time_ms')), 'minResponseTime'],
      ],
      where: whereClause,
      raw: true,
    })

    const totalRequests = parseInt(stats.totalRequests) || 0
    const successfulRequests = parseInt(stats.successfulRequests) || 0

    return {
      totalRequests,
      successfulRequests,
      failedRequests: totalRequests - successfulRequests,
      successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
      totalTokens: parseInt(stats.totalTokens) || 0,
      totalCostUSD: (parseInt(stats.totalCostCents) || 0) / 100,
      totalCostCNY: ((parseInt(stats.totalCostCents) || 0) / 100) * 7.2,
      averageResponseTime: parseFloat(stats.avgResponseTime) || 0,
      maxResponseTime: parseInt(stats.maxResponseTime) || 0,
      minResponseTime: parseInt(stats.minResponseTime) || 0,
    }
  }

  DeepseekApiUsage.getDailyStats = async function (days = 7, userId = null) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    const whereClause = {
      createdAt: {
        [app.Sequelize.Op.gte]: startDate,
      },
    }

    if (userId) whereClause.userId = userId

    const results = await this.findAll({
      attributes: [
        [app.Sequelize.fn('DATE', app.Sequelize.col('created_at')), 'date'],
        [app.Sequelize.fn('COUNT', app.Sequelize.col('id')), 'requests'],
        [app.Sequelize.fn('SUM', app.Sequelize.col('total_tokens')), 'tokens'],
        [app.Sequelize.fn('SUM', app.Sequelize.col('cost_cents')), 'costCents'],
        [app.Sequelize.fn('AVG', app.Sequelize.col('response_time_ms')), 'avgResponseTime'],
      ],
      where: whereClause,
      group: [app.Sequelize.fn('DATE', app.Sequelize.col('created_at'))],
      order: [[app.Sequelize.fn('DATE', app.Sequelize.col('created_at')), 'ASC']],
      raw: true,
    })

    return results.map((result) => ({
      date: result.date,
      requests: parseInt(result.requests),
      tokens: parseInt(result.tokens) || 0,
      costUSD: (parseInt(result.costCents) || 0) / 100,
      costCNY: ((parseInt(result.costCents) || 0) / 100) * 7.2,
      averageResponseTime: parseFloat(result.avgResponseTime) || 0,
    }))
  }

  DeepseekApiUsage.getTopUsers = async function (limit = 10, days = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const results = await this.findAll({
      attributes: [
        'userId',
        [app.Sequelize.fn('COUNT', app.Sequelize.col('id')), 'requests'],
        [app.Sequelize.fn('SUM', app.Sequelize.col('total_tokens')), 'tokens'],
        [app.Sequelize.fn('SUM', app.Sequelize.col('cost_cents')), 'costCents'],
      ],
      where: {
        createdAt: {
          [app.Sequelize.Op.gte]: startDate,
        },
        userId: {
          [app.Sequelize.Op.ne]: null,
        },
      },
      group: ['userId'],
      order: [[app.Sequelize.fn('SUM', app.Sequelize.col('cost_cents')), 'DESC']],
      limit,
      raw: true,
    })

    return results.map((result) => ({
      userId: result.userId,
      requests: parseInt(result.requests),
      tokens: parseInt(result.tokens) || 0,
      costUSD: (parseInt(result.costCents) || 0) / 100,
      costCNY: ((parseInt(result.costCents) || 0) / 100) * 7.2,
    }))
  }

  DeepseekApiUsage.getErrorStats = async function (days = 7) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const results = await this.findAll({
      attributes: [
        'errorCode',
        'statusCode',
        [app.Sequelize.fn('COUNT', app.Sequelize.col('id')), 'count'],
        [app.Sequelize.fn('AVG', app.Sequelize.col('response_time_ms')), 'avgResponseTime'],
      ],
      where: {
        createdAt: {
          [app.Sequelize.Op.gte]: startDate,
        },
        success: false,
      },
      group: ['errorCode', 'statusCode'],
      order: [[app.Sequelize.fn('COUNT', app.Sequelize.col('id')), 'DESC']],
      raw: true,
    })

    return results.map((result) => ({
      errorCode: result.errorCode,
      statusCode: result.statusCode,
      count: parseInt(result.count),
      averageResponseTime: parseFloat(result.avgResponseTime) || 0,
    }))
  }

  DeepseekApiUsage.checkQuotaAlert = async function (userId, dailyLimit = 1000, costLimit = 10.0) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayStats = await this.getUsageStats({
      userId,
      startDate: today,
    })

    const alerts = []

    // 检查请求数量限制
    if (todayStats.totalRequests >= dailyLimit * 0.9) {
      alerts.push({
        type: 'request_quota',
        level: todayStats.totalRequests >= dailyLimit ? 'critical' : 'warning',
        message: `今日API请求数量: ${todayStats.totalRequests}/${dailyLimit}`,
        usage: todayStats.totalRequests,
        limit: dailyLimit,
      })
    }

    // 检查成本限制
    if (todayStats.totalCostUSD >= costLimit * 0.9) {
      alerts.push({
        type: 'cost_quota',
        level: todayStats.totalCostUSD >= costLimit ? 'critical' : 'warning',
        message: `今日API成本: $${todayStats.totalCostUSD.toFixed(4)}/$${costLimit.toFixed(2)}`,
        usage: todayStats.totalCostUSD,
        limit: costLimit,
      })
    }

    return alerts
  }

  return DeepseekApiUsage
}
