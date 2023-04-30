const i_env = require('./env');

const queue = [];
const env = {
   n: i_env.task.queueN,
   runnable: i_env.task.parallelN,
};

async function run() {
   if (!queue.length) return;
   if (env.runnable <= 0) return;
   const task = queue.shift();
   // task.fn, task.r, task.e, task.init
   env.runnable --;
   if (task.init) {
      queue.push(task);
      next();
   }
   if (!task) return next();
   if (!task.fn) return next();
   if (typeof(task.fn) !== 'function') return next();
   const fntype = task.fn.constructor.name;
   try {
      let ret;
      if (fntype === 'AsyncFunction') {
         ret = await task.fn(task);
      } else if (fntype === 'Function') {
         ret = task.fn(task);
      }
      task.r(ret);
   } catch (err) {
      task.e(err);
   } finally {
      next();
   }

   function next() {
      env.runnable ++;
      run();
   }
}

function act(fn, args) {
   if (queue.length >= env.n) return null;
   const task = { fn, args, init: true };
   queue.push(task);
   const promise = new Promise((r, e) => {
      task.r = r;
      task.e = e;
      delete task.init;
      run();
   });
   return { task, promise };
}

const api = {
   act,
};

module.exports = api;
