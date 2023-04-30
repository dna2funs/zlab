const i_ws = require('ws');

const env = {
   handler: {},
   wss: null,
   pathConfig: {},
};

function delWsPathHandler(path) {
   delete env.pathConfig[path];
}

function addWsPathHandler(server, path, fn, opt) {
   if (!env.pathConfig[path]) env.pathConfig[path] = {};
   const config = env.pathConfig[path];
   config.path = path;
   config.fn = fn;
   config.opt = opt;
   if (env.wss) return;
   // lazy init
   env.wss = new i_ws.WebSocketServer({ noServer: true });
   env.wss.on('connection', (ws, req, path) => {
      const config = env.pathConfig[path];
      if (!path || !config) {
         try { ws.terminate(); } catch (err) { }
         return;
      }
      const fn = config.fn;
      const onOpen = config.opt.onOpen;
      const onClose = config.opt.onClose;
      const onError = config.opt.onError;
      const timeout = config.opt.timeout;
      const local = { ws };
      onOpen && onOpen(ws, local);
      if (timeout > 0) setTimeout(() => (!local.authenticated) && ws.terminate(), timeout);
      ws.on('close', () => {
         local.closed = true;
         onClose && onClose(ws, local);
      });
      ws.on('error', (err) => {
         local.closed = true;
         onError && onError(err, ws, local);
      });
      ws.on('message', (m) => {
         try {
            if (!m.length || m.length > 10*1024*1024 /* 10MB */) throw 'invalid message';
            m = JSON.parse(m);
            fn && fn(ws, local, m);
         } catch(err) {
console.log(err);
            ws.terminate();
            return;
         }
      });
   });
   server.on('upgrade', (req, socket, head) => {
      // authenticate: socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); socket.destroy();
      const configs = Object.values(env.pathConfig);
      for (const config of configs) {
         env.wss.handleUpgrade(req, socket, head, (ws) => {
            env.wss.emit('connection', ws, req, config.path);
         });
         return;
      }
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
   });
}

function makeWebsocket(server, name, path, fn, opt) {
   // fn = websocketClient, localEnv, messageJson
   if (env.handler[name]) {
      env.handler[name] = false;
      delWsPathHandler(path);
   }
   env.handler[name] = true;
   addWsPathHandler(server, path, fn, opt);
}

module.exports = {
   makeWebsocket,
};
