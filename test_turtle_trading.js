/**
 * 海龟交易法则测试文件
 * 测试唐奇安通道计算和交易信号生成
 */

// 模拟K线数据
const mockKlineData = {
  open: [10.0, 10.2, 10.5, 10.3, 10.8, 11.0, 10.9, 11.2, 11.5, 11.3, 11.8, 12.0, 11.9, 12.2, 12.5, 12.3, 12.8, 13.0, 12.9, 13.2, 13.5, 13.3, 13.8, 14.0, 13.9],
  high: [10.3, 10.6, 10.8, 10.7, 11.2, 11.3, 11.2, 11.5, 11.8, 11.6, 12.1, 12.3, 12.2, 12.5, 12.8, 12.6, 13.1, 13.3, 13.2, 13.5, 13.8, 13.6, 14.1, 14.3, 14.2],
  low: [9.8, 10.0, 10.2, 10.1, 10.5, 10.7, 10.6, 10.9, 11.2, 11.0, 11.5, 11.7, 11.6, 11.9, 12.2, 12.0, 12.5, 12.7, 12.6, 12.9, 13.2, 13.0, 13.5, 13.7, 13.6],
  close: [10.1, 10.4, 10.6, 10.5, 10.9, 11.1, 11.0, 11.3, 11.6, 11.4, 11.9, 12.1, 12.0, 12.3, 12.6, 12.4, 12.9, 13.1, 13.0, 13.3, 13.6, 13.4, 13.9, 14.1, 14.0],
  volume: [1000, 1200, 1100, 1300, 1500, 1400, 1600, 1800, 1700, 1900, 2100, 2000, 2200, 2400, 2300, 2500, 2700, 2600, 2800, 3000, 2900, 3100, 3300, 3200, 3400]
};

// 海龟交易法则核心算法实现
class TurtleTradingSystem {
  /**
   * 计算唐奇安通道
   * @param {Array} highs - 最高价数组
   * @param {Array} lows - 最低价数组
   * @param {Array} closes - 收盘价数组
   * @param {number} period - 突破周期，默认20
   * @return {Object} 唐奇安通道数据和交易信号
   */
  calculateDonchianChannel(highs, lows, closes, period = 20) {
    if (!highs || !lows || !closes || highs.length === 0) {
      return { upband: [], dnband: [], signals: [] };
    }

    const upband = []; // 上轨（period周期最高价）
    const dnband = []; // 下轨（period周期最低价）
    const signals = []; // 交易信号

    // 计算唐奇安通道上下轨
    for (let i = 0; i < closes.length; i++) {
      const start = Math.max(0, i - period + 1);
      const end = i + 1;
      
      // 计算period周期内的最高价和最低价
      upband[i] = Math.max(...highs.slice(start, end));
      dnband[i] = Math.min(...lows.slice(start, end));
    }

    // 生成海龟交易信号
    for (let i = 1; i < closes.length; i++) {
      const currentPrice = closes[i];
      const prevPrice = closes[i - 1];
      const prevUpband = upband[i - 1];
      const prevDnband = dnband[i - 1];

      // 海龟买入条件：当前收盘价突破前一根K线的period周期最高价
      const buyCond = currentPrice > prevUpband;
      
      // 海龟卖出条件：当前收盘价跌破前一根K线的period周期最低价
      const sellCond = currentPrice < prevDnband;

      if (buyCond) {
        signals.push({
          index: i,
          signal: '海龟买入',
          type: 'buy',
          price: currentPrice,
          strength: this.calculateBreakoutStrength(currentPrice, prevUpband, upband[i], dnband[i]),
          confidence: 85,
          reason: `价格突破${period}周期高点 ¥${prevUpband.toFixed(2)}`,
          timestamp: new Date().toISOString()
        });
      }

      if (sellCond) {
        signals.push({
          index: i,
          signal: '海龟卖出',
          type: 'sell',
          price: currentPrice,
          strength: this.calculateBreakoutStrength(prevDnband, currentPrice, upband[i], dnband[i]),
          confidence: 85,
          reason: `价格跌破${period}周期低点 ¥${prevDnband.toFixed(2)}`,
          timestamp: new Date().toISOString()
        });
      }
    }

    return {
      upband,
      dnband,
      signals,
      period
    };
  }

  /**
   * 计算突破强度
   * @param {number} price - 当前价格
   * @param {number} breakLevel - 突破位
   * @param {number} upband - 上轨
   * @param {number} dnband - 下轨
   * @return {number} 突破强度 (0-100)
   */
  calculateBreakoutStrength(price, breakLevel, upband, dnband) {
    const channelWidth = upband - dnband;
    if (channelWidth === 0) return 50;
    
    const breakoutDistance = Math.abs(price - breakLevel);
    const strength = Math.min(100, (breakoutDistance / channelWidth) * 100 + 50);
    
    return Math.round(strength);
  }

  /**
   * 运行测试
   */
  runTest() {
    console.log('🐢 海龟交易法则测试开始...\n');
    
    // 测试不同周期的唐奇安通道
    const periods = [10, 20, 30];
    
    periods.forEach(period => {
      console.log(`📊 测试 ${period} 天唐奇安通道:`);
      
      const result = this.calculateDonchianChannel(
        mockKlineData.high,
        mockKlineData.low,
        mockKlineData.close,
        period
      );
      
      console.log(`  上轨最新值: ¥${result.upband[result.upband.length - 1]?.toFixed(2)}`);
      console.log(`  下轨最新值: ¥${result.dnband[result.dnband.length - 1]?.toFixed(2)}`);
      console.log(`  信号数量: ${result.signals.length}`);
      
      if (result.signals.length > 0) {
        console.log('  最新信号:');
        result.signals.slice(-2).forEach(signal => {
          console.log(`    ${signal.signal}: ¥${signal.price.toFixed(2)} (强度: ${signal.strength}%)`);
          console.log(`    理由: ${signal.reason}`);
        });
      }
      
      console.log('');
    });
    
    console.log('✅ 海龟交易法则测试完成!');
  }
}

// 运行测试
const turtleSystem = new TurtleTradingSystem();
turtleSystem.runTest();
