// This file is created by egg-ts-helper@1.35.2
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportAdmin = require('../../../app/controller/admin');
import ExportAkshare = require('../../../app/controller/akshare');
import ExportAlert = require('../../../app/controller/alert');
import ExportCache = require('../../../app/controller/cache');
import ExportCacheStats = require('../../../app/controller/cacheStats');
import ExportCoinRecharge = require('../../../app/controller/coinRecharge');
import ExportCoins = require('../../../app/controller/coins');
import ExportData = require('../../../app/controller/data');
import ExportDataSource = require('../../../app/controller/dataSource');
import ExportEastmoney = require('../../../app/controller/eastmoney');
import ExportEnv = require('../../../app/controller/env');
import ExportFundamental = require('../../../app/controller/fundamental');
import ExportHome = require('../../../app/controller/home');
import ExportLogs = require('../../../app/controller/logs');
import ExportMembership = require('../../../app/controller/membership');
import ExportNetease = require('../../../app/controller/netease');
import ExportNotification = require('../../../app/controller/notification');
import ExportPage = require('../../../app/controller/page');
import ExportPageGroup = require('../../../app/controller/page_group');
import ExportPageStats = require('../../../app/controller/page_stats');
import ExportPermissionTemplate = require('../../../app/controller/permission_template');
import ExportPortfolio = require('../../../app/controller/portfolio');
import ExportSimulation = require('../../../app/controller/simulation');
import ExportSina = require('../../../app/controller/sina');
import ExportStock = require('../../../app/controller/stock');
import ExportTencent = require('../../../app/controller/tencent');
import ExportTushare = require('../../../app/controller/tushare');
import ExportUser = require('../../../app/controller/user');
import ExportWatchlist = require('../../../app/controller/watchlist');

declare module 'egg' {
  interface IController {
    admin: ExportAdmin;
    akshare: ExportAkshare;
    alert: ExportAlert;
    cache: ExportCache;
    cacheStats: ExportCacheStats;
    coinRecharge: ExportCoinRecharge;
    coins: ExportCoins;
    data: ExportData;
    dataSource: ExportDataSource;
    eastmoney: ExportEastmoney;
    env: ExportEnv;
    fundamental: ExportFundamental;
    home: ExportHome;
    logs: ExportLogs;
    membership: ExportMembership;
    netease: ExportNetease;
    notification: ExportNotification;
    page: ExportPage;
    pageGroup: ExportPageGroup;
    pageStats: ExportPageStats;
    permissionTemplate: ExportPermissionTemplate;
    portfolio: ExportPortfolio;
    simulation: ExportSimulation;
    sina: ExportSina;
    stock: ExportStock;
    tencent: ExportTencent;
    tushare: ExportTushare;
    user: ExportUser;
    watchlist: ExportWatchlist;
  }
}
