'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 创建 AI 推荐历史表
    await queryInterface.createTable('ai_recommendation_history', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        comment: '用户ID，可为空（匿名推荐）',
      },
      request_id: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
        comment: '请求唯一标识',
      },
      stock_symbol: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: '股票代码',
      },
      stock_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: '股票名称',
      },
      recommendation_type: {
        type: Sequelize.ENUM('strong_buy', 'buy', 'hold', 'sell', 'strong_sell'),
        allowNull: false,
        comment: '推荐类型',
      },
      confidence_score: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        comment: '置信度分数 (0-100)',
      },
      ai_analysis: {
        type: Sequelize.TEXT('long'),
        allowNull: true,
        comment: 'AI分析结果（JSON格式）',
      },
      reasoning: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '推荐理由',
      },
      risk_level: {
        type: Sequelize.ENUM('low', 'medium', 'high'),
        allowNull: false,
        comment: '风险等级',
      },
      expected_return: {
        type: Sequelize.DECIMAL(8, 4),
        allowNull: true,
        comment: '预期收益率',
      },
      target_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: '目标价格',
      },
      stop_loss_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: '止损价格',
      },
      current_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: '推荐时的当前价格',
      },
      time_horizon: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: '投资时间范围',
      },
      analysis_type: {
        type: Sequelize.ENUM('basic', 'detailed', 'comprehensive'),
        allowNull: false,
        comment: '分析类型',
      },
      user_preferences: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: '用户偏好设置（JSON格式）',
      },
      market_data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: '市场数据快照（JSON格式）',
      },
      tokens_used: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: 'AI分析使用的Token数量',
      },
      processing_time: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '处理时间（毫秒）',
      },
      actual_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: '实际价格（用于性能跟踪）',
      },
      actual_return: {
        type: Sequelize.DECIMAL(8, 4),
        allowNull: true,
        comment: '实际收益率',
      },
      performance_updated_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '性能数据最后更新时间',
      },
      status: {
        type: Sequelize.ENUM('active', 'expired', 'achieved', 'stopped'),
        allowNull: false,
        defaultValue: 'active',
        comment: '推荐状态',
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '推荐过期时间',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    })

    // 创建索引
    await queryInterface.addIndex('ai_recommendation_history', ['user_id', 'created_at'], {
      name: 'idx_user_created',
    })
    await queryInterface.addIndex('ai_recommendation_history', ['stock_symbol', 'created_at'], {
      name: 'idx_symbol_created',
    })
    await queryInterface.addIndex('ai_recommendation_history', ['recommendation_type'], {
      name: 'idx_recommendation_type',
    })
    await queryInterface.addIndex('ai_recommendation_history', ['risk_level'], {
      name: 'idx_risk_level',
    })
    await queryInterface.addIndex('ai_recommendation_history', ['status'], {
      name: 'idx_status',
    })
    await queryInterface.addIndex('ai_recommendation_history', ['expires_at'], {
      name: 'idx_expires_at',
    })

    // 创建 AI 分析缓存表
    await queryInterface.createTable('ai_analysis_cache', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      stock_symbol: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: '股票代码',
      },
      analysis_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: '分析类型（technical, fundamental, comprehensive等）',
      },
      cache_key: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: '缓存键（由股票代码、分析类型、参数hash组成）',
      },
      analysis_data: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: '分析结果数据（JSON格式）',
      },
      confidence_score: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: '分析置信度分数',
      },
      data_version: {
        type: Sequelize.STRING(32),
        allowNull: true,
        comment: '数据版本号（用于判断数据是否过期）',
      },
      parameters: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: '分析参数（JSON格式）',
      },
      tokens_used: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '生成分析使用的Token数量',
      },
      hit_count: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '缓存命中次数',
      },
      last_hit_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '最后命中时间',
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: '过期时间',
      },
      is_valid: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: '缓存是否有效',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    })

    // 创建缓存表索引
    await queryInterface.addIndex('ai_analysis_cache', ['cache_key'], {
      name: 'idx_cache_key',
      unique: true,
    })
    await queryInterface.addIndex('ai_analysis_cache', ['stock_symbol', 'analysis_type'], {
      name: 'idx_symbol_type',
    })
    await queryInterface.addIndex('ai_analysis_cache', ['expires_at'], {
      name: 'idx_expires_at',
    })
    await queryInterface.addIndex('ai_analysis_cache', ['is_valid'], {
      name: 'idx_is_valid',
    })
    await queryInterface.addIndex('ai_analysis_cache', ['created_at'], {
      name: 'idx_created_at',
    })

    // 创建 DeepSeek API 使用统计表
    await queryInterface.createTable('deepseek_api_usage', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      request_id: {
        type: Sequelize.STRING(64),
        allowNull: false,
        comment: '请求唯一标识',
      },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        comment: '用户ID，可为空（系统调用）',
      },
      api_endpoint: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'API端点路径',
      },
      method: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'POST',
        comment: 'HTTP方法',
      },
      model: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: '使用的AI模型',
      },
      prompt_tokens: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '输入Token数量',
      },
      completion_tokens: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '输出Token数量',
      },
      total_tokens: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '总Token数量',
      },
      response_time_ms: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        comment: '响应时间（毫秒）',
      },
      cost_cents: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '成本（美分）',
      },
      success: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        comment: '请求是否成功',
      },
      status_code: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'HTTP状态码',
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '错误信息',
      },
      error_code: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: '错误代码',
      },
      request_data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: '请求数据（JSON格式，敏感信息已脱敏）',
      },
      response_data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: '响应数据摘要（JSON格式）',
      },
      user_agent: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: '用户代理',
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'IP地址',
      },
      session_id: {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: '会话ID',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    })

    // 创建API使用统计表索引
    await queryInterface.addIndex('deepseek_api_usage', ['request_id'], {
      name: 'idx_request_id',
    })
    await queryInterface.addIndex('deepseek_api_usage', ['user_id', 'created_at'], {
      name: 'idx_user_created',
    })
    await queryInterface.addIndex('deepseek_api_usage', ['api_endpoint'], {
      name: 'idx_endpoint',
    })
    await queryInterface.addIndex('deepseek_api_usage', ['success'], {
      name: 'idx_success',
    })
    await queryInterface.addIndex('deepseek_api_usage', ['created_at'], {
      name: 'idx_created_at',
    })
    await queryInterface.addIndex('deepseek_api_usage', ['model'], {
      name: 'idx_model',
    })

    console.log('AI推荐相关数据表创建完成')
  },

  down: async (queryInterface, Sequelize) => {
    // 删除表（按依赖关系逆序）
    await queryInterface.dropTable('deepseek_api_usage')
    await queryInterface.dropTable('ai_analysis_cache')
    await queryInterface.dropTable('ai_recommendation_history')

    console.log('AI推荐相关数据表删除完成')
  },
}
