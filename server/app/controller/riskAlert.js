'use strict';

const Controller = require('egg').Controller;

class RiskAlertController extends Controller {

  /**
   * 创建预警规则
   */
  async createRule() {
    const { ctx } = this;
    const { user } = ctx.state;
    
    try {
      const {
        portfolioId,
        ruleName,
        ruleType,
        alertLevel,
        thresholdConfig,
        notificationConfig
      } = ctx.request.body;

      // 验证必填字段
      if (!ruleName || !ruleType || !thresholdConfig) {
        ctx.body = {
          success: false,
          message: '规则名称、类型和阈值配置不能为空'
        };
        return;
      }

      // 创建预警规则
      const rule = await ctx.model.RiskAlertRule.create({
        userId: user.id,
        portfolioId: portfolioId || null,
        ruleName,
        ruleType,
        alertLevel: alertLevel || 'warning',
        thresholdConfig,
        notificationConfig: notificationConfig || null,
        isActive: true
      });

      ctx.body = {
        success: true,
        message: '预警规则创建成功',
        data: rule
      };

    } catch (error) {
      ctx.logger.error('创建预警规则失败:', error);
      ctx.body = {
        success: false,
        message: '创建规则失败: ' + error.message
      };
    }
  }

  /**
   * 获取用户的预警规则列表
   */
  async getRules() {
    const { ctx } = this;
    const { user } = ctx.state;
    
    try {
      const rules = await ctx.model.RiskAlertRule.findAll({
        where: { userId: user.id },
        include: [{
          model: ctx.model.UserPortfolio,
          as: 'portfolio',
          attributes: ['id', 'name']
        }],
        order: [['createdAt', 'DESC']]
      });

      ctx.body = {
        success: true,
        data: rules
      };

    } catch (error) {
      ctx.logger.error('获取预警规则失败:', error);
      ctx.body = {
        success: false,
        message: '获取规则失败: ' + error.message
      };
    }
  }

  /**
   * 更新预警规则
   */
  async updateRule() {
    const { ctx } = this;
    const { user } = ctx.state;
    const { id } = ctx.params;
    
    try {
      const rule = await ctx.model.RiskAlertRule.findOne({
        where: { id, userId: user.id }
      });

      if (!rule) {
        ctx.body = {
          success: false,
          message: '预警规则不存在'
        };
        return;
      }

      const updateData = ctx.request.body;
      await rule.update(updateData);

      ctx.body = {
        success: true,
        message: '规则更新成功',
        data: rule
      };

    } catch (error) {
      ctx.logger.error('更新预警规则失败:', error);
      ctx.body = {
        success: false,
        message: '更新规则失败: ' + error.message
      };
    }
  }

  /**
   * 删除预警规则
   */
  async deleteRule() {
    const { ctx } = this;
    const { user } = ctx.state;
    const { id } = ctx.params;
    
    try {
      const rule = await ctx.model.RiskAlertRule.findOne({
        where: { id, userId: user.id }
      });

      if (!rule) {
        ctx.body = {
          success: false,
          message: '预警规则不存在'
        };
        return;
      }

      await rule.destroy();

      ctx.body = {
        success: true,
        message: '规则删除成功'
      };

    } catch (error) {
      ctx.logger.error('删除预警规则失败:', error);
      ctx.body = {
        success: false,
        message: '删除规则失败: ' + error.message
      };
    }
  }

  /**
   * 执行实时风险监控
   */
  async monitorRisks() {
    const { ctx } = this;
    const { user } = ctx.state;
    const { portfolioId } = ctx.query;
    
    try {
      const result = await ctx.service.riskAlert.monitorRisks(
        user.id,
        portfolioId ? parseInt(portfolioId) : null
      );

      ctx.body = result;

    } catch (error) {
      ctx.logger.error('风险监控失败:', error);
      ctx.body = {
        success: false,
        message: '风险监控失败: ' + error.message
      };
    }
  }

  /**
   * 获取预警历史记录
   */
  async getAlertHistory() {
    const { ctx } = this;
    const { user } = ctx.state;
    const { portfolioId, level, resolved, limit } = ctx.query;
    
    try {
      const whereCondition = { userId: user.id };
      
      if (portfolioId) {
        whereCondition.portfolioId = parseInt(portfolioId);
      }
      
      if (level) {
        whereCondition.alertLevel = level;
      }
      
      if (resolved !== undefined) {
        whereCondition.isResolved = resolved === 'true';
      }

      const alerts = await ctx.model.RiskAlertLog.findAll({
        where: whereCondition,
        order: [['alertTime', 'DESC']],
        limit: limit ? parseInt(limit) : 50,
        include: [{
          model: ctx.model.RiskAlertRule,
          as: 'rule',
          attributes: ['ruleName', 'ruleType']
        }, {
          model: ctx.model.UserPortfolio,
          as: 'portfolio',
          attributes: ['id', 'name']
        }]
      });

      ctx.body = {
        success: true,
        data: alerts.map(alert => ({
          id: alert.id,
          alertTime: alert.alertTime,
          alertLevel: alert.alertLevel,
          alertMessage: alert.alertMessage,
          currentValue: alert.currentValue,
          thresholdValue: alert.thresholdValue,
          isResolved: alert.isResolved,
          resolvedAt: alert.resolvedAt,
          ruleName: alert.rule?.ruleName,
          ruleType: alert.rule?.ruleType,
          portfolioName: alert.portfolio?.name
        }))
      };

    } catch (error) {
      ctx.logger.error('获取预警历史失败:', error);
      ctx.body = {
        success: false,
        message: '获取历史记录失败: ' + error.message
      };
    }
  }

  /**
   * 解决预警
   */
  async resolveAlert() {
    const { ctx } = this;
    const { user } = ctx.state;
    const { id } = ctx.params;
    
    try {
      const alert = await ctx.model.RiskAlertLog.findOne({
        where: { id, userId: user.id }
      });

      if (!alert) {
        ctx.body = {
          success: false,
          message: '预警记录不存在'
        };
        return;
      }

      await alert.update({
        isResolved: true,
        resolvedAt: new Date()
      });

      ctx.body = {
        success: true,
        message: '预警已标记为解决'
      };

    } catch (error) {
      ctx.logger.error('解决预警失败:', error);
      ctx.body = {
        success: false,
        message: '操作失败: ' + error.message
      };
    }
  }

  /**
   * 批量解决预警
   */
  async batchResolveAlerts() {
    const { ctx } = this;
    const { user } = ctx.state;
    const { alertIds } = ctx.request.body;
    
    try {
      if (!Array.isArray(alertIds) || alertIds.length === 0) {
        ctx.body = {
          success: false,
          message: '预警ID列表不能为空'
        };
        return;
      }

      await ctx.model.RiskAlertLog.update(
        {
          isResolved: true,
          resolvedAt: new Date()
        },
        {
          where: {
            id: alertIds,
            userId: user.id
          }
        }
      );

      ctx.body = {
        success: true,
        message: `已解决 ${alertIds.length} 个预警`
      };

    } catch (error) {
      ctx.logger.error('批量解决预警失败:', error);
      ctx.body = {
        success: false,
        message: '批量操作失败: ' + error.message
      };
    }
  }

  /**
   * 获取风险监控状态
   */
  async getMonitoringStatus() {
    const { ctx } = this;
    const { user } = ctx.state;
    const { portfolioId, days } = ctx.query;
    
    try {
      const whereCondition = { userId: user.id };
      
      if (portfolioId) {
        whereCondition.portfolioId = parseInt(portfolioId);
      }
      
      if (days) {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(days));
        whereCondition.monitoringDate = {
          [ctx.app.Sequelize.Op.gte]: daysAgo
        };
      }

      const statusRecords = await ctx.model.RiskMonitoringStatus.findAll({
        where: whereCondition,
        order: [['monitoringDate', 'DESC']],
        limit: 100,
        include: [{
          model: ctx.model.UserPortfolio,
          as: 'portfolio',
          attributes: ['id', 'name']
        }]
      });

      ctx.body = {
        success: true,
        data: statusRecords
      };

    } catch (error) {
      ctx.logger.error('获取监控状态失败:', error);
      ctx.body = {
        success: false,
        message: '获取状态失败: ' + error.message
      };
    }
  }

  /**
   * 获取预警仪表盘数据
   */
  async getAlertDashboard() {
    const { ctx } = this;
    const { user } = ctx.state;
    
    try {
      // 获取今日预警统计
      const today = new Date().toISOString().split('T')[0];
      const todayAlerts = await ctx.model.RiskAlertLog.findAll({
        where: {
          userId: user.id,
          alertTime: {
            [ctx.app.Sequelize.Op.gte]: today
          }
        }
      });

      // 按级别统计
      const alertsByLevel = {
        info: 0,
        warning: 0,
        critical: 0,
        emergency: 0
      };

      todayAlerts.forEach(alert => {
        alertsByLevel[alert.alertLevel]++;
      });

      // 获取未解决的预警
      const unresolvedAlerts = await ctx.model.RiskAlertLog.findAll({
        where: {
          userId: user.id,
          isResolved: false
        },
        order: [['alertTime', 'DESC']],
        limit: 10,
        include: [{
          model: ctx.model.RiskAlertRule,
          as: 'rule',
          attributes: ['ruleName', 'ruleType']
        }, {
          model: ctx.model.UserPortfolio,
          as: 'portfolio',
          attributes: ['id', 'name']
        }]
      });

      // 获取最新的监控状态
      const latestStatus = await ctx.model.RiskMonitoringStatus.findAll({
        where: { userId: user.id },
        order: [['monitoringDate', 'DESC']],
        limit: 5,
        include: [{
          model: ctx.model.UserPortfolio,
          as: 'portfolio',
          attributes: ['id', 'name']
        }]
      });

      ctx.body = {
        success: true,
        data: {
          summary: {
            totalAlertsToday: todayAlerts.length,
            unresolvedCount: unresolvedAlerts.length,
            alertsByLevel,
            lastMonitoringTime: latestStatus[0]?.monitoringDate
          },
          unresolvedAlerts: unresolvedAlerts.map(alert => ({
            id: alert.id,
            alertTime: alert.alertTime,
            alertLevel: alert.alertLevel,
            alertMessage: alert.alertMessage,
            ruleName: alert.rule?.ruleName,
            portfolioName: alert.portfolio?.name
          })),
          portfolioStatus: latestStatus.map(status => ({
            portfolioId: status.portfolioId,
            portfolioName: status.portfolio?.name,
            portfolioValue: status.portfolioValue,
            dailyPnl: status.dailyPnl,
            dailyPnlPercentage: status.dailyPnlPercentage,
            currentVar: status.currentVar,
            alertCount: status.alertCount,
            monitoringDate: status.monitoringDate
          }))
        }
      };

    } catch (error) {
      ctx.logger.error('获取预警仪表盘数据失败:', error);
      ctx.body = {
        success: false,
        message: '获取仪表盘数据失败: ' + error.message
      };
    }
  }

  /**
   * 获取预警规则模板
   */
  async getRuleTemplates() {
    const { ctx } = this;
    
    try {
      const templates = [
        {
          id: 'var_5_percent',
          name: 'VaR超过5%预警',
          ruleType: 'var_threshold',
          alertLevel: 'warning',
          description: '当VaR风险值超过投资组合价值的5%时触发预警',
          thresholdConfig: {
            threshold: 0.05,
            unit: 'percentage'
          }
        },
        {
          id: 'daily_loss_3_percent',
          name: '日损失超过3%预警',
          ruleType: 'loss_threshold',
          alertLevel: 'critical',
          description: '当日损失超过3%时触发预警',
          thresholdConfig: {
            threshold: 0.03,
            unit: 'percentage'
          }
        },
        {
          id: 'volatility_high',
          name: '高波动率预警',
          ruleType: 'volatility_threshold',
          alertLevel: 'warning',
          description: '当波动率超过5%时触发预警',
          thresholdConfig: {
            threshold: 0.05,
            unit: 'percentage'
          }
        },
        {
          id: 'concentration_risk',
          name: '集中度风险预警',
          ruleType: 'concentration_risk',
          alertLevel: 'warning',
          description: '当单一持仓超过30%时触发预警',
          thresholdConfig: {
            threshold: 0.30,
            unit: 'percentage'
          }
        }
      ];

      ctx.body = {
        success: true,
        data: templates
      };

    } catch (error) {
      ctx.logger.error('获取预警规则模板失败:', error);
      ctx.body = {
        success: false,
        message: '获取模板失败: ' + error.message
      };
    }
  }
}

module.exports = RiskAlertController;
