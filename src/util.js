const i_fs = require('fs');

const api = {
   readRequestBinary: async (req) => {
      return new Promise((resolve, reject) => {
         let body = [];
         req.on('data', (chunk) => { body.push(chunk); });
         req.on('end', () => {
            body = Buffer.concat(body);
            resolve(body);
         });
         req.on('error', reject);
      });
   }, // readRequstBinary
   readRequestJson: async (req) => {
      const bin = await api.readRequestBinary(req);
      try {
         return JSON.parse(bin);
      } catch (err) {
         return null;
      }
   }, // readRequestJson
   rJson: (res, json) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(json?JSON.stringify(json):'{}');
   },
   r200: (res, text) => {
      res.writeHead(200, text || null);
      res.end();
   },
   e400: (res, text) => {
      res.writeHead(400, text || 'Bad Request');
      res.end();
   },
   e401: (res, text) => {
      res.writeHead(401, text || 'Not Authenticated');
      res.end();
   },
   e403: (res, text) => {
      res.writeHead(403, text || 'Forbbiden');
      res.end();
   },
   e404: (res, text) => {
      res.writeHead(404, text || 'Not Found');
      res.end();
   },
   e405: (res, text) => {
      res.writeHead(405, text || 'Not Allowed');
      res.end();
   },
   e500: (res, text) => {
      res.writeHead(500, text || 'Internal Error');
      res.end();
   },
   fileOp: {
      exist: async (path) => {
         return new Promise((r, e) => {
            i_fs.lstat(path, (err) => {
               if (!err) return r(true);
               if (err.code === 'ENOENT') return r(false);
               return e(err);
            });
         });
      }, // exist
      readdir: async (path) => {
         return new Promise((r, e) => {
            i_fs.readdir(path, (err, list) => {
               if (err) return e(err);
               r(list);
            });
         });
      }, // readdir
      mkdir: async (path) => {
         return new Promise((r, e) => {
            i_fs.mkdir(path, { recursive: true }, (err) => {
               if (err) return e(err);
               r();
            });
         });
      }, // mkdir
      read: async (filename) => {
         return new Promise((r, e) => {
            i_fs.readFile(filename, (err, data) => {
               if (err) return e(err);
               r(data);
            });
         });
      }, // read
      write: async (filename, data) => {
         return new Promise((r, e) => {
            i_fs.writeFile(filename, data, (err) => {
               if (err) return e(err);
               r();
            });
         });
      }, // write
      unlink: async (filename) => {
         return new Promise((r, e) => {
            i_fs.unlink(filename, (err) => {
               if (err) return e(err);
               r();
            });
         });
      }, // unlink
   }, // fileOp
};

module.exports = api;
