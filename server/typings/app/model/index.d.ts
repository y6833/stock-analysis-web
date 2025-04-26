// This file is created by egg-ts-helper@1.35.2
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportIndex = require('../../../app/model/index');
import ExportUser = require('../../../app/model/user');
import ExportUserPreference = require('../../../app/model/user_preference');

declare module 'egg' {
  interface IModel {
    Index: ReturnType<typeof ExportIndex>;
    User: ReturnType<typeof ExportUser>;
    UserPreference: ReturnType<typeof ExportUserPreference>;
  }
}
