(function () {

var env = {};
var ui = {
   panel: {
      item_add: dom('#pnl-add-item')
   },
   label: {
      date: dom('#lbl-date'),
      self_empty: dom('#lbl-self-empty'),
      shared_empty: dom('#lbl-shared-empty'),
      self_summary: dom('#lbl-self-summary'),
      shared_summary: dom('#lbl-shared-summary'),
      total_summary: dom('#lbl-total-summary')
   },
   list: {
      self_expense: dom('#lst-expense'),
      shared_expense: dom('#lst-shared-expense')
   },
   txt: {
      item_cost: dom('#txt-cost'),
      item_desc: dom('#txt-desc'),
      share_to: dom('#txt-share-to')
   },
   btn: {
      prev_month: dom('#btn-prev-m'),
      next_month: dom('#btn-next-m'),
      select_month: dom('#btn-select-m'),
      expand_add_panel: dom('#btn-expand-add'),
      item_add: dom('#btn-add'),
      item_cancel: dom('#btn-cancel'),
      settings_apply: dom('#btn-settings-apply')
   }
};

on(ui.btn.prev_month, 'click', function () {
   var year = env.cursorYear;
   var month = env.cursorMonth - 1;
   if (month === 0) {
      month = 12;
      year --;
      if (year < 1900) return;
   }
   env.cursorYear = year;
   env.cursorMonth = month;
   loadData(year, month);
});
on(ui.btn.next_month, 'click', function () {
   var year = env.cursorYear;
   var month = env.cursorMonth + 1;
   if (month > 12) {
      month = 1;
      year ++;
      if (year > 9999) return;
   }
   env.cursorYear = year;
   env.cursorMonth = month;
   loadData(year, month);
});
on(ui.btn.expand_add_panel, 'click', function () {
   ui.panel.item_add.style.display = 'block';
   ui.btn.expand_add_panel.parentNode.style.display = 'none';
});
on(ui.btn.item_cancel, 'click', function () {
   ui.panel.item_add.style.display = 'none';
   ui.btn.expand_add_panel.parentNode.style.display = 'block';
});
on(ui.list.self_expense, 'click', function (evt) {
   if (evt.target.classList.contains('item-btn-delete')) {
      var elem = evt.target.parentNode.parentNode;
      var indexS = elem.getAttribute('data-i');
      if (!indexS) return;
      var index = parseInt(indexS);
      var one = env.self.items.splice(index, 1)[0];
      if (!one) return;
      uploadItems(function () {
         renderList(ui.list.self_expense, env.self, false, true);
         updateSummary();
         if (!env.self.items.length) {
            ui.label.self_empty.style.display = 'block';
            ui.list.self_expense.style.display = 'none';
         }
      }, function () {
         env.self.items.push(one);
      });
   } else if (evt.target.classList.contains('item-btn-check')) {
      var elem = evt.target.parentNode.parentNode;
      var elem = evt.target.parentNode.parentNode;
      var indexS = elem.getAttribute('data-i');
      if (!indexS) return;
      var index = parseInt(indexS);
      var one = env.self.items[index];
      if (!one) return;
      one.p = !one.p;
      uploadItems(function () {
         evt.target.className = (
            'item-btn-check item-btn ' +
            (one.p?'item-green':'item-gray-1')
         );
         evt.target.innerHTML = one.p?'uncheck':'check';
         evt.target.parentNode.parentNode.className = (
            'item ' + (one.p?'item-gray-1':'item-green')
         );
         updateSummary();
      }, function () {
         one.p = !one.p;
      });
   }
});
on(ui.btn.item_add, 'click', function () {
   if (!ui.txt.item_cost.value) return ui.txt.item_cost.focus();
   env.self.items = env.self.items || [];
   env.self.items.push({
      d: ui.txt.item_desc.value,
      c: parseFloat(ui.txt.item_cost.value),
      p: false
   });
   uploadItems(function () {
      ui.btn.expand_add_panel.parentNode.style.display = 'block';
      ui.panel.item_add.style.display = 'none';

      ui.label.self_empty.style.display = 'none';
      ui.list.self_expense.style.display = 'block';

      ui.txt.item_cost.value = '';
      ui.txt.item_desc.value = '';

      ui.list.self_expense.appendChild(buildItem(
         env.self.items[env.self.items.length-1], { i: env.self.items.length-1 }, true
      ));
      updateSummary();
   }, function () {
      env.self.items.pop();
   });
});
on(ui.btn.settings_apply, 'click', function () {
   if (ui.txt.share_to.value.length > 100) return;
   show_loading();
   ajax({
      method: 'POST',
      url: '/api/app/family/expense/config',
      json: {
         user: env.user.user,
         uuid: env.user.uuid,
         shareTo: ui.txt.share_to.value
      }
   }, function (data) {
      detect_uuid_change(data);
      hide_loading();
   }, function (err) {
      alert('error:' + err);
      hide_loading();
   });
});

function uploadItems(doneFn, failFn) {
   show_loading();
   ajax({
      method: 'POST',
      url: '/api/app/family/expense/put',
      json: {
         user: env.user.user,
         uuid: env.user.uuid,
         year: env.cursorYear,
         month: env.cursorMonth,
         items: env.self.items || []
      }
   }, function () {
      doneFn && doneFn();
      hide_loading();
   }, function (err) {
      failFn && failFn();
      console.error(err);
      alert('error: ' + err);
      hide_loading();
   });
}

function buildItem(item, attrs, editable, user) {
   var div = document.createElement('div');
   attrs && Object.keys(attrs).forEach(function (key) {
      var val = attrs[key];
      if (val === undefined || val === null) return;
      div.setAttribute('data-' + key, attrs[key]);
   });
   div.className = item.p?'item item-gray-1':'item item-green';

   var basic = document.createElement('div');
   if (editable) {
      var btn = document.createElement('button');
      btn.appendChild(document.createTextNode('Delete'));
      btn.className = 'item-btn-delete item-btn item-red';
      basic.appendChild(btn);
      basic.innerHTML += ' ';
   }
   if (user) {
      basic.appendChild(document.createTextNode(user + ' -- '));
   }
   basic.appendChild(document.createTextNode('( ' + item.c + ' )'));
   if (editable) {
      var name = item.p?'uncheck':'check';
      var btn = document.createElement('button');
      btn.appendChild(document.createTextNode(name));
      btn.className = 'item-btn-check item-btn ' + (item.p?'item-green':'item-gray-2');
      basic.innerHTML += ' ';
      basic.appendChild(btn);
   }

   var desc = document.createElement('div');
   desc.appendChild(document.createTextNode(item.d || '(no description)'));

   div.appendChild(basic);
   div.appendChild(desc);
   return div;
}

function renderList(container, obj, append, editable) {
   if (!append) empty_elem(container);
   var items = obj.items;
   for (var i = 0, n = items.length; i < n; i++) {
      container.appendChild(buildItem(
         items[i], { i: i, u: obj.user }, editable, obj.user
      ));
   }
}

function updateSummary() {
   var s1 = { unchecked: 0, total: 0 };
   var s2 = { unchecked: 0, total: 0 };
   var st = { unchecked: 0, total: 0 };
   (env.self.items || []).forEach(function (item) {
      if (!item) return;
      if (!item.p) s1.unchecked += item.c;
      s1.total += item.c;
   });
   env.shared.forEach(function (block) {
      (block.items || []).forEach(function (item) {
         if (!item) return;
         if (!item.p) s2.unchecked += item.c;
         s2.total += item.c;
      });
   });
   st.unchecked = s1.unchecked + s2.unchecked;
   st.total = s1.total + s2.total;

   ui.label.self_summary.innerHTML = (
      'Self: ' + formatNumber(s1.total) +
      (s1.unchecked?(' (' + formatNumber(s1.unchecked) + ')'):'')
   );
   ui.label.shared_summary.innerHTML = (
      'Shared: ' + formatNumber(s2.total) +
      (s2.unchecked?(' (' + formatNumber(s2.unchecked) + ')'):'')
   );
   ui.label.total_summary.innerHTML = (
      'Total: ' + formatNumber(st.total) +
      (st.unchecked?(' (' + formatNumber(st.unchecked) + ')'):'')
   );
}

function formatNumber(num) {
   num = Math.round(num * 100) / 100;
   var str = '' + num;
   var i = str.indexOf('.');
   if (i < 0) return str + '.00';
   if (str.length - i === 2) return str + '0';
   return str;
}

function loadData(year, month) {
   ui.label.date.innerHTML = year + ' - ' + month;
   show_loading();
   ajax({
      url: '/api/app/family/expense/get',
      json: {
         user: env.user.user,
         uuid: env.user.uuid,
         year: year,
         month: month
      }
   }, function (data) {
      detect_uuid_change(data);
      var obj = JSON.parse(data);
      if (obj.config.shareTo) ui.txt.share_to.value = obj.config.shareTo.join(',');
      env.self = { items: obj.items };
      env.shared = Object.keys(obj.shared).map(function (user) {
         return { user: user, items: obj.shared[user] };
      });
      var count, i, n, items;
      count = env.self.items.length;
      summary = { checked: 0, total: 0 };
      renderList(ui.list.self_expense, env.self, false, true);
      ui.label.self_empty.style.display = 'none';
      ui.list.self_expense.style.display = 'block';
      if (!count) {
         ui.label.self_empty.style.display = 'block';
         ui.list.self_expense.style.display = 'none';
      }

      count = 0;
      empty_elem(ui.list.shared_expense);
      for (i = 0, n = env.shared.length; i < n; i++) {
         items = env.shared[i].items;
         if (!items || !items.length) continue;
         count += items.length;
         renderList(ui.list.shared_expense, env.shared[i], true, false);
      }
      ui.label.shared_empty.style.display = 'none';
      ui.list.shared_expense.style.display = 'block';
      if (!count) {
         ui.label.shared_empty.style.display = 'block';
         ui.list.shared_expense.style.display = 'none';
      }

      updateSummary();
      hide_loading();
   }, function (err) {
      alert(err);
   });
}

function before() {}
function init() {
   var D = new Date();
   env.cursorYear = D.getFullYear();
   env.cursorMonth = D.getMonth() + 1;
   loadData(env.cursorYear, env.cursorMonth);
}

login_and_start('/m/login.html#/m/family/expense/', env, before, init);

})();
