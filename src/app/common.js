const i_path = require('path');

const ZLAB_APP_DATA_BASE_DIR = (
   process.env.ZLAB_APP_DATA_BASE_DIR?
   i_path.resolve(process.env.ZLAB_APP_DATA_BASE_DIR):null
);
if (!ZLAB_APP_DATA_BASE_DIR) {
   console.warn('[!] ZLAB_APP_DATA_BASE_DIR is empty: app persistence is disabled');
}

const api = {
   config: {
      baseDir: ZLAB_APP_DATA_BASE_DIR
   },
};

module.exports = api;
