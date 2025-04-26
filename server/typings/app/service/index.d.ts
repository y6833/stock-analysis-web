// This file is created by egg-ts-helper@1.35.2
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
type AnyClass = new (...args: any[]) => any;
type AnyFunc<T = any> = (...args: any[]) => T;
type CanExportFunc = AnyFunc<Promise<any>> | AnyFunc<IterableIterator<any>>;
type AutoInstanceType<T, U = T extends CanExportFunc ? T : T extends AnyFunc ? ReturnType<T> : T> = U extends AnyClass ? InstanceType<U> : U;
import ExportPortfolio = require('../../../app/service/portfolio');
import ExportUser = require('../../../app/service/user');
import ExportWatchlist = require('../../../app/service/watchlist');

declare module 'egg' {
  interface IService {
    portfolio: AutoInstanceType<typeof ExportPortfolio>;
    user: AutoInstanceType<typeof ExportUser>;
    watchlist: AutoInstanceType<typeof ExportWatchlist>;
  }
}
