// This file is created by egg-ts-helper@1.35.2
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
type AnyClass = new (...args: any[]) => any;
type AnyFunc<T = any> = (...args: any[]) => T;
type CanExportFunc = AnyFunc<Promise<any>> | AnyFunc<IterableIterator<any>>;
type AutoInstanceType<T, U = T extends CanExportFunc ? T : T extends AnyFunc ? ReturnType<T> : T> = U extends AnyClass ? InstanceType<U> : U;
import ExportAdmin = require('../../../app/service/admin');
import ExportAlert = require('../../../app/service/alert');
import ExportCache = require('../../../app/service/cache');
import ExportCacheStats = require('../../../app/service/cacheStats');
import ExportCoinRecharge = require('../../../app/service/coinRecharge');
import ExportCoins = require('../../../app/service/coins');
import ExportData = require('../../../app/service/data');
import ExportLogs = require('../../../app/service/logs');
import ExportMembership = require('../../../app/service/membership');
import ExportNotification = require('../../../app/service/notification');
import ExportPage = require('../../../app/service/page');
import ExportPortfolio = require('../../../app/service/portfolio');
import ExportProxy = require('../../../app/service/proxy');
import ExportSimulation = require('../../../app/service/simulation');
import ExportStock = require('../../../app/service/stock');
import ExportUser = require('../../../app/service/user');
import ExportWatchlist = require('../../../app/service/watchlist');

declare module 'egg' {
  interface IService {
    admin: AutoInstanceType<typeof ExportAdmin>;
    alert: AutoInstanceType<typeof ExportAlert>;
    cache: AutoInstanceType<typeof ExportCache>;
    cacheStats: AutoInstanceType<typeof ExportCacheStats>;
    coinRecharge: AutoInstanceType<typeof ExportCoinRecharge>;
    coins: AutoInstanceType<typeof ExportCoins>;
    data: AutoInstanceType<typeof ExportData>;
    logs: AutoInstanceType<typeof ExportLogs>;
    membership: AutoInstanceType<typeof ExportMembership>;
    notification: AutoInstanceType<typeof ExportNotification>;
    page: AutoInstanceType<typeof ExportPage>;
    portfolio: AutoInstanceType<typeof ExportPortfolio>;
    proxy: AutoInstanceType<typeof ExportProxy>;
    simulation: AutoInstanceType<typeof ExportSimulation>;
    stock: AutoInstanceType<typeof ExportStock>;
    user: AutoInstanceType<typeof ExportUser>;
    watchlist: AutoInstanceType<typeof ExportWatchlist>;
  }
}
