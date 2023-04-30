const i_path = require('path');

const env = {
   sub: {
      pub: process.env.PUB_URL,
   },
   app: {
      stock: {
         dataDir: i_path.resolve(process.env.SUB_APP_STOCK_DATADIR),
         retDir: i_path.resolve(process.env.SUB_APP_STOCK_RETDIR),
         // retDir: i_path.resolve(process.env.SUB_APP_STOCK_RETDIR),
      },
   },
};

module.exports = env;
