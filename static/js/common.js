'use strict';

window.zlabenv = {
   hostname: window.location.hostname
};

function dom(selector) {
   return document.querySelector(selector);
}

function on(elem, name, fn) {
   return elem.addEventListener(name, fn);
}

function ajax(options, done_fn, fail_fn) {
   var xhr = new XMLHttpRequest(), payload = null;
   xhr.open(options.method || 'POST', options.url + (options.data ? uriencode(options.data) : ''), true);
   xhr.addEventListener('readystatechange', function (evt) {
      if (evt.target.readyState === 4 /*XMLHttpRequest.DONE*/) {
         if (~~(evt.target.status / 100) === 2) {
            done_fn && done_fn(evt.target.response);
         } else {
            fail_fn && fail_fn(evt.target.status);
         }
      }
   });
   if (options.json) {
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      payload = JSON.stringify(options.json);
   }
   xhr.send(payload);
}

function html(url, done_fn, fail_fn) {
   var xhr = new XMLHttpRequest();
   xhr.open('GET', url, true);
   xhr.addEventListener('readystatechange', function (evt) {
      if (evt.target.readyState === 4 /*XMLHttpRequest.DONE*/) {
         if (~~(evt.target.status / 100) === 2) {
            done_fn && done_fn(evt.target.response || '<!-- empty -->');
         } else {
            fail_fn && fail_fn(evt.target.status);
         }
      }
   });
   xhr.send(null);
}

function download_uri(uri, name) {
   var link = document.createElement("a");
   link.download = name;
   link.href = uri;
   document.body.appendChild(link);
   link.click();
   document.body.removeChild(link);
}

function download_uri_with_fetch(uri, name) {
   window.fetch(uri).then(function (res) {
      res.blob().then(function (blob) {
         var url = window.URL.createObjectURL(blob);
         download_uri(url, name);
         window.URL.revokeObjectURL(url);
      });
   });
}

function copy_text(text) {
   var textArea = document.createElement('textarea');
   textArea.style.position = 'fixed';
   textArea.style.top = '0px';
   textArea.style.left = '0px';
   textArea.value = text;
   document.body.appendChild(textArea);
   textArea.focus();
   textArea.select();
   try { document.execCommand('copy'); } catch (err) {}
   document.body.removeChild(textArea);
}

function get_cookie() {
   var items = document.cookie;
   var r = {};
   if (!items) return r;
   items.split(';').forEach(function (one) {
      var p = one.indexOf('=');
      if (p < 0) r[one.trim()] = null;
      else r[one.substring(0, p).trim()] = one.substring(p + 1).trim();
   });
   return r;
}

function set_cookie(key, value) {
   document.cookie = key + '=' + escape(value) + ';path=/;domain=' + window.zlabenv.hostname;
}

function erase_cookie(key) {
   document.cookie = key + '=0;expires=Thu, 01 Jan 1970 00:00:01 GMT';
}

function reload_on_hashchange() {
   window.addEventListener('hashchange', function () {
      window.location.reload(true);
   });
}

function encode_url_for_login(path) {
   var r = '/login.html#' + path + ':';
   if (window.location.hash) {
      r += window.location.hash.substring(1);
   }
   if (window.location.search) {
      r += window.location.search;
   }
   return r;
}

function remove_elem(elem) {
   elem.parentNode.removeChild(elem);
}

function dispose_component(component) {
   var elem = component.dom;
   remove_elem(elem);
   component.dom = null;
   component.ui = null;
}

function update_uuid(jsonData) {
   var obj = jsonData?JSON.parse(jsonData):{};
   if (obj.sessionId) set_cookie('zlab_uuid', obj.sessionId);
}

function isMobileBrowser() {
   var userAgent = (navigator.userAgent || navigator.vendor || window.opera || '').toLowerCase();
   if (/android|iphone|ipod|kindle/.test(userAgent)) return true;
   return false;
}

function login_and_start(redirect_url, env, before_init, init_app) {
   if (!redirect_url) redirect_url = 'login.html';
   before_init && before_init();
   var cookie = get_cookie();
   env = env || {};
   env.user = {
      user: cookie.zlab_user || '',
      uuid: cookie.zlab_uuid || ''
   };
   if (!env.user.user || !env.user.uuid) {
      window.location = redirect_url;
      return;
   }
   ajax({
      url: '/auth/echotest',
      json: {
         user: env.user.user,
         uuid: env.user.uuid
      }
   }, function (data) {
      update_uuid(data);
      init_app && init_app();
   }, function () {
      window.location = redirect_url;
   });
}

