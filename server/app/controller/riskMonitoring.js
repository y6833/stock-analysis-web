'use strict';

const Controller = require('egg').Controller;

class RiskMonitoringController extends Controller {

  /**
   * 创建风险监控配置
   */
  async createConfig() {
    const { ctx } = this;
    const { user } = ctx.state;
    
    try {
      const {
        portfolioId,
        configName,
        varConfidenceLevel,
        varTimeHorizon,
        varMethod,
        lookbackPeriod,
        monteCarloSimulations,
        riskLimits
      } = ctx.request.body;

      // 验证必填字段
      if (!configName) {
        ctx.body = {
          success: false,
          message: '配置名称不能为空'
        };
        return;
      }

      // 创建配置
      const config = await ctx.model.RiskMonitoringConfig.create({
        userId: user.id,
        portfolioId: portfolioId || null,
        configName,
        varConfidenceLevel: varConfidenceLevel || 0.05,
        varTimeHorizon: varTimeHorizon || 1,
        varMethod: varMethod || 'historical',
        lookbackPeriod: lookbackPeriod || 252,
        monteCarloSimulations: monteCarloSimulations || 10000,
        riskLimits: riskLimits || null,
        isActive: true
      });

      ctx.body = {
        success: true,
        message: '风险监控配置创建成功',
        data: config
      };

    } catch (error) {
      ctx.logger.error('创建风险监控配置失败:', error);
      ctx.body = {
        success: false,
        message: '创建配置失败: ' + error.message
      };
    }
  }

  /**
   * 获取用户的风险监控配置列表
   */
  async getConfigs() {
    const { ctx } = this;
    const { user } = ctx.state;
    
    try {
      const configs = await ctx.model.RiskMonitoringConfig.findAll({
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
        data: configs
      };

    } catch (error) {
      ctx.logger.error('获取风险监控配置失败:', error);
      ctx.body = {
        success: false,
        message: '获取配置失败: ' + error.message
      };
    }
  }

  /**
   * 更新风险监控配置
   */
  async updateConfig() {
    const { ctx } = this;
    const { user } = ctx.state;
    const { id } = ctx.params;
    
    try {
      const config = await ctx.model.RiskMonitoringConfig.findOne({
        where: { id, userId: user.id }
      });

      if (!config) {
        ctx.body = {
          success: false,
          message: '配置不存在'
        };
        return;
      }

      const updateData = ctx.request.body;
      await config.update(updateData);

      ctx.body = {
        success: true,
        message: '配置更新成功',
        data: config
      };

    } catch (error) {
      ctx.logger.error('更新风险监控配置失败:', error);
      ctx.body = {
        success: false,
        message: '更新配置失败: ' + error.message
      };
    }
  }

  /**
   * 删除风险监控配置
   */
  async deleteConfig() {
    const { ctx } = this;
    const { user } = ctx.state;
    const { id } = ctx.params;
    
    try {
      const config = await ctx.model.RiskMonitoringConfig.findOne({
        where: { id, userId: user.id }
      });

      if (!config) {
        ctx.body = {
          success: false,
          message: '配置不存在'
        };
        return;
      }

      await config.destroy();

      ctx.body = {
        success: true,
        message: '配置删除成功'
      };

    } catch (error) {
      ctx.logger.error('删除风险监控配置失败:', error);
      ctx.body = {
        success: false,
        message: '删除配置失败: ' + error.message
      };
    }
  }

  /**
   * 计算VaR
   */
  async calculateVaR() {
    const { ctx } = this;
    const { user } = ctx.state;
    
    try {
      const { portfolioId, configId } = ctx.request.body;

      // 获取配置
      const config = await ctx.model.RiskMonitoringConfig.findOne({
        where: { id: configId, userId: user.id }
      });

      if (!config) {
        ctx.body = {
          success: false,
          message: '风险配置不存在'
        };
        return;
      }

      // 计算VaR
      const result = await ctx.service.varCalculation.calculatePortfolioVaR(
        user.id,
        portfolioId,
        config
      );

      ctx.body = result;

    } catch (error) {
      ctx.logger.error('VaR计算失败:', error);
      ctx.body = {
        success: false,
        message: 'VaR计算失败: ' + error.message
      };
    }
  }

  /**
   * 获取VaR计算历史
   */
  async getVarHistory() {
    const { ctx } = this;
    const { user } = ctx.state;
    const { portfolioId, limit } = ctx.query;
    
    try {
      const history = await ctx.service.varCalculation.getVarHistory(
        user.id,
        portfolioId ? parseInt(portfolioId) : null,
        limit ? parseInt(limit) : 30
      );

      ctx.body = {
        success: true,
        data: history
      };

    } catch (error) {
      ctx.logger.error('获取VaR历史失败:', error);
      ctx.body = {
        success: false,
        message: '获取历史数据失败: ' + error.message
      };
    }
  }

  /**
   * 获取VaR计算详情
   */
  async getVarDetail() {
    const { ctx } = this;
    const { user } = ctx.state;
    const { id } = ctx.params;
    
    try {
      const calculation = await ctx.model.VarCalculation.findOne({
        where: { id, userId: user.id },
        include: [{
          model: ctx.model.RiskMonitoringConfig,
          as: 'config',
          attributes: ['configName', 'varMethod', 'varConfidenceLevel', 'lookbackPeriod']
        }, {
          model: ctx.model.UserPortfolio,
          as: 'portfolio',
          attributes: ['id', 'name']
        }]
      });

      if (!calculation) {
        ctx.body = {
          success: false,
          message: 'VaR计算记录不存在'
        };
        return;
      }

      ctx.body = {
        success: true,
        data: calculation
      };

    } catch (error) {
      ctx.logger.error('获取VaR详情失败:', error);
      ctx.body = {
        success: false,
        message: '获取详情失败: ' + error.message
      };
    }
  }

  /**
   * 批量计算多个投资组合的VaR
   */
  async batchCalculateVaR() {
    const { ctx } = this;
    const { user } = ctx.state;
    
    try {
      const { portfolioIds, configId } = ctx.request.body;

      if (!Array.isArray(portfolioIds) || portfolioIds.length === 0) {
        ctx.body = {
          success: false,
          message: '投资组合ID列表不能为空'
        };
        return;
      }

      // 获取配置
      const config = await ctx.model.RiskMonitoringConfig.findOne({
        where: { id: configId, userId: user.id }
      });

      if (!config) {
        ctx.body = {
          success: false,
          message: '风险配置不存在'
        };
        return;
      }

      const results = [];
      
      // 并行计算多个投资组合的VaR
      const promises = portfolioIds.map(portfolioId => 
        ctx.service.varCalculation.calculatePortfolioVaR(user.id, portfolioId, config)
      );

      const calculations = await Promise.all(promises);
      
      calculations.forEach((result, index) => {
        results.push({
          portfolioId: portfolioIds[index],
          ...result
        });
      });

      ctx.body = {
        success: true,
        data: results
      };

    } catch (error) {
      ctx.logger.error('批量VaR计算失败:', error);
      ctx.body = {
        success: false,
        message: '批量计算失败: ' + error.message
      };
    }
  }

  /**
   * 获取风险监控仪表盘数据
   */
  async getRiskDashboard() {
    const { ctx } = this;
    const { user } = ctx.state;
    
    try {
      // 获取用户的所有投资组合
      const portfolios = await ctx.model.UserPortfolio.findAll({
        where: { userId: user.id }
      });

      // 获取最新的VaR计算结果
      const latestVarCalculations = await ctx.model.VarCalculation.findAll({
        where: { userId: user.id },
        order: [['calculationDate', 'DESC']],
        limit: portfolios.length,
        include: [{
          model: ctx.model.UserPortfolio,
          as: 'portfolio',
          attributes: ['id', 'name']
        }]
      });

      // 统计数据
      const totalPortfolioValue = latestVarCalculations.reduce(
        (sum, calc) => sum + parseFloat(calc.portfolioValue), 0
      );
      
      const totalVaR = latestVarCalculations.reduce(
        (sum, calc) => sum + parseFloat(calc.varAbsolute), 0
      );

      const avgVarPercentage = latestVarCalculations.length > 0 ?
        latestVarCalculations.reduce((sum, calc) => sum + parseFloat(calc.varPercentage), 0) / latestVarCalculations.length : 0;

      ctx.body = {
        success: true,
        data: {
          summary: {
            totalPortfolios: portfolios.length,
            totalPortfolioValue,
            totalVaR,
            avgVarPercentage,
            lastCalculationDate: latestVarCalculations[0]?.calculationDate
          },
          portfolioVars: latestVarCalculations.map(calc => ({
            portfolioId: calc.portfolioId,
            portfolioName: calc.portfolio?.name,
            portfolioValue: calc.portfolioValue,
            varAbsolute: calc.varAbsolute,
            varPercentage: calc.varPercentage,
            expectedShortfall: calc.expectedShortfall,
            calculationDate: calc.calculationDate,
            method: calc.calculationMethod
          }))
        }
      };

    } catch (error) {
      ctx.logger.error('获取风险仪表盘数据失败:', error);
      ctx.body = {
        success: false,
        message: '获取仪表盘数据失败: ' + error.message
      };
    }
  }
}

module.exports = RiskMonitoringController;
