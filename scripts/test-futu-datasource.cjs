// 简单的富途数据源测试脚本
console.log('🧪 富途数据源测试\n');

// 模拟富途数据源类
class FutuDataSource {
  constructor() {
    this.name = '富途OpenAPI';
    this.description = '富途OpenAPI量化接口，支持港股、美股、A股等多市场实时行情';
    this.type = 'futu';
    this.config = {
      host: '127.0.0.1',
      port: 11111,
      timeout: 10000,
      maxRetries: 3
    };
    this.cache = new Map();
    this.cacheTimeout = 5000;
  }

  getName() {
    return this.name;
  }

  getDescription() {
    return this.description;
  }

  getType() {
    return this.type;
  }

  async testConnection() {
    try {
      console.log('正在测试OpenD连接...');
      // 模拟连接测试
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('❌ OpenD连接失败 (需要启动OpenD程序)');
      return false;
    } catch (error) {
      console.log('❌ 连接测试失败:', error.message);
      return false;
    }
  }

  async getStocks() {
    try {
      console.log('获取股票列表...');

      const stocks = [
        {
          symbol: 'HK.00700',
          name: '腾讯控股',
          market: 'HK',
          exchange: 'HKEX',
          currency: 'HKD',
          type: 'stock'
        },
        {
          symbol: 'HK.00941',
          name: '中国移动',
          market: 'HK',
          exchange: 'HKEX',
          currency: 'HKD',
          type: 'stock'
        },
        {
          symbol: 'US.AAPL',
          name: '苹果公司',
          market: 'US',
          exchange: 'NASDAQ',
          currency: 'USD',
          type: 'stock'
        },
        {
          symbol: 'US.TSLA',
          name: '特斯拉',
          market: 'US',
          exchange: 'NASDAQ',
          currency: 'USD',
          type: 'stock'
        }
      ];

      console.log(`✅ 成功获取 ${stocks.length} 只股票`);
      return stocks;
    } catch (error) {
      console.log('❌ 获取股票列表失败:', error.message);
      throw error;
    }
  }

  async getStockData(symbol) {
    try {
      console.log(`获取股票数据: ${symbol}`);

      const stockData = {
        symbol,
        name: this.getStockName(symbol),
        price: 0,
        change: 0,
        changePercent: 0,
        volume: 0,
        marketCap: 0,
        pe: 0,
        pb: 0,
        eps: 0,
        dividend: 0,
        timestamp: Date.now(),
        source: this.type
      };

      console.log(`✅ 成功获取 ${symbol} 的数据`);
      return stockData;
    } catch (error) {
      console.log(`❌ 获取股票数据失败: ${error.message}`);
      throw error;
    }
  }

  async searchStocks(query) {
    try {
      console.log(`搜索股票: ${query}`);

      const allStocks = await this.getStocks();
      const searchResults = allStocks.filter(stock =>
        stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
        stock.name.toLowerCase().includes(query.toLowerCase())
      );

      console.log(`✅ 找到 ${searchResults.length} 个匹配结果`);
      return searchResults;
    } catch (error) {
      console.log(`❌ 搜索股票失败: ${error.message}`);
      throw error;
    }
  }

  async getStockQuote(symbol) {
    try {
      console.log(`获取实时行情: ${symbol}`);

      const quote = {
        symbol,
        name: this.getStockName(symbol),
        price: 0,
        open: 0,
        high: 0,
        low: 0,
        close: 0,
        volume: 0,
        change: 0,
        changePercent: 0,
        timestamp: Date.now(),
        source: this.type
      };

      console.log(`✅ 成功获取 ${symbol} 的行情`);
      return quote;
    } catch (error) {
      console.log(`❌ 获取股票行情失败: ${error.message}`);
      throw error;
    }
  }

  async getFinancialNews(count = 10) {
    try {
      console.log(`获取财经新闻 (${count}条)`);
      console.log('富途API暂不支持财经新闻功能');
      return [];
    } catch (error) {
      console.log(`❌ 获取财经新闻失败: ${error.message}`);
      throw error;
    }
  }

  getStockName(symbol) {
    const stockNames = {
      'HK.00700': '腾讯控股',
      'HK.00941': '中国移动',
      'HK.00005': '汇丰控股',
      'HK.00388': '香港交易所',
      'US.AAPL': '苹果公司',
      'US.TSLA': '特斯拉',
      'US.GOOGL': '谷歌',
      'US.MSFT': '微软',
      'SH.000001': '上证指数',
      'SZ.399001': '深证成指'
    };

    return stockNames[symbol] || symbol;
  }
}

// 运行测试
async function runTests() {
  console.log('开始富途数据源测试...\n');

  const futu = new FutuDataSource();

  try {
    // 测试基本信息
    console.log('📋 基本信息测试');
    console.log(`名称: ${futu.getName()}`);
    console.log(`描述: ${futu.getDescription()}`);
    console.log(`类型: ${futu.getType()}\n`);

    // 测试连接
    console.log('🔗 连接测试');
    await futu.testConnection();
    console.log();

    // 测试获取股票列表
    console.log('📊 股票列表测试');
    const stocks = await futu.getStocks();
    stocks.forEach(stock => {
      console.log(`  ${stock.symbol} - ${stock.name} (${stock.market})`);
    });
    console.log();

    // 测试搜索功能
    console.log('🔍 搜索功能测试');
    const searchResults = await futu.searchStocks('腾讯');
    searchResults.forEach(stock => {
      console.log(`  ${stock.symbol} - ${stock.name}`);
    });
    console.log();

    // 测试获取股票数据
    console.log('📈 股票数据测试');
    const stockData = await futu.getStockData('HK.00700');
    console.log(`  ${stockData.symbol} - ${stockData.name}`);
    console.log();

    // 测试获取实时行情
    console.log('⚡ 实时行情测试');
    const quote = await futu.getStockQuote('US.AAPL');
    console.log(`  ${quote.symbol} - ${quote.name}`);
    console.log();

    // 测试获取财经新闻
    console.log('📰 财经新闻测试');
    const news = await futu.getFinancialNews(5);
    console.log(`  返回 ${news.length} 条新闻`);
    console.log();

    console.log('🎉 所有测试完成！');
    console.log('\n💡 注意事项:');
    console.log('1. 富途数据源需要安装并启动OpenD程序');
    console.log('2. 需要有效的富途账号和相应权限');
    console.log('3. 部分市场数据需要订阅相应的行情权限');
    console.log('4. 当前实现返回模拟数据，实际使用需要集成富途API');

  } catch (error) {
    console.log('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
runTests().catch(console.error);
