(function () {

var env = {};
var ui = {
   label: {
      result: dom('#lbl-result')
   },
   txt: {
      cmd: dom('#txt-cmd')
   },
   btn: {
      run: dom('#btn-run')
   }
};

function sendJson(ws, json) { try { ws.send(JSON.stringify(json)); } catch (err) {} }

function buildCalcResult(div, query, result) {
   while (div.children.length) div.removeChild(div.children[0]);
   div.innerHTML = '';
   var tdiv = document.createElement('div');
   tdiv.appendChild(document.createTextNode('Q: ' + query));
   var rdiv = document.createElement('div');
   rdiv.appendChild(document.createTextNode('A: ' + result));
   div.appendChild(tdiv);
   div.appendChild(rdiv);
}

function appendLongResult(tbl, list, i, n) {
   if (i >= list.length) return;
   var m = Math.min(i + n, list.length);
   for (var j = i; j < m; j++) {
      var x = list[j];
      var tr = document.createElement('tr');
      var td0 = document.createElement('td');
      td0.appendChild(document.createTextNode(x[0]));
      var td1 = document.createElement('td');
      td1.appendChild(document.createTextNode(x[1]));
      tr.appendChild(td0);
      tr.appendChild(td1);
      tbl.appendChild(tr);
   }
   setTimeout(appendLongResult, 0, tbl, list, i + n, n);
}

function buildFilterResult(div, query, result) {
   while (div.children.length) div.removeChild(div.children[0]);
   div.innerHTML = '';
   var tdiv = document.createElement('div');
   tdiv.appendChild(document.createTextNode('Q: ' + query));
   var rdiv = document.createElement('div');
   if (result) {
      result = Object.keys(result).map(function (k) {
         return [k, result[k]];
      });
      result.sort((a, b) => {
         var va = a[1], vb = b[1];
         if (isNaN(va) && isNaN(vb)) return 0;
         if (isNaN(va)) return 1;
         if (isNaN(vb)) return -1;
         if (va === vb) return 0;
         if (va > vb) return -1;
         return 1;
      });
      rdiv.appendChild(document.createTextNode('A:'));
      var tbldiv = document.createElement('div');
      var tbl = document.createElement('table');
      tbl.innerHTML = '<thead><th>code</th><th>result</th></thead><tbody></tbody>';
      appendLongResult(tbl.children[1], result, 0, 50);
      tbldiv.appendChild(tbl);
      rdiv.appendChild(tbldiv);
   } else {
      rdiv.appendChild(document.createTextNode('A: (Empty)'));
   }
   div.appendChild(tdiv);
   div.appendChild(rdiv);
}

function onWsMessage(evt) {
   try {
      var json = JSON.parse(evt.data);
      if (json && json.json && json.json.result) {
         if (json.json.type === 'calc') {
            buildCalcResult(ui.label.result, env.query, json.json.result);
         } else if (json.json.type === 'filter') {
            buildFilterResult(ui.label.result, env.query, json.json.result);
         } else {
            ui.label.result.innerHTML = '(Empty)';
         }
      } else if (json.auth) {
         sendJson(evt.target, {
            id: '---',
            cmd: '/stock',
            query: env.query
         });
      } else if (json.done) {
         ui.btn.run.classList.remove('disabled');
      }
   } catch (err) {}
}
function onWsOpen(evt) {
   sendJson(evt.target, {
      cmd: 'auth',
      user: env.user.user,
      uuid: env.user.uuid
   });
}
function onWsClose(evt) {
   evt.target.removeEventListener('message', onWsMessage);
   evt.target.removeEventListener('open', onWsOpen);
   evt.target.removeEventListener('close', onWsClose);
   env.ws = null;
   env.query = null;
}

function connect(query) {
   ui.label.result.innerHTML = 'Running ... ';
   env.query = query;
   ui.label.result.appendChild(document.createTextNode(query));
   var protocol = location.href.startsWith('https://') ? 'wss://' : 'ws://';
   var url = protocol + location.host + '/job';
   if (env.ws) {
      sendJson(env.ws, {
         id: '---',
         cmd: '/stock',
         query: query
      });
   } else {
      env.ws = new WebSocket(url);
      env.ws.addEventListener('message', onWsMessage);
      env.ws.addEventListener('open', onWsOpen);
      env.ws.addEventListener('close', onWsClose);
   }
}

on(ui.btn.run, 'click', function () {
   if (!ui.txt.cmd.value) return;
   ui.btn.run.classList.add('disabled');
   connect(ui.txt.cmd.value);
});

function before() {}
function init() {}

login_and_start('/m/login.html#/m/family/stock/', env, before, init);

})();
