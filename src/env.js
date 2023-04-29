const i_path = require('path');

const env = {
   debug: !!process.env.ZLAB_DEBUG,
   server: {
      host: process.env.ZLAB_HOST || '127.0.0.1',
      port: parseInt(process.env.ZLAB_PORT || '8080'),
      staticDir: (
         process.env.ZLAB_STATIC_DIR?
         i_path.resolve(process.env.ZLAB_STATIC_DIR):null
      ),
      httpsCADir: (
         process.env.ZLAB_HTTPS_CA_DIR?
         i_path.resolve(process.env.ZLAB_HTTPS_CA_DIR):null
      ),
      auth: {
         baseDir: (
            process.env.ZLAB_AUTH_BASE_DIR?
            i_path.resolve(process.env.ZLAB_AUTH_BASE_DIR):null
         ),
         sessionDuration: parseInt(
            process.env.ZLAB_AUTH_TIMEOUT || `${24 * 3600}`
         ) * 1000 || Infinity,
         oneTimePhrase: !!process.env.ZLAB_ONETIME_PHRASE,
      },
      task: {
         queueN: parseInt(process.env.ZLAB_TASK_QUEUE_N || '100') || 100,
         parallelN: parseInt(process.env.ZLAB_TASK_PARALLEL_N || '1') || 1,
      },
      app: {
         baseDir: (
            process.env.ZLAB_APP_DATA_BASE_DIR?
            i_path.resolve(process.env.ZLAB_APP_DATA_BASE_DIR):null
         ),
      },
   },
};

if (!i_env.server.auth.baseDir) {
   console.warn('[!] ZLAB_AUTH_BASE_DIR is empty: authentication module not work');
}
if (!i_env.server.app.baseDir) {
   console.warn('[!] ZLAB_APP_DATA_BASE_DIR is empty: app persistence is disabled');
}

module.exports = env;
