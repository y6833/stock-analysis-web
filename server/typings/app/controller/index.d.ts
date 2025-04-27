// This file is created by egg-ts-helper@1.35.2
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportAkshare = require('../../../app/controller/akshare');
import ExportEastmoney = require('../../../app/controller/eastmoney');
import ExportEnv = require('../../../app/controller/env');
import ExportHome = require('../../../app/controller/home');
import ExportNetease = require('../../../app/controller/netease');
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
    akshare: ExportAkshare;
    eastmoney: ExportEastmoney;
    env: ExportEnv;
    home: ExportHome;
    netease: ExportNetease;
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
