var i_fs = require("fs"),
  i_PNG = require("pngjs").PNG;

const input = process.argv[2];
const output = process.argv[3];
const threshold = parseInt(process.argv[4] || '250');

i_fs.createReadStream(input).pipe(
   new i_PNG({ filterType: 4,})
).on("parsed", function () {
   for (var y = 0; y < this.height; y++) {
      for (var x = 0; x < this.width; x++) {
         var idx = (this.width * y + x) << 2;
         if (
            this.data[idx] >= threshold &&
            this.data[idx+1] >= threshold &&
            this.data[idx+2] >= threshold
         ) {
            this.data[idx+3] = 0;
         }
      }
   }
   this.pack().pipe(fs.createWriteStream(output));
});
