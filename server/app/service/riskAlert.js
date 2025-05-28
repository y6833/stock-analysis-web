'use strict';

const Service = require('egg').Service;

class RiskAlertService extends Service {
  
  /**
   * 实时风险监控
   * @param {number} userId - 用户ID
   * @param {number} portfolioId - 投资组合ID（可选）
   * @returns {object} 监控结果
   */
  async monitorRisks(userId, portfolioId = null) {
    const { ctx } = this;
    
    try {
      // 获取用户的投资组合
      const portfolios = portfolioId ? 
        [await this.getPortfolioData(userId, portfolioId)] :
        await this.getAllUserPortfolios(userId);

      const monitoringResults = [];

      for (const portfolio of portfolios) {
        if (!portfolio) continue;

        // 计算当前风险指标
        const riskMetrics = await this.calculateCurrentRiskMetrics(portfolio);
        
        // 检查预警规则
        const alerts = await this.checkAlertRules(userId, portfolio.id, riskMetrics);
        
        // 更新监控状态
        await this.updateMonitoringStatus(userId, portfolio.id, riskMetrics, alerts.length);
        
        monitoringResults.push({
          portfolioId: portfolio.id,
          portfolioName: portfolio.name,
          riskMetrics,
          alerts,
          alertCount: alerts.length
        });
      }

      return {
        success: true,
        data: {
          monitoringTime: new Date(),
          portfolios: monitoringResults,
          totalAlerts: monitoringResults.reduce((sum, p) => sum + p.alertCount, 0)
        }
      };

    } catch (error) {
      ctx.logger.error('风险监控失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 检查预警规则
   */
  async checkAlertRules(userId, portfolioId, riskMetrics) {
    const { ctx } = this;
    
    // 获取活跃的预警规则
    const rules = await ctx.model.RiskAlertRule.findAll({
      where: {
        userId,
        portfolioId: [portfolioId, null], // 包括组合特定和全局规则
        isActive: true
      }
    });

    const alerts = [];

    for (const rule of rules) {
      const alertResult = await this.evaluateRule(rule, riskMetrics);
      
      if (alertResult.triggered) {
        // 创建预警记录
        const alertLog = await ctx.model.RiskAlertLog.create({
          userId,
          portfolioId,
          ruleId: rule.id,
          alertTime: new Date(),
          alertLevel: alertResult.level,
          alertMessage: alertResult.message,
          currentValue: alertResult.currentValue,
          thresholdValue: alertResult.thresholdValue,
          alertData: alertResult.data,
          isResolved: false,
          notificationSent: false
        });

        // 发送通知
        await this.sendNotification(rule, alertResult);

        alerts.push({
          id: alertLog.id,
          ruleName: rule.ruleName,
          ruleType: rule.ruleType,
          level: alertResult.level,
          message: alertResult.message,
          currentValue: alertResult.currentValue,
          thresholdValue: alertResult.thresholdValue,
          alertTime: alertLog.alertTime
        });
      }
    }

    return alerts;
  }

  /**
   * 评估预警规则
   */
  async evaluateRule(rule, riskMetrics) {
    const config = rule.thresholdConfig;
    let triggered = false;
    let currentValue = null;
    let thresholdValue = null;
    let message = '';
    let level = rule.alertLevel;
    let data = {};

    switch (rule.ruleType) {
    case 'var_threshold':
      currentValue = riskMetrics.currentVar;
      thresholdValue = config.threshold;
      triggered = currentValue > thresholdValue;
      message = triggered ? 
        `VaR风险值 ${currentValue.toFixed(2)} 超过阈值 ${thresholdValue.toFixed(2)}` :
        '';
      break;

    case 'loss_threshold':
      currentValue = riskMetrics.dailyPnlPercentage;
      thresholdValue = config.threshold;
      triggered = currentValue < -Math.abs(thresholdValue);
      message = triggered ? 
        `日损失 ${(currentValue * 100).toFixed(2)}% 超过阈值 ${(thresholdValue * 100).toFixed(2)}%` :
        '';
      break;

    case 'volatility_threshold':
      currentValue = riskMetrics.volatility;
      thresholdValue = config.threshold;
      triggered = currentValue > thresholdValue;
      message = triggered ? 
        `波动率 ${(currentValue * 100).toFixed(2)}% 超过阈值 ${(thresholdValue * 100).toFixed(2)}%` :
        '';
      break;

    case 'concentration_risk':
      currentValue = riskMetrics.concentrationRisk;
      thresholdValue = config.threshold;
      triggered = currentValue > thresholdValue;
      message = triggered ? 
        `集中度风险 ${(currentValue * 100).toFixed(2)}% 超过阈值 ${(thresholdValue * 100).toFixed(2)}%` :
        '';
      break;

    case 'custom':
      // 自定义规则评估
      const customResult = await this.evaluateCustomRule(config, riskMetrics);
      triggered = customResult.triggered;
      currentValue = customResult.currentValue;
      thresholdValue = customResult.thresholdValue;
      message = customResult.message;
      data = customResult.data;
      break;
    }

    return {
      triggered,
      level,
      message,
      currentValue,
      thresholdValue,
      data
    };
  }

  /**
   * 评估自定义规则
   */
  async evaluateCustomRule(config, riskMetrics) {
    // 这里可以实现复杂的自定义规则逻辑
    // 例如：多个指标的组合条件
    const conditions = config.conditions || [];
    let triggered = false;
    let message = '';
    let data = {};

    for (const condition of conditions) {
      const { metric, operator, value } = condition;
      const currentValue = riskMetrics[metric];
      
      if (currentValue !== undefined) {
        let conditionMet = false;
        
        switch (operator) {
        case '>':
          conditionMet = currentValue > value;
          break;
        case '<':
          conditionMet = currentValue < value;
          break;
        case '>=':
          conditionMet = currentValue >= value;
          break;
        case '<=':
          conditionMet = currentValue <= value;
          break;
        case '==':
          conditionMet = Math.abs(currentValue - value) < 0.0001;
          break;
        }

        if (conditionMet) {
          triggered = true;
          message += `${metric} ${operator} ${value} (当前值: ${currentValue}); `;
          data[metric] = { currentValue, threshold: value, operator };
        }
      }
    }

    return {
      triggered,
      currentValue: null,
      thresholdValue: null,
      message: message.trim(),
      data
    };
  }

  /**
   * 计算当前风险指标
   */
  async calculateCurrentRiskMetrics(portfolio) {
    const { ctx } = this;
    
    // 获取投资组合当前价值
    const currentValue = await this.calculatePortfolioValue(portfolio);
    
    // 获取昨日价值（用于计算日盈亏）
    const yesterdayValue = await this.getYesterdayPortfolioValue(portfolio.id);
    
    // 计算日盈亏
    const dailyPnl = currentValue - yesterdayValue;
    const dailyPnlPercentage = yesterdayValue > 0 ? dailyPnl / yesterdayValue : 0;
    
    // 获取最新的VaR计算结果
    const latestVar = await this.getLatestVaR(portfolio.userId, portfolio.id);
    
    // 计算波动率
    const volatility = await this.calculateVolatility(portfolio);
    
    // 计算最大回撤
    const maxDrawdown = await this.calculateMaxDrawdown(portfolio);
    
    // 计算集中度风险
    const concentrationRisk = await this.calculateConcentrationRisk(portfolio);
    
    return {
      portfolioValue: currentValue,
      dailyPnl,
      dailyPnlPercentage,
      currentVar: latestVar?.varAbsolute || 0,
      volatility,
      maxDrawdown,
      concentrationRisk,
      monitoringTime: new Date()
    };
  }

  /**
   * 计算投资组合当前价值
   */
  async calculatePortfolioValue(portfolio) {
    let totalValue = 0;
    
    for (const holding of portfolio.holdings || []) {
      const currentPrice = await this.getCurrentPrice(holding.stockCode);
      totalValue += holding.quantity * currentPrice;
    }
    
    return totalValue;
  }

  /**
   * 获取昨日投资组合价值
   */
  async getYesterdayPortfolioValue(portfolioId) {
    const { ctx } = this;
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const status = await ctx.model.RiskMonitoringStatus.findOne({
      where: {
        portfolioId,
        monitoringDate: {
          [ctx.app.Sequelize.Op.gte]: yesterday.toISOString().split('T')[0]
        }
      },
      order: [['monitoringDate', 'DESC']]
    });
    
    return status ? parseFloat(status.portfolioValue) : 0;
  }

  /**
   * 获取最新VaR计算结果
   */
  async getLatestVaR(userId, portfolioId) {
    const { ctx } = this;
    
    return await ctx.model.VarCalculation.findOne({
      where: { userId, portfolioId },
      order: [['calculationDate', 'DESC']]
    });
  }

  /**
   * 计算波动率
   */
  async calculateVolatility(portfolio) {
    // 简化实现：基于最近30天的价格变动计算
    // 实际应用中应使用更精确的方法
    return 0.02; // 默认2%日波动率
  }

  /**
   * 计算最大回撤
   */
  async calculateMaxDrawdown(portfolio) {
    const { ctx } = this;
    
    // 获取最近30天的投资组合价值历史
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const history = await ctx.model.RiskMonitoringStatus.findAll({
      where: {
        portfolioId: portfolio.id,
        monitoringDate: {
          [ctx.app.Sequelize.Op.gte]: thirtyDaysAgo
        }
      },
      order: [['monitoringDate', 'ASC']]
    });
    
    if (history.length < 2) return 0;
    
    let maxDrawdown = 0;
    let peak = parseFloat(history[0].portfolioValue);
    
    for (const record of history) {
      const value = parseFloat(record.portfolioValue);
      peak = Math.max(peak, value);
      const drawdown = (peak - value) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    
    return maxDrawdown;
  }

  /**
   * 计算集中度风险
   */
  async calculateConcentrationRisk(portfolio) {
    if (!portfolio.holdings || portfolio.holdings.length === 0) return 0;
    
    // 计算最大持仓权重
    let totalValue = 0;
    const weights = [];
    
    for (const holding of portfolio.holdings) {
      const currentPrice = await this.getCurrentPrice(holding.stockCode);
      const value = holding.quantity * currentPrice;
      totalValue += value;
      weights.push(value);
    }
    
    if (totalValue === 0) return 0;
    
    // 计算权重并找出最大权重
    const maxWeight = Math.max(...weights.map(w => w / totalValue));
    
    return maxWeight;
  }

  /**
   * 获取当前股价
   */
  async getCurrentPrice(stockCode) {
    const { ctx } = this;
    
    try {
      const cacheKey = `current_price:${stockCode}`;
      let price = await ctx.app.redis.get(cacheKey);
      
      if (!price) {
        const quote = await ctx.service.stock.getStockQuote(stockCode);
        price = quote.current || quote.close || 0;
        await ctx.app.redis.setex(cacheKey, 300, price);
      }
      
      return parseFloat(price);
    } catch (error) {
      ctx.logger.warn(`获取股价失败 ${stockCode}:`, error.message);
      return 0;
    }
  }

  /**
   * 获取投资组合数据
   */
  async getPortfolioData(userId, portfolioId) {
    const { ctx } = this;
    
    return await ctx.model.UserPortfolio.findOne({
      where: { id: portfolioId, userId },
      include: [{
        model: ctx.model.PortfolioHolding,
        as: 'holdings'
      }]
    });
  }

  /**
   * 获取用户所有投资组合
   */
  async getAllUserPortfolios(userId) {
    const { ctx } = this;
    
    return await ctx.model.UserPortfolio.findAll({
      where: { userId },
      include: [{
        model: ctx.model.PortfolioHolding,
        as: 'holdings'
      }]
    });
  }

  /**
   * 更新监控状态
   */
  async updateMonitoringStatus(userId, portfolioId, riskMetrics, alertCount) {
    const { ctx } = this;
    
    const today = new Date().toISOString().split('T')[0];
    
    // 查找今日记录
    let status = await ctx.model.RiskMonitoringStatus.findOne({
      where: {
        userId,
        portfolioId,
        monitoringDate: {
          [ctx.app.Sequelize.Op.gte]: today
        }
      }
    });

    const statusData = {
      userId,
      portfolioId,
      monitoringDate: new Date(),
      portfolioValue: riskMetrics.portfolioValue,
      dailyPnl: riskMetrics.dailyPnl,
      dailyPnlPercentage: riskMetrics.dailyPnlPercentage,
      currentVar: riskMetrics.currentVar,
      volatility: riskMetrics.volatility,
      maxDrawdown: riskMetrics.maxDrawdown,
      concentrationRisk: riskMetrics.concentrationRisk,
      riskMetrics: {
        monitoringTime: riskMetrics.monitoringTime
      },
      alertCount
    };

    if (status) {
      await status.update(statusData);
    } else {
      await ctx.model.RiskMonitoringStatus.create(statusData);
    }
  }

  /**
   * 发送通知
   */
  async sendNotification(rule, alertResult) {
    const { ctx } = this;
    
    try {
      const notificationConfig = rule.notificationConfig || {};
      
      // 这里可以实现多种通知方式
      if (notificationConfig.email) {
        // 发送邮件通知
        await this.sendEmailNotification(rule, alertResult);
      }
      
      if (notificationConfig.sms) {
        // 发送短信通知
        await this.sendSmsNotification(rule, alertResult);
      }
      
      if (notificationConfig.webhook) {
        // 发送Webhook通知
        await this.sendWebhookNotification(rule, alertResult);
      }
      
      // 系统内通知
      await ctx.service.notification.createNotification({
        userId: rule.userId,
        type: 'risk_alert',
        title: `风险预警: ${rule.ruleName}`,
        content: alertResult.message,
        level: alertResult.level,
        data: {
          ruleId: rule.id,
          alertLevel: alertResult.level,
          currentValue: alertResult.currentValue,
          thresholdValue: alertResult.thresholdValue
        }
      });
      
    } catch (error) {
      ctx.logger.error('发送预警通知失败:', error);
    }
  }

  /**
   * 发送邮件通知
   */
  async sendEmailNotification(rule, alertResult) {
    // 实现邮件发送逻辑
    // 这里可以集成邮件服务
  }

  /**
   * 发送短信通知
   */
  async sendSmsNotification(rule, alertResult) {
    // 实现短信发送逻辑
    // 这里可以集成短信服务
  }

  /**
   * 发送Webhook通知
   */
  async sendWebhookNotification(rule, alertResult) {
    // 实现Webhook发送逻辑
    // 这里可以向指定URL发送POST请求
  }
}

module.exports = RiskAlertService;
