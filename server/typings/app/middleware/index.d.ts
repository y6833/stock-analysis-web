// This file is created by egg-ts-helper@1.35.2
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportAdminAuth = require('../../../app/middleware/adminAuth');
import ExportApiLogger = require('../../../app/middleware/apiLogger');
import ExportApiVersion = require('../../../app/middleware/api_version');
import ExportAuth = require('../../../app/middleware/auth');
import ExportCache = require('../../../app/middleware/cache');
import ExportErrorHandler = require('../../../app/middleware/error_handler');
import ExportGraphqlContext = require('../../../app/middleware/graphql_context');
import ExportSecurity = require('../../../app/middleware/security');

declare module 'egg' {
  interface IMiddleware {
    adminAuth: typeof ExportAdminAuth;
    apiLogger: typeof ExportApiLogger;
    apiVersion: typeof ExportApiVersion;
    auth: typeof ExportAuth;
    cache: typeof ExportCache;
    errorHandler: typeof ExportErrorHandler;
    graphqlContext: typeof ExportGraphqlContext;
    security: typeof ExportSecurity;
  }
}
