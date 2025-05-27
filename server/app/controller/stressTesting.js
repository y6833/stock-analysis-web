'use strict';

const Controller = require('egg').Controller;

class StressTestingController extends Controller {

  /**
   * 创建压力测试场景
   */
  async createScenario() {
    const { ctx } = this;
    const { user } = ctx.state;
    
    try {
      const {
        scenarioName,
        scenarioType,
        description,
        scenarioParameters,
        marketShocks,
        correlationMatrix
      } = ctx.request.body;

      // 验证必填字段
      if (!scenarioName || !scenarioType || !scenarioParameters) {
        ctx.body = {
          success: false,
          message: '场景名称、类型和参数不能为空'
        };
        return;
      }

      // 创建场景
      const scenario = await ctx.model.StressTestScenario.create({
        userId: user.id,
        scenarioName,
        scenarioType,
        description: description || '',
        scenarioParameters,
        marketShocks: marketShocks || null,
        correlationMatrix: correlationMatrix || null,
        isActive: true
      });

      ctx.body = {
        success: true,
        message: '压力测试场景创建成功',
        data: scenario
      };

    } catch (error) {
      ctx.logger.error('创建压力测试场景失败:', error);
      ctx.body = {
        success: false,
        message: '创建场景失败: ' + error.message
      };
    }
  }

  /**
   * 获取用户的压力测试场景列表
   */
  async getScenarios() {
    const { ctx } = this;
    const { user } = ctx.state;
    
    try {
      const scenarios = await ctx.model.StressTestScenario.findAll({
        where: { userId: user.id },
        order: [['createdAt', 'DESC']]
      });

      ctx.body = {
        success: true,
        data: scenarios
      };

    } catch (error) {
      ctx.logger.error('获取压力测试场景失败:', error);
      ctx.body = {
        success: false,
        message: '获取场景失败: ' + error.message
      };
    }
  }

  /**
   * 更新压力测试场景
   */
  async updateScenario() {
    const { ctx } = this;
    const { user } = ctx.state;
    const { id } = ctx.params;
    
    try {
      const scenario = await ctx.model.StressTestScenario.findOne({
        where: { id, userId: user.id }
      });

      if (!scenario) {
        ctx.body = {
          success: false,
          message: '场景不存在'
        };
        return;
      }

      const updateData = ctx.request.body;
      await scenario.update(updateData);

      ctx.body = {
        success: true,
        message: '场景更新成功',
        data: scenario
      };

    } catch (error) {
      ctx.logger.error('更新压力测试场景失败:', error);
      ctx.body = {
        success: false,
        message: '更新场景失败: ' + error.message
      };
    }
  }

  /**
   * 删除压力测试场景
   */
  async deleteScenario() {
    const { ctx } = this;
    const { user } = ctx.state;
    const { id } = ctx.params;
    
    try {
      const scenario = await ctx.model.StressTestScenario.findOne({
        where: { id, userId: user.id }
      });

      if (!scenario) {
        ctx.body = {
          success: false,
          message: '场景不存在'
        };
        return;
      }

      await scenario.destroy();

      ctx.body = {
        success: true,
        message: '场景删除成功'
      };

    } catch (error) {
      ctx.logger.error('删除压力测试场景失败:', error);
      ctx.body = {
        success: false,
        message: '删除场景失败: ' + error.message
      };
    }
  }

  /**
   * 执行压力测试
   */
  async runStressTest() {
    const { ctx } = this;
    const { user } = ctx.state;
    
    try {
      const { portfolioId, scenarioId } = ctx.request.body;

      if (!portfolioId || !scenarioId) {
        ctx.body = {
          success: false,
          message: '投资组合ID和场景ID不能为空'
        };
        return;
      }

      // 执行压力测试
      const result = await ctx.service.stressTesting.runStressTest(
        user.id,
        portfolioId,
        scenarioId
      );

      ctx.body = result;

    } catch (error) {
      ctx.logger.error('压力测试执行失败:', error);
      ctx.body = {
        success: false,
        message: '压力测试失败: ' + error.message
      };
    }
  }

  /**
   * 批量执行压力测试
   */
  async batchRunStressTest() {
    const { ctx } = this;
    const { user } = ctx.state;
    
    try {
      const { portfolioIds, scenarioIds } = ctx.request.body;

      if (!Array.isArray(portfolioIds) || !Array.isArray(scenarioIds)) {
        ctx.body = {
          success: false,
          message: '投资组合ID列表和场景ID列表必须是数组'
        };
        return;
      }

      const results = [];
      
      // 并行执行多个压力测试
      for (const portfolioId of portfolioIds) {
        for (const scenarioId of scenarioIds) {
          const result = await ctx.service.stressTesting.runStressTest(
            user.id,
            portfolioId,
            scenarioId
          );
          
          results.push({
            portfolioId,
            scenarioId,
            ...result
          });
        }
      }

      ctx.body = {
        success: true,
        data: results
      };

    } catch (error) {
      ctx.logger.error('批量压力测试失败:', error);
      ctx.body = {
        success: false,
        message: '批量测试失败: ' + error.message
      };
    }
  }

  /**
   * 获取压力测试历史记录
   */
  async getStressTestHistory() {
    const { ctx } = this;
    const { user } = ctx.state;
    const { portfolioId, limit } = ctx.query;
    
    try {
      const history = await ctx.service.stressTesting.getStressTestHistory(
        user.id,
        portfolioId ? parseInt(portfolioId) : null,
        limit ? parseInt(limit) : 30
      );

      ctx.body = {
        success: true,
        data: history
      };

    } catch (error) {
      ctx.logger.error('获取压力测试历史失败:', error);
      ctx.body = {
        success: false,
        message: '获取历史数据失败: ' + error.message
      };
    }
  }

  /**
   * 获取压力测试详情
   */
  async getStressTestDetail() {
    const { ctx } = this;
    const { user } = ctx.state;
    const { id } = ctx.params;
    
    try {
      const result = await ctx.model.StressTestResult.findOne({
        where: { id, userId: user.id },
        include: [{
          model: ctx.model.StressTestScenario,
          as: 'scenario'
        }, {
          model: ctx.model.UserPortfolio,
          as: 'portfolio',
          attributes: ['id', 'name']
        }]
      });

      if (!result) {
        ctx.body = {
          success: false,
          message: '压力测试记录不存在'
        };
        return;
      }

      ctx.body = {
        success: true,
        data: result
      };

    } catch (error) {
      ctx.logger.error('获取压力测试详情失败:', error);
      ctx.body = {
        success: false,
        message: '获取详情失败: ' + error.message
      };
    }
  }

  /**
   * 获取预定义的压力测试场景模板
   */
  async getScenarioTemplates() {
    const { ctx } = this;
    
    try {
      const templates = [
        {
          id: 'market_crash_2008',
          name: '2008年金融危机',
          type: 'historical',
          description: '模拟2008年金融危机期间的市场表现',
          parameters: {
            historicalEvents: [{
              name: '2008年金融危机',
              startDate: '2008-09-01',
              endDate: '2009-03-01'
            }]
          }
        },
        {
          id: 'covid_crash_2020',
          name: '2020年新冠疫情',
          type: 'historical',
          description: '模拟2020年新冠疫情初期的市场暴跌',
          parameters: {
            historicalEvents: [{
              name: '2020年新冠疫情',
              startDate: '2020-02-01',
              endDate: '2020-04-01'
            }]
          }
        },
        {
          id: 'market_down_20',
          name: '市场下跌20%',
          type: 'hypothetical',
          description: '假设市场整体下跌20%的情景',
          parameters: {
            shockType: 'market_wide'
          },
          marketShocks: {
            market: -0.20
          }
        },
        {
          id: 'interest_rate_shock',
          name: '利率冲击',
          type: 'hypothetical',
          description: '假设利率大幅上升的情景',
          parameters: {
            shockType: 'interest_rate'
          },
          marketShocks: {
            market: -0.15,
            sectors: {
              'real_estate': -0.25,
              'utilities': -0.20
            }
          }
        },
        {
          id: 'monte_carlo_extreme',
          name: '蒙特卡洛极端情景',
          type: 'monte_carlo',
          description: '基于历史数据的蒙特卡洛极端情景模拟',
          parameters: {
            simulations: 10000,
            confidenceLevel: 0.01,
            lookbackPeriod: 252
          }
        }
      ];

      ctx.body = {
        success: true,
        data: templates
      };

    } catch (error) {
      ctx.logger.error('获取场景模板失败:', error);
      ctx.body = {
        success: false,
        message: '获取模板失败: ' + error.message
      };
    }
  }

  /**
   * 获取压力测试仪表盘数据
   */
  async getStressTestDashboard() {
    const { ctx } = this;
    const { user } = ctx.state;
    
    try {
      // 获取用户的所有投资组合
      const portfolios = await ctx.model.UserPortfolio.findAll({
        where: { userId: user.id }
      });

      // 获取最新的压力测试结果
      const latestResults = await ctx.model.StressTestResult.findAll({
        where: { userId: user.id },
        order: [['testDate', 'DESC']],
        limit: portfolios.length * 3, // 每个组合最多3个最新结果
        include: [{
          model: ctx.model.UserPortfolio,
          as: 'portfolio',
          attributes: ['id', 'name']
        }, {
          model: ctx.model.StressTestScenario,
          as: 'scenario',
          attributes: ['scenarioName', 'scenarioType']
        }]
      });

      // 统计数据
      const totalTests = latestResults.length;
      const avgLoss = latestResults.length > 0 ?
        latestResults.reduce((sum, result) => sum + parseFloat(result.percentageLoss), 0) / latestResults.length : 0;
      
      const worstLoss = latestResults.length > 0 ?
        Math.max(...latestResults.map(result => parseFloat(result.percentageLoss))) : 0;

      ctx.body = {
        success: true,
        data: {
          summary: {
            totalPortfolios: portfolios.length,
            totalTests,
            avgLoss,
            worstLoss,
            lastTestDate: latestResults[0]?.testDate
          },
          recentResults: latestResults.slice(0, 10).map(result => ({
            id: result.id,
            testDate: result.testDate,
            portfolioName: result.portfolio?.name,
            scenarioName: result.scenario?.scenarioName,
            scenarioType: result.scenario?.scenarioType,
            portfolioValueBefore: result.portfolioValueBefore,
            portfolioValueAfter: result.portfolioValueAfter,
            absoluteLoss: result.absoluteLoss,
            percentageLoss: result.percentageLoss
          }))
        }
      };

    } catch (error) {
      ctx.logger.error('获取压力测试仪表盘数据失败:', error);
      ctx.body = {
        success: false,
        message: '获取仪表盘数据失败: ' + error.message
      };
    }
  }
}

module.exports = StressTestingController;
