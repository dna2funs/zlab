const i_fs = require('fs');
const i_path = require('path');
const i_url = require('url');

const i_env = require('./env');
const i_job_env = require('./job/env');
const i_auth = require('./auth');
const i_api = {
   test: (req, res, options) => {
      console.log(options);
      res.end('');
   },
   app: {
      family: {
         expense: require('./app/family/expense').webRestful,
      }, // family
   }, // app
};

const Mime = {
   '.html': 'text/html',
   '.css': 'text/css',
   '.js': 'text/javascript',
   '.svg': 'image/svg+xml',
   '.json': 'application/json',
   '.ico': 'image/x-icon',
   '.png': 'image/png',
   '.jpg': 'image/jpeg',
   _default: 'text/plain',
   lookup: (filename) => {
      let ext = i_path.extname(filename);
      if (!ext) return Mime._default;
      let content_type = Mime[ext];
      if (!content_type) content_type = Mime._default;
      return content_type;
   }
};

const Cache = {
   maxSize: 128 * 1024 * 1024, /* 128 MB */
   size: 0,
   pool: null
};

function basicRoute (req, res, router) {
   const r = i_url.parse(req.url);
   const originPath = r.pathname.split('/');
   const path = originPath.slice();
   const query = {};
   let f = router;
   if (r.query) r.query.split('&').forEach((one) => {
      let key, val;
      let i = one.indexOf('=');
      if (i < 0) {
         key = one;
         val = '';
      } else {
         key = one.substring(0, i);
         val = one.substring(i+1);
      }
      if (key in query) {
         if(Array.isArray(query[key])) {
            query[key].push(val);
         } else {
            query[key] = [query[key], val];
         }
      } else {
         query[key] = val;
      }
   });
   path.shift();
   while (path.length > 0) {
      let key = path.shift();
      f = f[key];
      if (!f) break;
      if (typeof(f) === 'function') {
         return f(req, res, {
            path: path,
            query: query
         });
      }
   }
   if (i_env.server.staticDir) {
      let r = serveStatic(res, i_env.server.staticDir, originPath);
      if (r) return r;
   }
   return serveCode(req, res, 404, 'Not Found');
}

function serveCode(req, res, code, text) {
   res.writeHead(code || 500, text || '');
   res.end();
}

function serveStatic (res, base, path) {
   if (!i_env.server.staticDir) return false;
   if (path.indexOf('..') >= 0) return false;
   path = path.slice(1);
   if (path.length && !path[path.length-1]) path[path.length-1] = 'index.html';
   if (!Cache.pool) Cache.pool = {};
   let filename = i_path.join(base, ...path);
   let mimetype = Mime.lookup(filename);
   if (mimetype !== Mime._default) {
      res.setHeader('Content-Type', mimetype);
   }
   let buf = Cache.pool[filename], state;
   if (buf) {
      if (!i_fs.existsSync(filename)) {
         delete buf[filename];
         return false;
      }
      state = i_fs.statSync(filename);
      if (buf.mtime === state.mtimeMs) {
         buf = buf.raw;
      } else {
         buf.mtime = state.mtimeMs;
         buf.raw = i_fs.readFileSync(filename);
         buf = buf.raw;
      }
   } else {
      if (!i_fs.existsSync(filename)) {
         return false;
      }
      state = i_fs.statSync(filename);
      if (!state.isFile()) {
         return false;
      }
      buf = i_fs.readFileSync(filename);
      Cache.pool[filename] = {
         mtime: state.mtimeMs,
         raw: buf
      };
      Cache.size += buf.length + filename.length;
      while (Cache.size > Cache.maxSize) {
         let keys = Object.keys(Cache.pool);
         let key = keys[~~(Math.random() * keys.length)];
         let val = Cache.pool[key];
         if (!key || !val) return false; // should not be
         delete Cache.pool[key];
         Cache.size -= val.raw.length + key.length;
      }
   }
   res.write(buf);
   res.end();
   return true;
}

function createServer(router) {
   let server = null;
   router = Object.assign({}, router);
   if (i_env.server.httpsCADir) {
      const i_https = require('https');
      const https_config = {
         // openssl req -newkey rsa:2048 -new -nodes -x509 -days 365 -keyout ca.key -out ca.crt
         key: i_fs.readFileSync(i_path.join(i_env.server.httpsCADir, 'ca.key')),
         cert: i_fs.readFileSync(i_path.join(i_env.server.httpsCADir, 'ca.crt')),
      };
      server = i_https.createServer(https_config, (req, res) => {
         basicRoute(req, res, router);
      });
   } else {
      const i_http = require('http');
      server = i_http.createServer((req, res) => {
         basicRoute(req, res, router);
      });
   }
   return server;
}

const server = createServer({
   test: (_req, res, options) => {
      res.end(JSON.stringify({
         text: 'hello world',
         path: `/${options.path.join('/')}`
      }));
   },
   auth: i_auth.webRestful,
   api: i_api,
});

/*
const wsapi = {
   safeClose: (ws) => {
      if (!ws) return;
      try { ws.terminate() } catch(err) { }
   },
   safeSend: (ws, buf) => {
      if (!ws) return;
      if (ws.readyState !== ws.OPEN) return;
      try { ws.send(buf); } catch(err) { }
   },
   safeSendJson: (ws, json) => {
      return wsapi.safeSend(ws, JSON.stringify(json));
   },
   autoid: 0,
   idInc: () => { wsapi.autoid = (wsapi.autodi + 1) % 10000000; },
};

const i_spawn = require('child_process').spawn;
function createJobStock(ws, local, m) {
   try {
      if (local.job) {
         if (m.sub === 'cancel') local.job.kill();
         return;
      }
      const outfname = i_path.join(i_job_env.app.stock.retDir, `${local.rid}`);
      const p = i_spawn('node', [i_env.server.app.stock.exec, m.query, outfname, m.selectedids || '']);
      local.job = p;
p.stdout.pipe(process.stdout);
p.stderr.pipe(process.stderr);
      p.on('close', (code) => {
         try {
            i_fs.readFile(outfname, (err, buf) => {
               if (err) return;
               try {
                  const json = JSON.parse(buf);
                  wsapi.safeSendJson(ws, { id: local.rid, json });
               } catch (err) {
               } finally {
                  i_fs.unlink(outfname, () => {});
               }
            });
         } catch (err) {
         }
         try {
            wsapi.safeSendJson(ws, { id: local.rid, done: true, code });
         } catch (err) {
         }
         local.job = null;
      });
   } catch (err) {
      // XXX+TODO: double check local.job process status
      local.job = null;
   }
}
const i_makeWebsocket = require('./websocket').makeWebsocket;
i_makeWebsocket(server, 'job', '/job', (ws, local, m) => {
   if (!local.authenticated) {
      if (m && m.cmd === 'auth') {
         if (!m.user || !m.uuid) return;
         i_auth.checkUserSession(m.user, m.uuid).then(updatedSessionId => {
            const authres = { auth: true };
            if (m.uuid !== updatedSessionId) authres.nextSessionId = updatedSessionId;
            wsapi.safeSendJson(ws, authres);
            local.authenticated = true;
            local.rid = wsapi.autoid;
            wsapi.idInc();
         });
      }
      return;
   }
   // TODO: accept job and calc using task.js
   switch(m.cmd) {
   case '/stock': return createJobStock(ws, local, m);
   }
}, {
   timeout: 3000,
   onOpen: (ws, local) => {},
   onClose: (ws, local) => {
      if (local.job) { try { local.job.kill(); } catch (err) {} }
      local.job = null;
   },
   onError: (err, ws, local) => {},
});
*/

server.listen(i_env.server.port, i_env.server.host, () => {
   console.log(`zLab server is listening at ${i_env.server.host}:${i_env.server.port}`);
});
