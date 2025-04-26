// This file is created by egg-ts-helper@1.35.2
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportHome = require('../../../app/controller/home');
import ExportPortfolio = require('../../../app/controller/portfolio');
import ExportUser = require('../../../app/controller/user');
import ExportWatchlist = require('../../../app/controller/watchlist');

declare module 'egg' {
  interface IController {
    home: ExportHome;
    portfolio: ExportPortfolio;
    user: ExportUser;
    watchlist: ExportWatchlist;
  }
}
