const i_fs = require('fs');
const i_path = require('path');
const i_env = require('./env');
const i_stock = require('./stock');

async function main() {
   const query = process.argv[2];
   const outputfname = process.argv[3];
   const selectedids = process.argv[4] ? process.argv[4].split(',').filter(x => !!x) : null;
   const r = await i_stock.act(query, selectedids);
   const outjson = JSON.stringify(r);
   if (outputfname) {
      i_fs.writeFileSync(outputfname, outjson);
   } else {
      console.log(outjson);
   }
}

(async () => { await main(); })();
