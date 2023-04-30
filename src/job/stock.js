const i_fs = require('fs');
const i_path = require('path');
const i_env = require('./env');

/*
 * <T> = open, close, max, min
 * .<T>.today, .<T>.at(day(-1)), .<T>.at(yyyymmdd), .<T>.range(week), .<T>.range(day(-10), day(-1)), .<T>.range(thisweek(-1)), .<T>.range(thisyear)
 * math.sin, math.cos, math.pi, math.floor, math.ceil, math.round, math.e, math.ln, math.random, math.exp, math.pow
 * math.sum, math.average, math.max, math.min
 * +, -, *, /, >, <, =, and, or, not, (, ), ^
 */
const stops = ['(', ')', ',', '+', '-', '*', '/', '<', '>', '=', '^'];
const stops2 = ['and', 'or', 'not'];
function tokenize(query) {
   const tokens = query.split(/\s+/).reduce(
      (a, x) => {
         const n = x.length;
         let j = 0;
         for (let i = 0; i < n; i++) {
            const ch = x.charAt(i);
            if (stops.includes(ch)) {
               const prev = x.substring(j, i);
               j = i+1;
               if (prev) a.push(prev);
               a.push(ch);
            }
         }
         if (j < n) a.push(x.substring(j, n));
         return a;
      }, []
   );
   return tokens;
}

function isFilterQuery(tokens) {
   for (let i = 0, n = tokens.length; i < n; i++) {
      const t = tokens[i];
      if (t.startsWith('.')) return true;
   }
   return false;
}

function getLast(list) {
   return list[list.length - 1];
}

const priority = [['^'], ['*', '/'], ['+', '-'], ['<', '>', '='], ['not'], ['and', 'or']];
function getPriority(op) {
   if (Array.isArray(op)) return -1;
   for (let i = 0, n = priority.length; i < n; i++) {
      const pr = priority[i];
      if (pr.includes(op)) return i;
   }
   return -1;
}
function compileSeq(valstack, opstack) {
   while (opstack.length) {
      const op = opstack.pop();
      const b = valstack.pop();
      const a = valstack.pop();
      if (op === 'not') {
         valstack.push(a);
         valstack.push([op, null, b]);
      } else {
         valstack.push([op, a, b]);
      }
   }
   return valstack.pop();
}
function compileWrap(tokens) {
   const root = [];
   compile(root, tokens, 0, undefined);
   return root;
}
function compile(tree, tokens, i, edt) {
   // fn ( ... ), ( ... ), var, num, ...
   const valstack = [];
   const opstack = [];
   const mulvals = [];
   for(let n = tokens.length; i < n; i++) {
      const t = tokens[i];
      if (t === edt) break;
      if (stops.includes(t) || stops2.includes(t)) {
         if (t === '(') {
            const subtree = [];
            i = compile(subtree, tokens, i+1, ')');
            valstack.push(subtree);
         } else if (t === ',') {
            const newval = compileSeq(valstack, opstack);
            mulvals.push(newval);
         } else if (opstack.length) {
            const prevop = getLast(opstack);
            const prp = getPriority(prevop);
            const prt = getPriority(t);
            if (prt < prp) {
               opstack.push(t);
            } else {
               const newval = compileSeq(valstack, opstack);
               valstack.push(newval);
               opstack.push(t);
            }
         } else {
            opstack.push(t);
         }
      } else if (tokenIsNumber(t)) {
         valstack.push(parseFloat(t));
      } else if (tokens[i+1] === '('){
         const subtree = [t, []];
         i = compile(subtree[1], tokens, i+2, ')');
         valstack.push(subtree);
      } else {
         valstack.push(t);
      }
   }
   tree = tree || [];
   let val = compileSeq(valstack, opstack);
   while (val && Array.isArray(val) && val.length === 1) val = val[0];
   mulvals.forEach(x => tree.push(x));
   tree.push(val);
   return i;
}

function tokenIsNumber(x) {
   return (parseFloat(x) + '') === x;
}

function opcall(op, a, b) {
   switch (op) {
   case '+':
      if (a === null) return b; // +1
      return a + b;
   case '-':
      if (a === null) return -b; // -1
      return a - b;
   case '*':
      return a * b;
   case '/':
      return a / b;
   case '^':
      return Math.pow(a, b);
   case '=':
      return a === b;
   case '>':
      return a > b;
   case '<':
      return a < b;
   case 'and':
      return a && b;
   case 'or':
      return a || b;
   case 'not':
      return !b;
   case ',': {
      let obj = !!a && a.comma || { comma: [a] };
      obj.comma.push(b);
      return obj;
   }
   default:
      return NaN;
   }
}

function timediff_year(date, n) {
   const year = date.getFullYear();
   const r = new Date(date);
   r.setFullYear(year + n);
   return r;
}
function datenumber2datets(num) {
   const datestr = `${num}`;
   if (datestr.length !== 8) return -Infinity;
   return new Date(`${datestr.substring(0,4)}-${datestr.substring(4,6)}-${datestr.substring(6,8)}`).getTime();
}
function getRecords(datatable, dates) {
   const r = [];
   dates.sort((a, b) => b - a);
   let j = 0, n = dates.length;
   for (let i = datatable.length - 2; i >= 0 && j < n; ) {
      const x = datatable[i];
      const d0 = x.date;
      const d = dates[j];
      if (d >= d0) {
         // e.g. weekday === latestRecord , weekend > latestRecord
         r.push(x);
         j ++;
      } else {
         i --;
      }
   }
   for (let i = j; i < n; i++) r.push(null);
   return r;
}
function getRecordsByRange(datatable, a, b) {
   // (a, b]
   if (!datatable) return [];
   return datatable.filter(x => x.date > a && x.date <= b);
}

const DT_1DAY = 24 * 3600 * 1000;
const DT_1WEEK = DT_1DAY * 7;
const colmap = { open: 'st', close: 'ed' };
function fncall(fn, args, datatable, cache) {
   if (typeof(fn) !== 'string') return fn;
   if (!fn) return NaN;
   while (Array.isArray(args) && args.length === 1) args = args[0];
   const parts = fn.split('.');
   if (parts[0] === '' || parts[0].startsWith('sh') || parts[0].startsWith('sz') || parts[0].startsWith('bj')) {
      const stockid = parts[0];
      if (stockid) datatable = loaddata(i_path.join(i_env.app.stock.dataDir, `${stockid}.json`));
      const col = colmap[parts[1]] || parts[1];
      const subfn = parts[2];
      switch(subfn) {
      case 'today': {
         if (!datatable || datatable.length === 0) return NaN;
         return getLast(datatable)[col] || NaN;
      }
      // XXX: Security | too many records selected -> OOM kill
      case 'at': {
         const last = datatable && getLast(datatable);
         const dates = [];
         if (typeof(getLast(args)) === 'string') args = [args];
         args.forEach(x => {
            if (Array.isArray(x)) {
               const ldts = last ? last.date : 0;
               const dt = x.pop();
               x.forEach(z => {
                  switch (dt) {
                  case '1': dates.push(ldts + z * DT_1DAY); break;
                  case '7':
                  case '7-': dates.push(ldts + z * DT_1WEEK); break;
                  case '365':
                  case '365-': dates.push(timediff_year(new Date(ldts), z).getTime()); break;
                  }
               });
               return;
            }
            if (x < 0) return dates.push(-Infinity);
            dates.push(datenumber2datets(x));
         });
         const rs = getRecords(datatable, dates);
         return rs.map(x => x && x[col] || NaN);
      }
      case 'atrange': {
         const last = datatable && getLast(datatable);
         const ldts = last.date;
         const dateps = [0, 0];
         if (typeof(getLast(args)) === 'string') {
            const dt = getLast(args);
            switch (dt) {
            case '7':
               dateps[1] = ldts + args[0] * DT_1WEEK;
               dateps[0] = dateps[1] - DT_1WEEK;
               break;
            case '365':
               dateps[1] = timediff_year(new Date(ldts), args[0]).getTime();
               dateps[0] = timediff_year(new Date(dateps[1]), -1).getTime();
               break;
            case '7-': {
               const ldt = new Date(ldts);
               const day = ldt.getDay();
               const ldts_align = ldts - day * DT_1DAY;
               dateps[0] = ldts_align + args[0] * DT_1WEEK - 1;
               dateps[1] = dateps[0] + DT_1WEEK + 1;
               break;
            }
            case '365-': {
               const ldt = new Date(ldts);
               const y = ldt.getFullYear() + args[0];
               dateps[0] = new Date(`${y}-01-01`).getTime() - 1;
               dateps[1] = new Date(`${y}-12-31`).getTime();
               break;
            }
            default: return [];
            }
         } else {
            const a = args[0];
            if (Array.isArray(a)) {
               if (a.pop() !== '1') return [];
               dateps[0] = ldts + a[0] * DT_1DAY;
            } else {
               dateps[0] = datenumber2datets(a[0]);
            }
            const b = args[1];
            if (Array.isArray(b)) {
               if (b.pop() !== '1') return [];
               dateps[1] = ldts + b[0] * DT_1DAY;
            } else {
               dateps[1] = datenumber2datets(b[0]);
            }
         }
         const rs = getRecordsByRange(datatable, dateps[0], dateps[1]);
         return rs.map(x => x ? x[col] : NaN);
      }
      case 'debug': console.log(args); return args;
      default: return NaN;
      }
   }
   switch(fn) {
   case 'debug': console.log(args); return args;
   case 'day': return Array.isArray(args) ? (args.push('1') && args) : [args, '1'];
   case 'week': return Array.isArray(args) ? (args.push('7') && args) : [args || 0, '7'];
   case 'year': return Array.isArray(args) ? (args.push('365') && args) : [args || 0, '365'];
   case 'thisweek': return Array.isArray(args) ? (args.push('7-') && args) : [args || 0, '7-'];
   case 'thisyear': return Array.isArray(args) ? (args.push('365-') && args) : [args || 0, '365-'];
   case 'average':
   case 'math.average':
   case 'avg':
   case 'math.avg': return Array.isArray(args) ? args.reduce((a, x) => a + x, 0) / args.length : args;
   case 'abs':
   case 'math.abs': return Array.isArray(args) ? args.map(x => Math.abs(x)) : Math.abs(args);
   case 'max':
   case 'math.max': return Array.isArray(args) ? Math.max(...args) : args;
   case 'min':
   case 'math.min': return Array.isArray(args) ? Math.min(...args) : args;
   case 'sum':
   case 'math.sum': return Array.isArray(args) ? args.reduce((a, x) => a + x, 0) : args;
   case 'floor':
   case 'math.floor': return Array.isArray(args) ? args.map(x => Math.floor(x)) : Math.floor(args);
   case 'ceil':
   case 'math.ceil': return Array.isArray(args) ? args.map(x => Math.ceil(x)) : Math.ceil(args);
   case 'round':
   case 'math.round': return Array.isArray(args) ? args.map(x => Math.round(x)) : Math.round(args);
   case 'ln':
   case 'math.ln': return Array.isArray(args) ? args.map(x => Math.log(x)) : Math.log(args);
   case 'exp':
   case 'math.exp': return Array.isArray(args) ? args.map(x => Math.exp(x)) : Math.exp(args);
   case 'pow':
   case 'math.pow': return Array.isArray(args) ? (args.length===1?args[0]:Math.pow(args[0], args[1])) : args;
   case 'e':
   case 'math.e': return Math.E;
   case 'sin':
   case 'math.sin': return Array.isArray(args) ? args.map(x => Math.sin(x)) : Math.sin(args);
   case 'cos':
   case 'math.cos': return Array.isArray(args) ? args.map(x => Math.sin(x)) : Math.cos(args);
   case 'pi':
   case 'math.pi': return Math.PI;
   case 'random':
   case 'math.random': return Math.random();
   default: return NaN;
   }
}

function evaluate(tree, datatable, cache) {
   // datatable = { date: new Date(...).getTime(), st, ed, min, max }
   if (!tree) return null;
   cache = cache || {}; // e.g. .open.range -> week
   if (!Array.isArray(tree)) return fncall(tree, null, datatable, cache);
   const op = tree[0];
   if (Array.isArray(op)) {
      return tree.map(x => evaluate(x, datatable, cache));
   } else if (stops.includes(op) || stops2.includes(op)) {
      const a = tree[1];
      const b = tree[2];
      return opcall(op, evaluate(a, datatable, cache), evaluate(b, datatable, cache));
   } else if (Array.isArray(tree)) {
      const args = evaluate(tree[1], datatable, cache);
      return fncall(op, args, datatable, cache);
   } else {
      return fncall(op, null, datatable, cache);
   }
}

function loaddata(fname) {
   const data = [];
   try {
      i_fs.readFileSync(fname).toString().split('\n').map(
         line => line && JSON.parse(line)
      ).forEach(x => {
         if (!x) return;
         x.date = new Date(x.date).getTime();
         x.st = parseFloat(x.st);
         x.ed = parseFloat(x.ed);
         x.min = parseFloat(x.min);
         x.max = parseFloat(x.max);
         x.amount = parseFloat(x.amount);
         x.money = parseFloat(x.money);
         data.push(x);
      });
   } catch (err) {};
   return data;
}
async function asyncLoaddata(fname) {
   const data = [];
   try {
      (await asyncReadFile(fname)).toString().split('\n').map(
         line => line && JSON.parse(line)
      ).forEach(x => {
         if (!x) return;
         x.date = new Date(x.date).getTime();
         x.st = parseFloat(x.st);
         x.ed = parseFloat(x.ed);
         x.min = parseFloat(x.min);
         x.max = parseFloat(x.max);
         x.amount = parseFloat(x.amount);
         x.money = parseFloat(x.money);
         data.push(x);
      });
   } catch (err) {};
   return data;

   function asyncReadFile(fname) { return new Promise((r) => { i_fs.readFile(fname, (err, buf) => { if (err) r(null); else r(buf); }); }); }
   function asyncStat(fname) { return new Promise((r) => { i_fs.stat(fname, (err, s) => { if (err) r(null); else r(s); }); }); }
}

async function act(query) {
   const tokens = tokenize(query);
   const expr = compileWrap(tokens);
   if (isFilterQuery(tokens)) {
      const files = await ls(i_env.app.stock.dataDir);
      const r = {};
      for (let i = 0, n = files.length; i < n; i++) {
         const name = files[i].split('.')[0];
         const fname = i_path.join(i_env.app.stock.dataDir, files[i]);
         const oner = evaluate(expr, await asyncLoaddata(fname));
         r[name] = oner;
      }
      return { type: 'filter', result: r }
   } else {
      const r = evaluate(expr);
      return { type: 'calc', result: r }
   }

   function ls(path) {
      return new Promise((r) => {
         i_fs.readdir(path, (err, list) => {
            if (err) return r([]);
            r(list.filter(x => x.endsWith('.json')));
         });
      })
   }
}

const api = {
   loaddata,
   tokenize,
   isFilterQuery,
   compile: compileWrap,
   evaluate,
   // evaluate(compile(tokenize(...), loaddata(...)))
   act,
};

module.exports = api;
