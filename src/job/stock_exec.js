const i_fs = require('fs');
const i_path = require('path');
const i_env = require('./env');
const i_stock = require('./stock');

async function main() {
   const query = process.argv[2];
   const r = await i_stock.act(query);
   console.log(JSON.stringify(r));
}

(async () => { await main(); })();
