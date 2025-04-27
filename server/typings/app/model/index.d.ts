// This file is created by egg-ts-helper@1.35.2
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportAlertHistory = require('../../../app/model/alert_history');
import ExportDashboardWidget = require('../../../app/model/dashboard_widget');
import ExportIndex = require('../../../app/model/index');
import ExportPortfolioHolding = require('../../../app/model/portfolio_holding');
import ExportSimulationAccount = require('../../../app/model/simulation_account');
import ExportSimulationPosition = require('../../../app/model/simulation_position');
import ExportSimulationTransaction = require('../../../app/model/simulation_transaction');
import ExportStrategyExecution = require('../../../app/model/strategy_execution');
import ExportTradeRecord = require('../../../app/model/trade_record');
import ExportUser = require('../../../app/model/user');
import ExportUserAlert = require('../../../app/model/user_alert');
import ExportUserBrowsingHistory = require('../../../app/model/user_browsing_history');
import ExportUserDashboard = require('../../../app/model/user_dashboard');
import ExportUserPortfolio = require('../../../app/model/user_portfolio');
import ExportUserPreference = require('../../../app/model/user_preference');
import ExportUserStrategy = require('../../../app/model/user_strategy');
import ExportUserWatchlist = require('../../../app/model/user_watchlist');
import ExportWatchlistAlert = require('../../../app/model/watchlist_alert');
import ExportWatchlistAlertHistory = require('../../../app/model/watchlist_alert_history');
import ExportWatchlistItem = require('../../../app/model/watchlist_item');

declare module 'egg' {
  interface IModel {
    AlertHistory: ReturnType<typeof ExportAlertHistory>;
    DashboardWidget: ReturnType<typeof ExportDashboardWidget>;
    Index: ReturnType<typeof ExportIndex>;
    PortfolioHolding: ReturnType<typeof ExportPortfolioHolding>;
    SimulationAccount: ReturnType<typeof ExportSimulationAccount>;
    SimulationPosition: ReturnType<typeof ExportSimulationPosition>;
    SimulationTransaction: ReturnType<typeof ExportSimulationTransaction>;
    StrategyExecution: ReturnType<typeof ExportStrategyExecution>;
    TradeRecord: ReturnType<typeof ExportTradeRecord>;
    User: ReturnType<typeof ExportUser>;
    UserAlert: ReturnType<typeof ExportUserAlert>;
    UserBrowsingHistory: ReturnType<typeof ExportUserBrowsingHistory>;
    UserDashboard: ReturnType<typeof ExportUserDashboard>;
    UserPortfolio: ReturnType<typeof ExportUserPortfolio>;
    UserPreference: ReturnType<typeof ExportUserPreference>;
    UserStrategy: ReturnType<typeof ExportUserStrategy>;
    UserWatchlist: ReturnType<typeof ExportUserWatchlist>;
    WatchlistAlert: ReturnType<typeof ExportWatchlistAlert>;
    WatchlistAlertHistory: ReturnType<typeof ExportWatchlistAlertHistory>;
    WatchlistItem: ReturnType<typeof ExportWatchlistItem>;
  }
}
