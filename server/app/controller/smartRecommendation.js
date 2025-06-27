'use strict';

const Controller = require('egg').Controller;

/**
 * 智能推荐控制器
 */
class SmartRecommendationController extends Controller {

  /**
   * 获取智能推荐列表
   * GET /api/smart-recommendation
   */
  async getRecommendations() {
    const { ctx, service } = this;
    
    try {
      // 获取查询参数
      const {
        riskLevel = 'medium',
        expectedReturn = 0.05,
        timeHorizon = 7,
        limit = 10
      } = ctx.query;

      // 参数验证
      const validRiskLevels = ['low', 'medium', 'high'];
      if (!validRiskLevels.includes(riskLevel)) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '无效的风险等级参数'
        };
        return;
      }

      // 检查用户权限（基于会员等级限制推荐数量）
      const userId = ctx.user ? ctx.user.id : null;
      let actualLimit = parseInt(limit);
      
      if (userId) {
        const userMembership = await service.membership.getUserMembership(userId);
        
        // 根据会员等级限制推荐数量
        if (userMembership.level === 'free') {
          actualLimit = Math.min(actualLimit, 3); // 免费用户最多3个推荐
        } else if (userMembership.level === 'basic') {
          actualLimit = Math.min(actualLimit, 8); // 基础会员最多8个推荐
        }
        // 高级会员无限制
      } else {
        actualLimit = Math.min(actualLimit, 3); // 未登录用户最多3个推荐
      }

      // 调用推荐服务
      const result = await service.smartRecommendation.getRecommendations({
        riskLevel,
        expectedReturn: parseFloat(expectedReturn),
        timeHorizon: parseInt(timeHorizon),
        limit: actualLimit
      });

      ctx.status = 200;
      ctx.body = result;

    } catch (error) {
      ctx.logger.error('获取智能推荐失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '服务器内部错误，请稍后重试',
        error: error.message
      };
    }
  }

  /**
   * 获取推荐历史统计
   * GET /api/smart-recommendation/stats
   */
  async getRecommendationStats() {
    const { ctx, service } = this;
    
    try {
      const { days = 30 } = ctx.query;
      
      const stats = await service.smartRecommendation.getRecommendationStats(parseInt(days));
      
      ctx.status = 200;
      ctx.body = {
        success: true,
        data: stats
      };

    } catch (error) {
      ctx.logger.error('获取推荐统计失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取统计信息失败',
        error: error.message
      };
    }
  }

  /**
   * 获取单个股票的详细分析
   * GET /api/smart-recommendation/analyze/:symbol
   */
  async analyzeStock() {
    const { ctx, service } = this;
    
    try {
      const { symbol } = ctx.params;
      
      if (!symbol) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '股票代码不能为空'
        };
        return;
      }

      // 获取股票基本信息
      const stockInfo = await service.stock.getStockInfo(symbol);
      if (!stockInfo) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: '未找到该股票信息'
        };
        return;
      }

      // 计算股票评分
      const score = await service.smartRecommendation.calculateStockScore(stockInfo, {
        riskLevel: 'medium',
        expectedReturn: 0.05,
        timeHorizon: 7
      });

      if (!score) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '该股票数据不足，无法进行分析'
        };
        return;
      }

      // 增强推荐信息
      const enrichedInfo = await service.smartRecommendation.enrichRecommendation({
        ...stockInfo,
        ...score
      });

      ctx.status = 200;
      ctx.body = {
        success: true,
        data: enrichedInfo
      };

    } catch (error) {
      ctx.logger.error(`分析股票 ${ctx.params.symbol} 失败:`, error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '股票分析失败',
        error: error.message
      };
    }
  }

  /**
   * 获取推荐配置选项
   * GET /api/smart-recommendation/config
   */
  async getRecommendationConfig() {
    const { ctx } = this;
    
    try {
      const config = {
        riskLevels: [
          { value: 'low', label: '低风险', description: '稳健型投资，波动较小' },
          { value: 'medium', label: '中等风险', description: '平衡型投资，适度波动' },
          { value: 'high', label: '高风险', description: '激进型投资，波动较大' }
        ],
        timeHorizons: [
          { value: 3, label: '3天', description: '短期交易' },
          { value: 7, label: '7天', description: '中短期投资' },
          { value: 15, label: '15天', description: '中期投资' },
          { value: 30, label: '30天', description: '中长期投资' }
        ],
        expectedReturns: [
          { value: 0.02, label: '2%', description: '保守预期' },
          { value: 0.05, label: '5%', description: '适中预期' },
          { value: 0.08, label: '8%', description: '积极预期' },
          { value: 0.12, label: '12%', description: '激进预期' }
        ],
        membershipLimits: {
          free: { maxRecommendations: 3, description: '免费用户每日最多3个推荐' },
          basic: { maxRecommendations: 8, description: '基础会员每日最多8个推荐' },
          premium: { maxRecommendations: -1, description: '高级会员无限制推荐' }
        },
        disclaimer: '本推荐基于技术分析算法生成，仅供参考，不构成投资建议。投资有风险，入市需谨慎。'
      };

      ctx.status = 200;
      ctx.body = {
        success: true,
        data: config
      };

    } catch (error) {
      ctx.logger.error('获取推荐配置失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取配置失败',
        error: error.message
      };
    }
  }

  /**
   * 刷新推荐列表
   * POST /api/smart-recommendation/refresh
   */
  async refreshRecommendations() {
    const { ctx, service } = this;
    
    try {
      const {
        riskLevel = 'medium',
        expectedReturn = 0.05,
        timeHorizon = 7,
        limit = 10
      } = ctx.request.body;

      // 强制刷新推荐（不使用缓存）
      const result = await service.smartRecommendation.getRecommendations({
        riskLevel,
        expectedReturn: parseFloat(expectedReturn),
        timeHorizon: parseInt(timeHorizon),
        limit: parseInt(limit),
        forceRefresh: true
      });

      ctx.status = 200;
      ctx.body = result;

    } catch (error) {
      ctx.logger.error('刷新推荐失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '刷新推荐失败',
        error: error.message
      };
    }
  }
}

module.exports = SmartRecommendationController;
