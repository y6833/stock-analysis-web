'use strict';

const Controller = require('egg').Controller;

/**
 * 实时数据WebSocket控制器
 */
class RealtimeController extends Controller {
  constructor(ctx) {
    super(ctx);
    
    // 客户端订阅管理
    this.subscriptions = new Map(); // clientId -> Set<subscription>
    this.symbolSubscribers = new Map(); // symbol -> Set<clientId>
  }

  /**
   * WebSocket连接建立
   */
  async connect() {
    const { ctx, app } = this;
    const clientId = ctx.socket.id;
    
    ctx.logger.info(`WebSocket客户端连接: ${clientId}`);
    
    // 初始化客户端订阅
    this.subscriptions.set(clientId, new Set());
    
    // 发送连接成功消息
    ctx.socket.emit('connected', {
      clientId,
      timestamp: Date.now(),
      message: '连接成功'
    });
  }

  /**
   * WebSocket连接断开
   */
  async disconnect() {
    const { ctx } = this;
    const clientId = ctx.socket.id;
    
    ctx.logger.info(`WebSocket客户端断开: ${clientId}`);
    
    // 清理客户端订阅
    this.cleanupClientSubscriptions(clientId);
  }

  /**
   * 处理订阅请求
   */
  async subscribe() {
    const { ctx } = this;
    const clientId = ctx.socket.id;
    const { type, symbol, interval } = ctx.args[0] || {};
    
    if (!type || !symbol) {
      ctx.socket.emit('error', {
        error: '订阅参数不完整',
        timestamp: Date.now()
      });
      return;
    }
    
    try {
      const subscriptionKey = this.getSubscriptionKey(type, symbol, interval);
      
      // 添加到客户端订阅列表
      const clientSubscriptions = this.subscriptions.get(clientId) || new Set();
      clientSubscriptions.add(subscriptionKey);
      this.subscriptions.set(clientId, clientSubscriptions);
      
      // 添加到符号订阅者列表
      const symbolKey = `${type}:${symbol}`;
      const subscribers = this.symbolSubscribers.get(symbolKey) || new Set();
      subscribers.add(clientId);
      this.symbolSubscribers.set(symbolKey, subscribers);
      
      ctx.logger.info(`客户端 ${clientId} 订阅: ${subscriptionKey}`);
      
      // 根据订阅类型启动数据推送
      switch (type) {
        case 'quote':
          await this.startQuotePush(symbol);
          break;
        case 'kline':
          await this.startKlinePush(symbol, interval);
          break;
        case 'trade':
          await this.startTradePush(symbol);
          break;
        case 'depth':
          await this.startDepthPush(symbol);
          break;
        default:
          ctx.socket.emit('error', {
            error: `不支持的订阅类型: ${type}`,
            timestamp: Date.now()
          });
      }
      
    } catch (error) {
      ctx.logger.error('处理订阅请求失败:', error);
      ctx.socket.emit('error', {
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * 处理取消订阅请求
   */
  async unsubscribe() {
    const { ctx } = this;
    const clientId = ctx.socket.id;
    const { type, symbol, interval } = ctx.args[0] || {};
    
    if (!type || !symbol) {
      ctx.socket.emit('error', {
        error: '取消订阅参数不完整',
        timestamp: Date.now()
      });
      return;
    }
    
    try {
      const subscriptionKey = this.getSubscriptionKey(type, symbol, interval);
      
      // 从客户端订阅列表移除
      const clientSubscriptions = this.subscriptions.get(clientId);
      if (clientSubscriptions) {
        clientSubscriptions.delete(subscriptionKey);
      }
      
      // 从符号订阅者列表移除
      const symbolKey = `${type}:${symbol}`;
      const subscribers = this.symbolSubscribers.get(symbolKey);
      if (subscribers) {
        subscribers.delete(clientId);
        
        // 如果没有订阅者了，停止数据推送
        if (subscribers.size === 0) {
          this.symbolSubscribers.delete(symbolKey);
          await this.stopDataPush(type, symbol, interval);
        }
      }
      
      ctx.logger.info(`客户端 ${clientId} 取消订阅: ${subscriptionKey}`);
      
    } catch (error) {
      ctx.logger.error('处理取消订阅请求失败:', error);
      ctx.socket.emit('error', {
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * 处理心跳请求
   */
  async ping() {
    const { ctx } = this;
    
    ctx.socket.emit('pong', {
      timestamp: Date.now()
    });
  }

  /**
   * 开始股票行情推送
   */
  async startQuotePush(symbol) {
    const { ctx, app } = this;
    
    try {
      // 获取实时行情数据
      const quote = await ctx.service.stock.getStockQuote(symbol);
      
      // 推送给所有订阅者
      this.broadcastToSubscribers('quote', symbol, quote);
      
      // 设置定时推送（每5秒更新一次）
      const intervalId = setInterval(async () => {
        try {
          const symbolKey = `quote:${symbol}`;
          const subscribers = this.symbolSubscribers.get(symbolKey);
          
          if (!subscribers || subscribers.size === 0) {
            clearInterval(intervalId);
            return;
          }
          
          const latestQuote = await ctx.service.stock.getStockQuote(symbol);
          this.broadcastToSubscribers('quote', symbol, latestQuote);
          
        } catch (error) {
          ctx.logger.error(`推送股票 ${symbol} 行情失败:`, error);
        }
      }, 5000);
      
      // 存储定时器ID用于清理
      app.realtimeIntervals = app.realtimeIntervals || new Map();
      app.realtimeIntervals.set(`quote:${symbol}`, intervalId);
      
    } catch (error) {
      ctx.logger.error(`启动股票 ${symbol} 行情推送失败:`, error);
      throw error;
    }
  }

  /**
   * 开始K线数据推送
   */
  async startKlinePush(symbol, interval = '1m') {
    const { ctx, app } = this;
    
    try {
      // 获取K线数据
      const klineData = await ctx.service.stock.getKlineData(symbol, interval);
      
      // 推送给所有订阅者
      this.broadcastToSubscribers('kline', symbol, klineData, { interval });
      
      // 根据K线周期设置推送频率
      const pushInterval = this.getKlinePushInterval(interval);
      
      const intervalId = setInterval(async () => {
        try {
          const symbolKey = `kline:${symbol}`;
          const subscribers = this.symbolSubscribers.get(symbolKey);
          
          if (!subscribers || subscribers.size === 0) {
            clearInterval(intervalId);
            return;
          }
          
          const latestKline = await ctx.service.stock.getKlineData(symbol, interval);
          this.broadcastToSubscribers('kline', symbol, latestKline, { interval });
          
        } catch (error) {
          ctx.logger.error(`推送股票 ${symbol} K线数据失败:`, error);
        }
      }, pushInterval);
      
      // 存储定时器ID
      app.realtimeIntervals = app.realtimeIntervals || new Map();
      app.realtimeIntervals.set(`kline:${symbol}:${interval}`, intervalId);
      
    } catch (error) {
      ctx.logger.error(`启动股票 ${symbol} K线推送失败:`, error);
      throw error;
    }
  }

  /**
   * 开始交易数据推送
   */
  async startTradePush(symbol) {
    const { ctx } = this;
    
    // 交易数据推送实现
    // 这里可以集成实时交易数据源
    ctx.logger.info(`启动股票 ${symbol} 交易数据推送`);
  }

  /**
   * 开始深度数据推送
   */
  async startDepthPush(symbol) {
    const { ctx } = this;
    
    // 深度数据推送实现
    // 这里可以集成实时深度数据源
    ctx.logger.info(`启动股票 ${symbol} 深度数据推送`);
  }

  /**
   * 停止数据推送
   */
  async stopDataPush(type, symbol, interval) {
    const { app } = this;
    
    const key = interval ? `${type}:${symbol}:${interval}` : `${type}:${symbol}`;
    
    if (app.realtimeIntervals && app.realtimeIntervals.has(key)) {
      const intervalId = app.realtimeIntervals.get(key);
      clearInterval(intervalId);
      app.realtimeIntervals.delete(key);
    }
  }

  /**
   * 广播消息给订阅者
   */
  broadcastToSubscribers(type, symbol, data, extra = {}) {
    const { app } = this;
    const symbolKey = `${type}:${symbol}`;
    const subscribers = this.symbolSubscribers.get(symbolKey);
    
    if (!subscribers || subscribers.size === 0) {
      return;
    }
    
    const message = {
      action: 'data',
      type,
      symbol,
      data,
      timestamp: Date.now(),
      ...extra
    };
    
    subscribers.forEach(clientId => {
      const socket = app.io.sockets.sockets.get(clientId);
      if (socket) {
        socket.emit('message', message);
      }
    });
  }

  /**
   * 清理客户端订阅
   */
  cleanupClientSubscriptions(clientId) {
    // 移除客户端的所有订阅
    this.subscriptions.delete(clientId);
    
    // 从符号订阅者列表中移除客户端
    this.symbolSubscribers.forEach((subscribers, symbolKey) => {
      subscribers.delete(clientId);
      
      // 如果没有订阅者了，清理定时器
      if (subscribers.size === 0) {
        this.symbolSubscribers.delete(symbolKey);
        
        // 解析符号键并停止推送
        const [type, symbol, interval] = symbolKey.split(':');
        this.stopDataPush(type, symbol, interval);
      }
    });
  }

  /**
   * 获取订阅键
   */
  getSubscriptionKey(type, symbol, interval) {
    return interval ? `${type}:${symbol}:${interval}` : `${type}:${symbol}`;
  }

  /**
   * 获取K线推送间隔
   */
  getKlinePushInterval(interval) {
    const intervalMap = {
      '1m': 60000,    // 1分钟
      '5m': 300000,   // 5分钟
      '15m': 900000,  // 15分钟
      '30m': 1800000, // 30分钟
      '1h': 3600000,  // 1小时
      '1d': 86400000  // 1天
    };
    
    return intervalMap[interval] || 60000; // 默认1分钟
  }
}

module.exports = RealtimeController;
