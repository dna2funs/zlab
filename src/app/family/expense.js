const i_path = require('path');

const i_util = require('../../util');
const i_auth = require('../../auth');
const i_common = require('../common');

// family expense audit (FEA)
const ZLAB_APP_FEA_DATA_DIR = i_path.join(i_common.config.baseDir, 'app', 'family', 'expense');

/*
 - /app/family/expense
    - /<username>
       - /config.json
       - /<year>-<month>.json
 */

const api = {
   prepareDirectory: async (username) => {
      const dir = i_path.join(ZLAB_APP_FEA_DATA_DIR, username);
      if (!(await i_util.fileOp.exist(dir))) {
         await i_util.fileOp.mkdir(dir);
      }
   },
   readConfig: async (username) => {
      await api.prepareDirectory(username);
      const configfile = i_path.join(ZLAB_APP_FEA_DATA_DIR, username, 'config.json');
      if (await i_util.fileOp.exist(configfile)) {
         return JSON.parse(await i_util.fileOp.read(configfile));
      } else {
         return {};
      }
   }, // readConfig
   updateConfig: async (username, config) => {
      await api.prepareDirectory(username);
      const configfile = i_path.join(ZLAB_APP_FEA_DATA_DIR, username, 'config.json');
      const obj = {};
      if (await i_util.fileOp.exist(configfile)) {
         Object.assign(obj, JSON.parse(await i_util.fileOp.read(configfile)));
      }
      Object.assign(obj, config);
      await i_util.fileOp.write(configfile, JSON.stringify(obj));
   }, // updateConfig
   readExpense: async (username, year, month) => {
      const name = `${year}-${month}.json`;
      const expensefile = i_path.join(ZLAB_APP_FEA_DATA_DIR, username, name);
      if (await i_util.fileOp.exist(expensefile)) {
         return JSON.parse(await i_util.fileOp.read(expensefile));
      } else {
         return {};
      }
   }, // readExpense
   writeExpense: async (username, year, month, obj) => {
      await api.prepareDirectory(username);
      const name = `${year}-${month}.json`;
      const expensefile = i_path.join(ZLAB_APP_FEA_DATA_DIR, username, name);
      await i_util.fileOp.write(expensefile, JSON.stringify(obj));
   }, // writeExpense
   getSharedFrom: async (username) => {
      const expensedir = i_path.join(ZLAB_APP_FEA_DATA_DIR);
      const users = await i_util.fileOp.readdir(expensedir);
      const shareFrom = [];
      for (let i = 0, n = users.length; i < n; i++) {
         const user = users[i];
         if (username === user) continue;
         const config = await api.readConfig(user);
         if (config && Array.isArray(config.shareTo)) {
            if (config.shareTo.includes(username)) shareFrom.push(user);
         }
      }
      return shareFrom;
   }, // getSharedFrom
};

const restful = {
   get: i_auth.requireLogin(async (req, res, opt) => {
      const username = opt.json.user;
      const year = parseInt(opt.json.year || '0');
      const month = parseInt(opt.json.month || '0');
      if (!year || !month) return i_util.e400(res);
      if (year <= 1900 || year > 10000 || month <= 0 || month > 12) return i_util.e400(res);
      try {
         const obj = {};
         const config = await api.readConfig(username);
         const selfItems = await api.readExpense(username, year, month);
         const sharedFrom = await api.getSharedFrom(username);
         obj.config = {};
         if (config.shareTo) obj.config.shareTo = config.shareTo;
         obj.items = selfItems && selfItems.items || [];
         obj.shared = {};
         for (let i = 0, n = sharedFrom.length; i < n; i++) {
            const user = sharedFrom[i];
            const sharedObj = await api.readExpense(user, year, month);
            obj.shared[user] = sharedObj.items || [];
         }
         i_util.rJson(res, obj);
      } catch(err) {
         console.error(err);
         i_util.e500(res);
      }
   }),
   put: i_auth.requireLogin(async (req, res, opt) => {
      const username = opt.json.user;
      const year = parseInt(opt.json.year || '0');
      const month = parseInt(opt.json.month || '0');
      // TODO check opt.json.items string length
      //      to avoid large data dumpped to disk
      const items = opt.json.items;
      if (!year || !month || !items) return i_util.e400(res);
      if (year <= 1900 || year > 10000 || month <= 0 || month > 12) return i_util.e400(res);
      const obj = {
         items: items.map((x) => x && x.c !== undefined && x.c !== null && ({
            // d = desc, c = cost, p = paid
            d: x.d, c: parseFloat(x.c), p: !!x.p
         })).filter((x) => !!x),
      };
      try {
         await api.writeExpense(username, year, month, obj);
         i_util.rJson(res, { ok: 1 });
      } catch(err) {
         console.error('api.app/family/expense#put', err);
         i_util.e500(res);
      }
   }),
   config: i_auth.requireLogin(async (req, res, opt) => {
      const username = opt.json.user;
      const shareTo = opt.json.shareTo;
      if (!shareTo || shareTo.length > 100) return i_util.e400(res);
      try {
         await api.updateConfig(username, {
            shareTo: shareTo.split(',').map(
               (x) => x.trim()
            ).filter((x) => !!x && x.indexOf('..') < 0)
         });
         i_util.rJson(res, { ok: 1 });
      } catch (err) {
         i_util.e500(res);
      }
   })
};

api.webRestful = restful;
module.exports = api;
