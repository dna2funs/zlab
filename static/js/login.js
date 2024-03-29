(function () {

var ui = {
   txt: {
      username: dom('#txt-username'),
      password: dom('#txt-password')
   },
   btn: {
      login: dom('#btn-login')
   }
};

on(ui.btn.login, 'click', function () {
   var username = ui.txt.username.value
   var password = ui.txt.password.value;
   if (!username|| !password) return;
   ajax({
      method: 'POST',
      url: '/auth/login',
      json: {
         username: username,
         password: password
      }
   }, function (data) {
      var obj = JSON.parse(data);
      set_cookie('zlab_user', username);
      set_cookie('zlab_uuid', obj.sessionId);
      var redirectTo = location.hash;
      if (!redirectTo) redirectTo = '#/';
      if (redirectTo.indexOf('#/') !== 0) redirectTo = '#/';
      redirectTo = unescape(redirectTo.substring(1));
      window.location = redirectTo;
   }, function (err) {
      if (err) {
         alert(err);
      } else {
         alert('401 not authenitcated');
      }
   });
});
on(ui.txt.username, 'keypress', function (evt) {
   switch (evt.code) {
   case 'Enter':
      if (!ui.txt.password.value) return ui.txt.password.focus();
      ui.btn.login.click();
      break;
   }
});
on(ui.txt.password, 'keypress', function (evt) {
   switch (evt.code) {
   case 'Enter':
      if (!ui.txt.username.value) return ui.txt.username.focus();
      ui.btn.login.click();
      break;
   }
});

// initialize
var cookie = get_cookie();
if (cookie.zlab_user) {
   ui.txt.username.value = cookie.zlab_user;
}

(function () {
   var hash = window.location.hash;
   if (!hash) return;
   if (hash.indexOf('#/') === 0) return;
   var param = {};
   hash.substring(1).split('&').forEach(function (part) {
      var parts = part.split('=');
      var key = decodeURIComponent(parts[0] || '');
      var val = decodeURIComponent(parts[1] || '');
      param[key] = val;
   });
   ui.txt.username.value = param.u;
   ui.txt.password.value = param.p;
   if (param.u && param.p) ui.btn.login.click();
})();


})();
