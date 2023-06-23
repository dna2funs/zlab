const i_ws = require('ws');
const i_env = require('./env');

const env = {
   target: i_env.sub.pub,
   ws: null,
};

function safeClose(ws) {
   if (!ws) return;
   try { ws.terminate() } catch(err) { }
}
function safeSend(ws, buf) {
   if (!ws) return;
   if (ws.readyState !== i_ws.WebSocket.OPEN) return;
   try { ws.send(buf); } catch(err) { }
}
function safeSendJson(ws, json) {
   safeSend(ws, JSON.stringify(json));
}

function ping(ws, interval) {
   safeSendJson(ws, { c: 'ping' });
   if (!ws || ws.readyState !== i_ws.WebSocket.OPEN) return;
   setTimeout(ping, interval, ws, interval);
}

async function build(method, uri, payload) {
   console.log('[D]', new Date().toISOString(), method, uri, payload);
   try {
      const obj = {};
      switch(uri) {
      case '/stock/cmd':
      case '/stock/filter': // TODO: deal with stock filter query
      }
   } catch (err) {
      return null;
   }
}

function connect() {
   console.log(`[I] connecting to "${env.target}" ...`);
   try {
      const ws = new i_ws.WebSocket(env.target);
      env.ws = ws;
      ws.on('open', () => {
         console.log(`[I] connected.`);
      });
      ws.on('error', (err) => {
         console.log('[E]', err);
         env.ws = null;
      });
      ws.on('close', () => {
         console.log('[I] disconnected');
         env.ws = null;
      });
      ws.on('message', async (data) => {
         if (!data || data.length > 10*1024 /* 10K */) {
            return;
         }
         try { data = JSON.parse(data); } catch (err) { data = {}; }
         const id = data.id;
         const method = data.method;
         const uri = data.uri;
         const payload = data.data;
         if (!id || !method || !uri) return;
         try {
            const obj = await build(method, uri, payload);
            if (!obj || obj.error) throw 'error';
            const r = { id, data: obj.buf.toString('base64') };
            safeSendJson(ws, r);
         } catch (err) {
            safeSendJson(ws, { id, code: 500 });
         }
      });
      setTimeout(() => ping(env.ws, 30*1000), 30*1000);
   } catch (err) { }
}

function watchDog() {
   try {
      if (!env.ws) connect();
   } catch(err) { }
   setTimeout(watchDog, 10*1000);
}

//watchDog();
