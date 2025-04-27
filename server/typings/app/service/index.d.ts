// This file is created by egg-ts-helper@1.35.2
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
type AnyClass = new (...args: any[]) => any;
type AnyFunc<T = any> = (...args: any[]) => T;
type CanExportFunc = AnyFunc<Promise<any>> | AnyFunc<IterableIterator<any>>;
type AutoInstanceType<T, U = T extends CanExportFunc ? T : T extends AnyFunc ? ReturnType<T> : T> = U extends AnyClass ? InstanceType<U> : U;
import ExportAlert = require('../../../app/service/alert');
import ExportCache = require('../../../app/service/cache');
import ExportCacheStats = require('../../../app/service/cacheStats');
import ExportPortfolio = require('../../../app/service/portfolio');
import ExportSimulation = require('../../../app/service/simulation');
import ExportStock = require('../../../app/service/stock');
import ExportUser = require('../../../app/service/user');
import ExportWatchlist = require('../../../app/service/watchlist');

declare module 'egg' {
  interface IService {
    alert: AutoInstanceType<typeof ExportAlert>;
    cache: AutoInstanceType<typeof ExportCache>;
    cacheStats: AutoInstanceType<typeof ExportCacheStats>;
    portfolio: AutoInstanceType<typeof ExportPortfolio>;
    simulation: AutoInstanceType<typeof ExportSimulation>;
    stock: AutoInstanceType<typeof ExportStock>;
    user: AutoInstanceType<typeof ExportUser>;
    watchlist: AutoInstanceType<typeof ExportWatchlist>;
  }
}
