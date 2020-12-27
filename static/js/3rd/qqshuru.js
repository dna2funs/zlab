// copy from:
// https://www.shejiwo.net/tutorials/850.html

// modified:
// - add mobile touch support
// - remove 0,0 delta

QQShuru = {};
QQShuru.Util = {};
QQShuru.Util.Browser = {};
QQShuru.Util.Browser.isIE = (navigator.appName == "Microsoft Internet Explorer");

QQShuru.Util.Ajax = {};
QQShuru.Util.Ajax.get = function(a, c) {
    var b = document.createElement("script");
    b.setAttribute("charset", "utf-8");
    b.id = Math.random();
    document.getElementsByTagName("head")[0].appendChild(b);
    b.src = a + "&c=" + c;
    if (QQShuru.Util.Browser.isIE) {
        b.onreadystatechange = function() {
            if (b.readyState == "loaded") {
                document.getElementsByTagName("head")[0].removeChild(b);
            }
        }
    } else {
        b.onload = function() {
            document.getElementsByTagName("head")[0].removeChild(b);
        }
    }
};
QQShuru.Util.Event = {};
QQShuru.Util.Event.addEvent = function() {
    if (QQShuru.Util.Browser.isIE) {
        return function(b, c, a) {
            b.attachEvent("on" + c, a);
        }
    } else {
        return function(b, c, a, d) {
            b.addEventListener(c, a, d || false);
        }
    }
} ();
QQShuru.Util.Event.remEvent = function() {
    if (QQShuru.Util.Browser.isIE) {
        return function(b, c, a) {
            b.detachEvent("on" + c, a);
        }
    } else {
        return function(b, c, a, d) {
            b.removeEventListener(c, a, d || false);
        }
    }
} ();
QQShuru.Util.Event.getPoint = function(a) {
    if (QQShuru.Util.Browser.isIE) {
        return [a.x, a.y];
    } else if (a.layerX !== undefined) {
        return [a.layerX, a.layerY];
    } else {
       return null;
    }
};

// { canvasId, lineColor, lineWidth, backBtnId, clearBtnId, callback }
// id = selector, e.g. #canvas
QQShuru.HWPanel = function(obj) {
    var o = QQShuru.Util.Browser.isIE;
    var m = QQShuru.Util.Event.addEvent;
    var j = QQShuru.Util.Event.remEvent;
    var B = QQShuru.Util.Event.getPoint;
    var h = document;
    var H = document.body;
    var z = document.documentElement;
    var f = [];
    var K = [];
    var O = [];

    var i = document.querySelector(obj.canvasId);
    var v = o ? 1 : 0;
    var a = 2;
    var N = i.clientWidth;
    var R = i.clientHeight;
    var c = obj.lineColor||"#606060";
    var y = obj.lineWidth||10;
    var t = "round";
    var J = !!i.getContext;
    var cP = function clearCanvas() {
        Q.fillStyle = '#eee';
        Q.fillRect(0, 0, N, R);
        Q.lineCap = '';
        Q.lineJoin = '';
        Q.lineWidth = 2;
        Q.strokeStyle = '#ccc';
        Q.beginPath();
        Q.moveTo(0, R/2);
        Q.lineTo(N, R/2);
        Q.stroke();
        Q.beginPath();
        Q.moveTo(N/2, 0);
        Q.lineTo(N/2, R);
        Q.stroke();

        Q.lineCap = t;
        Q.lineJoin = t;
        Q.lineWidth = y;
        Q.strokeStyle = c;
    };
    if (J) {
        var Q = i.getContext("2d");
        cP();
    }
    var L = false;
    var P = false;
    var u = 0;
    var T = [];
    var r = 0;
    var e = [],
        d = [],
        I = [];
    var D = [],
        C = [];
    pointsDeltaXY = [];
    var k = [0, 0];
    var l = function evtMouseDown (W) {
        if (v !== W.button) {
            return;
        }
        var Y = B(W);
        if (!Y) {
            return;
        }
        L = true;
        r = 0;
        e = [];
        d = [];
        I = [];
        D = [];
        C = [];
        pointsDeltaXY = [];
        e[r] = Y[0];
        d[r] = Y[1];
        I[r * 2] = Y[0];
        I[r * 2 + 1] = Y[1];
        D[r] = Y[0];
        C[r] = Y[1];
        pointsDeltaXY[r * 2] = Y[0];
        pointsDeltaXY[r * 2 + 1] = Y[1];
        if (J) {
            Q.beginPath();
            Q.moveTo(Y[0], Y[1]);
        }
        k[0] = Y[0];
        k[1] = Y[1];
        r++;
        if (o) {
            m(i, "losecapture", n);
            i.setCapture();
        } else {
            m(window, "blur", n);
        }
    };
    var A = function evtMouseMove (W) {
        if (!L) {
            return;
        }
        var Y = B(W);
        if (!Y) {
            return;
        }
        e[r] = Y[0];
        d[r] = Y[1];
        I[r * 2] = Y[0];
        I[r * 2 + 1] = Y[1];
        D[r] = Y[0] - k[0];
        C[r] = Y[1] - k[1];
        if (D[r] === 0 && C[r] === 0) return;
        pointsDeltaXY[r * 2] = D[r];
        pointsDeltaXY[r * 2 + 1] = C[r];
        if (J) {
            Q.lineTo(Y[0], Y[1]);
            Q.stroke();
        } else {
            var X = T[u].e.path;
            X.value = X.value.replace(" e", "," + Y[0] + "," + Y[1] + " e");
        }
        k[0] = Y[0];
        k[1] = Y[1];
        r++;
    };
    var n = function evtMouseUp (W) {
        if (!L) {
            return;
        }
        L = false;
        if (1 === r) {
            if (!J) {
                T[u].e.style.visibility = "hidden";
            }
            return;
        }
        if (J) {
            Q.closePath();
            var Z = i.cloneNode(false);
            Z.style.display = "none";
            Z.getContext("2d").drawImage(i, 0, 0);
            T[u] = {
                e: Z
            };
            Z = null;
        }
        var aa = T[u];
        aa.count = r;
        aa.x = e.slice(0);
        aa.y = d.slice(0);
        aa.xy = I.slice(0);
        aa.deltaX = D.slice(0);
        aa.deltaY = C.slice(0);
        aa.deltaXY = pointsDeltaXY.slice(0);
        u++;
        var X = [];
        for (var Y = 0; Y < r; Y++) {
            X[Y] = "[" + e[Y] + ", " + d[Y] + "]";
        }
        if (o) {
            j(i, "losecapture", n);
            i.releaseCapture();
        } else {
            j(window, "blur", n)
        }
        if (1 === u) {
            i.className = "writting";
        }
        s(u);
    };
    var V = function resetCallBack(W) {
        if (0 === u) {
            return;
        }
        var ab = "";
        if (J) {
            Q.clearRect(0, 0, N, R);
            cP();
        }
        for (var Z = 0; Z < u; Z++) {
            T[Z].parentNode && T[Z].parentNode.removeChild(T[Z]);
            // T[Z].e.style.visibility = "hidden";
        }
        while(T.length) T.pop();
        u = 0;
        i.className = "";
    };
    var g = function undoCallBack(W) {
        if (0 === u) {
            return;
        }
        if (1 === u) {
            V();
            return;
        }
        u--;
        if (J) {
            Q.clearRect(0, 0, N, R);
            cP();
            Q.drawImage(T[u - 1].e, 0, 0);
        }
        T[u].e.style.visibility = "hidden";
        s(u);
    };
    var p = function(W, ab) {
        var aa = ab || W.length;
        var Z = "";
        var ad = "";
        for (var X = 0; X < aa; ++X) {
            var ac = W[X];
            ad = X ? ",eb,": "";
            var Y = ad + ac.deltaXY.join(",");
            Z += Y;
        }
        return Z;
    };
    QQShuru.HWPanel.ajax_callback = obj.callback || (function () {});
    var s = function(Y) {
        var Z = p(T, Y);
        var ab = "QQShuru.HWPanel.ajax_callback";
        var W = "http://handwriting.shuru.qq.com/cloud/cgi-bin/cloud_hw_pub.wsgi";
        var aa = "track_str=" + Z + "&cmd=0";
        var X = W + "?" + aa;
        QQShuru.Util.Ajax.get(X, ab);
    };
    m(i, "mousedown", l);
    m(i, "mousemove", A);
    m(i, "mouseup", n);
    m(i, "dblclick", V);
    m(i, "touchstart", function (evt) {
       var T = evt.touches && evt.touches[0];
       if (!T) return;
       //console.log(T);
       l({ button: o?1:0, layerX: ~~T.pageX, layerY: ~~(T.pageY - oT) });
    });
    var oT = i.offsetTop;
    m(i, "touchmove", function (evt) {
       var T = evt.touches && evt.touches[0];
       if (!T) return;
       //console.log(T);
       A({ button: o?1:0, layerX: ~~T.pageX, layerY: ~~(T.pageY - oT) });
    });
    m(i, "touchend", function (evt) {
       n();
    });
    m(i, "contextmenu",
        function(W) {
            o ? (W.returnValue = false) : W.preventDefault()
        });
    m(h, "mouseup", n);
    if(obj.backBtnId){
        m(document.querySelector(obj.backBtnId), "click", g);
    }
    if(obj.clearBtnId){
        m(document.querySelector(obj.clearBtnId), "click", V);
    }
};
