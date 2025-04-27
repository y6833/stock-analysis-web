// This file is created by egg-ts-helper@1.35.2
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportEnv = require('../../../app/controller/env');
import ExportHome = require('../../../app/controller/home');
import ExportPortfolio = require('../../../app/controller/portfolio');
import ExportSimulation = require('../../../app/controller/simulation');
import ExportSina = require('../../../app/controller/sina');
import ExportStock = require('../../../app/controller/stock');
import ExportUser = require('../../../app/controller/user');
import ExportWatchlist = require('../../../app/controller/watchlist');

declare module 'egg' {
  interface IController {
    env: ExportEnv;
    home: ExportHome;
    portfolio: ExportPortfolio;
    simulation: ExportSimulation;
    sina: ExportSina;
    stock: ExportStock;
    user: ExportUser;
    watchlist: ExportWatchlist;
  }
}
