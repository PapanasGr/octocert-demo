(function () {
  var EV = { onclick: 'click', onchange: 'change', oninput: 'input', onkeydown: 'keydown', onkeyup: 'keyup', onkeypress: 'keypress', onblur: 'focusout', onfocus: 'focusin', onmousedown: 'mousedown', onmouseup: 'mouseup', onmouseenter: 'mouseenter', onmouseleave: 'mouseleave', onmouseover: 'mouseover', onmouseout: 'mouseout', onsubmit: 'submit', ondragover: 'dragover', ondrop: 'drop', ondragstart: 'dragstart', onscroll: 'scroll', onwheel: 'wheel', onpaste: 'paste', ondblclick: 'dblclick', oncontextmenu: 'contextmenu', ondragleave: 'dragleave', ondragend: 'dragend', ondragenter: 'dragenter', onpointerdown: 'pointerdown', onpointerup: 'pointerup', onpointermove: 'pointermove', ontouchstart: 'touchstart', ontouchend: 'touchend' };
  var NOBUBBLE = { mouseenter: 1, mouseleave: 1, scroll: 1 };
  window.DCLogic = function () { this.state = {}; this.props = {}; };
  window.DCLogic.prototype.setState = function (o, cb) { var s = typeof o === 'function' ? o(this.state) : o; this.state = Object.assign({}, this.state, s); var me = this; if (!me.__q) { me.__q = 1; setTimeout(function () { me.__q = 0; me.__render(); if (cb) try { cb(); } catch (e) {} }, 0); } else if (cb) setTimeout(cb, 0); };
  window.DCLogic.prototype.forceUpdate = function () { this.setState({}); };
  var get = function (ctx, p) { return p.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, ctx); };
  var esc = function (x) { return String(x).replace(/&(?!\w+;|#\d+;)/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); };
  window.__mount = function (C, st) {
    var c = new C(); c.state = Object.assign({}, c.state || {}, st || {});
    var tplHtml = window.__TPL;
    var root = document.getElementById('root');
    var FNS = [], bound = {};
    var dispatch = function (type) { return function (e) {
      var el = e.target;
      if (NOBUBBLE[type]) { if (el && el.getAttribute) run(el, type, e); return; }
      while (el && el !== root.parentNode) { if (el.getAttribute) run(el, type, e); if (e.__stop) break; el = el.parentNode; }
    }; };
    var run = function (el, type, e) { var h = el.getAttribute('data-h'); if (!h) return; h.split(' ').forEach(function (p) { var q = p.split(':'); if (q[0] === type) { var f = FNS[+q[1]]; if (f) { var stop = e.stopPropagation; e.stopPropagation = function () { e.__stop = true; stop.call(e); }; f.call(c, e); } } }); };
    var bind = function (type) { if (bound[type]) return; bound[type] = 1; root.addEventListener(type, dispatch(type), !!NOBUBBLE[type] || type === 'focusin' || type === 'focusout'); };
    c.__render = function () {
      var vals; try { vals = c.renderVals(); } catch (e) { console.error('renderVals', e); throw e; }
      var fns = [];
      var sub = function (s, ctx) {
        // gather handlers per element: replace each on*="{{fn}}" with a marker, then merge markers into data-h
        return s.replace(/(\son[A-Za-z]+)="\{\{\s*([\w.$]+)\s*\}\}"/g, function (m, a, p) { var f = get(ctx, p); if (typeof f !== 'function') return ''; var nm = a.trim().toLowerCase(); fns.push(f); return ' data-hx="' + nm + ':' + (fns.length - 1) + '"'; })
          .replace(/\{\{\s*([\w.$]+)\s*\}\}/g, function (_, p) { var x = get(ctx, p); if (typeof x === 'function' || x == null) return ''; if (typeof x === 'object') return ''; return esc(x); })
          .replace(/\{\{\s*(true|false|\d+)\s*\}\}/g, '$1')
          .replace(/ (disabled|checked|aria-pressed|aria-expanded|aria-selected|readonly|hidden|selected|open|multiple|required)="(false|)"/g, ' ');
      };
      var findClose = function (s, tag, from) { var d = 1, re = new RegExp('<' + tag + '\\b|</' + tag + '>', 'g'), m; re.lastIndex = from; while ((m = re.exec(s))) { if (m[0][1] === '/') { d--; if (!d) return [m.index, m.index + m[0].length]; } else d++; } throw 'unclosed ' + tag; };
      var render = function (s, ctx) {
        var out = '', i = 0, re = /<sc-(if|for)\b([^>]*)>/g, m;
        while ((m = re.exec(s))) {
          out += sub(s.slice(i, m.index), ctx);
          var tag = 'sc-' + m[1], cc = findClose(s, tag, re.lastIndex), inner = s.slice(re.lastIndex, cc[0]);
          if (m[1] === 'if') { var p = (m[2].match(/value="\{\{\s*([\w.$!]+)\s*\}\}"/) || [])[1]; var neg = p && p[0] === '!'; if (neg) p = p.slice(1); var v = p ? !!get(ctx, p) : false; if (neg ? !v : v) out += render(inner, ctx); }
          else { var p2 = (m[2].match(/list="\{\{\s*([\w.$]+)\s*\}\}"/) || [])[1], as = (m[2].match(/as="(\w+)"/) || [])[1]; (get(ctx, p2) || []).forEach(function (it) { var o = Object.create(ctx); o[as] = it; out += render(inner, o); }); }
          i = cc[1]; re.lastIndex = cc[1];
        }
        return out + sub(s.slice(i), ctx);
      };
      var html = render(tplHtml, vals);
      // merge multiple data-hx attributes on the same tag into one data-h
      html = html.replace(/<([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g, function (t, tg, attrs) { if (attrs.indexOf('data-hx="') < 0) return t; var hs = []; attrs = attrs.replace(/\sdata-hx="([^"]*)"/g, function (_, v) { var q = v.split(':'), ev = EV[q[0]] || q[0].slice(2); hs.push([q[0], ev, q[1]]); return ''; });
        var parts = hs.map(function (h) { return h[1] + ':' + h[2]; });
        return '<' + tg + attrs + ' data-h="' + parts.join(' ') + '" data-hon="' + hs.map(function (h) { return h[0]; }).join(' ') + '">'; });
      FNS = fns;
      var tmp = document.createElement('div'); tmp.id = 'root'; tmp.innerHTML = html;
      // text inputs: onchange fires on every keystroke (React semantics)
      tmp.querySelectorAll('[data-h]').forEach(function (el) { if (/^(INPUT|TEXTAREA)$/.test(el.tagName) && !/checkbox|radio|file|date|range|color/.test(el.getAttribute('type') || '')) el.setAttribute('data-h', el.getAttribute('data-h').replace(/(^| )change:/g, '$1input:')); el.getAttribute('data-h').split(' ').forEach(function (p) { bind(p.split(':')[0]); }); });
      if (!root.__mounted) { root.innerHTML = tmp.innerHTML; root.__mounted = 1; }
      else window.morphdom(root, tmp, { onBeforeElUpdated: function (from, to) {
        if (from === document.activeElement && (from.tagName === 'INPUT' || from.tagName === 'TEXTAREA') && !/checkbox|radio/.test(from.type || '')) { var v = to.getAttribute('value'); if (from.tagName === 'TEXTAREA' && v === null) v = to.textContent; if (v !== null && v !== from.value) { var s0 = from.selectionStart, e0 = from.selectionEnd; from.value = v; try { from.setSelectionRange(Math.min(s0, v.length), Math.min(e0, v.length)); } catch (x) {} } [].slice.call(to.attributes).forEach(function (a) { if (a.name !== 'value' && from.getAttribute(a.name) !== a.value) from.setAttribute(a.name, a.value); }); [].slice.call(from.attributes).forEach(function (a) { if (a.name !== 'value' && !to.hasAttribute(a.name)) from.removeAttribute(a.name); }); return false; }
        return true; }, onBeforeNodeDiscarded: function (n) { return !(n.classList && (n.classList.contains('oc-navbtn'))); } });
      root.querySelectorAll('select[value]').forEach(function (s) { var v = s.getAttribute('value'); if (s.value !== v) s.value = v; });
      root.querySelectorAll('textarea[value]').forEach(function (s) { if (s !== document.activeElement) s.value = s.getAttribute('value'); });
      root.querySelectorAll('input[type=checkbox],input[type=radio]').forEach(function (s) { s.checked = s.hasAttribute('checked'); });
      root.querySelectorAll('input[value]').forEach(function (s) { if (s !== document.activeElement && s.type !== 'checkbox' && s.type !== 'radio' && s.type !== 'file' && s.value !== s.getAttribute('value')) s.value = s.getAttribute('value'); });
      if (window.__afterRender) try { window.__afterRender(); } catch (e) {}
    };
    window.__c = c;
    c.__render();
    if (c.componentDidMount) try { c.componentDidMount(); } catch (e) { console.error('mount', e); }
  };
})();
