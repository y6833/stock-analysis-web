// This file is created by egg-ts-helper@1.35.2
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
type AnyClass = new (...args: any[]) => any;
type AnyFunc<T = any> = (...args: any[]) => T;
type CanExportFunc = AnyFunc<Promise<any>> | AnyFunc<IterableIterator<any>>;
type AutoInstanceType<T, U = T extends CanExportFunc ? T : T extends AnyFunc ? ReturnType<T> : T> = U extends AnyClass ? InstanceType<U> : U;
import ExportAdmin = require('../../../app/service/admin');
import ExportAkshare = require('../../../app/service/akshare');
import ExportAlert = require('../../../app/service/alert');
import ExportAlltick = require('../../../app/service/alltick');
import ExportBacktest = require('../../../app/service/backtest');
import ExportCache = require('../../../app/service/cache');
import ExportCacheStats = require('../../../app/service/cacheStats');
import ExportCoinRecharge = require('../../../app/service/coinRecharge');
import ExportCoins = require('../../../app/service/coins');
import ExportDashboard = require('../../../app/service/dashboard');
import ExportData = require('../../../app/service/data');
import ExportDatabase = require('../../../app/service/database');
import ExportDataQualityService = require('../../../app/service/dataQualityService');
import ExportDojiPatternService = require('../../../app/service/dojiPatternService');
import ExportEastmoney = require('../../../app/service/eastmoney');
import ExportFactorEngine = require('../../../app/service/factorEngine');
import ExportGoogleFinance = require('../../../app/service/googleFinance');
import ExportJuhe = require('../../../app/service/juhe');
import ExportLogs = require('../../../app/service/logs');
import ExportMembership = require('../../../app/service/membership');
import ExportNotification = require('../../../app/service/notification');
import ExportOrderBook = require('../../../app/service/orderBook');
import ExportPage = require('../../../app/service/page');
import ExportPortfolio = require('../../../app/service/portfolio');
import ExportProxy = require('../../../app/service/proxy');
import ExportRiskAlert = require('../../../app/service/riskAlert');
import ExportSecurityAudit = require('../../../app/service/securityAudit');
import ExportSimulation = require('../../../app/service/simulation');
import ExportSina = require('../../../app/service/sina');
import ExportSmartRecommendation = require('../../../app/service/smartRecommendation');
import ExportStock = require('../../../app/service/stock');
import ExportStopLossManager = require('../../../app/service/stopLossManager');
import ExportStrategy = require('../../../app/service/strategy');
import ExportStressTesting = require('../../../app/service/stressTesting');
import ExportTechnicalIndicators = require('../../../app/service/technicalIndicators');
import ExportUser = require('../../../app/service/user');
import ExportVarCalculation = require('../../../app/service/varCalculation');
import ExportWatchlist = require('../../../app/service/watchlist');
import ExportYahooFinance = require('../../../app/service/yahooFinance');
import ExportZhitu = require('../../../app/service/zhitu');

declare module 'egg' {
  interface IService {
    admin: AutoInstanceType<typeof ExportAdmin>;
    akshare: AutoInstanceType<typeof ExportAkshare>;
    alert: AutoInstanceType<typeof ExportAlert>;
    alltick: AutoInstanceType<typeof ExportAlltick>;
    backtest: AutoInstanceType<typeof ExportBacktest>;
    cache: AutoInstanceType<typeof ExportCache>;
    cacheStats: AutoInstanceType<typeof ExportCacheStats>;
    coinRecharge: AutoInstanceType<typeof ExportCoinRecharge>;
    coins: AutoInstanceType<typeof ExportCoins>;
    dashboard: AutoInstanceType<typeof ExportDashboard>;
    data: AutoInstanceType<typeof ExportData>;
    database: AutoInstanceType<typeof ExportDatabase>;
    dataQualityService: AutoInstanceType<typeof ExportDataQualityService>;
    dojiPatternService: AutoInstanceType<typeof ExportDojiPatternService>;
    eastmoney: AutoInstanceType<typeof ExportEastmoney>;
    factorEngine: AutoInstanceType<typeof ExportFactorEngine>;
    googleFinance: AutoInstanceType<typeof ExportGoogleFinance>;
    juhe: AutoInstanceType<typeof ExportJuhe>;
    logs: AutoInstanceType<typeof ExportLogs>;
    membership: AutoInstanceType<typeof ExportMembership>;
    notification: AutoInstanceType<typeof ExportNotification>;
    orderBook: AutoInstanceType<typeof ExportOrderBook>;
    page: AutoInstanceType<typeof ExportPage>;
    portfolio: AutoInstanceType<typeof ExportPortfolio>;
    proxy: AutoInstanceType<typeof ExportProxy>;
    riskAlert: AutoInstanceType<typeof ExportRiskAlert>;
    securityAudit: AutoInstanceType<typeof ExportSecurityAudit>;
    simulation: AutoInstanceType<typeof ExportSimulation>;
    sina: AutoInstanceType<typeof ExportSina>;
    smartRecommendation: AutoInstanceType<typeof ExportSmartRecommendation>;
    stock: AutoInstanceType<typeof ExportStock>;
    stopLossManager: AutoInstanceType<typeof ExportStopLossManager>;
    strategy: AutoInstanceType<typeof ExportStrategy>;
    stressTesting: AutoInstanceType<typeof ExportStressTesting>;
    technicalIndicators: AutoInstanceType<typeof ExportTechnicalIndicators>;
    user: AutoInstanceType<typeof ExportUser>;
    varCalculation: AutoInstanceType<typeof ExportVarCalculation>;
    watchlist: AutoInstanceType<typeof ExportWatchlist>;
    yahooFinance: AutoInstanceType<typeof ExportYahooFinance>;
    zhitu: AutoInstanceType<typeof ExportZhitu>;
  }
}
