(function () {
  var CFG = {"salt": "710b7c74bec0f9277191278ef31bc476", "iter": 210000}, BOARD = document.currentScript.getAttribute('data-board');
  var raw = null; try { raw = sessionStorage.getItem('octo_k') || localStorage.getItem('octo_k'); } catch (e) {}
  if (!raw) { location.replace('index.html?next=' + encodeURIComponent(BOARD)); return; }
  var b64d = function (s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  var keyP = crypto.subtle.importKey('raw', b64d(raw), 'AES-GCM', false, ['decrypt']);
  var getBin = function (name) { return fetch('e/' + name, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('missing ' + name); return r.arrayBuffer(); }).then(function (buf) { return keyP.then(function (k) { var u = new Uint8Array(buf); return crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, k, u.slice(12)); }); }); };
  var txt = function (ab) { return new TextDecoder('utf-8').decode(ab); };
  var fail = function (e) { console.error(e); try { sessionStorage.removeItem('octo_k'); localStorage.removeItem('octo_k'); } catch (x) {} location.replace('index.html?next=' + encodeURIComponent(BOARD) + '&err=1'); };
  getBin('idx').then(function (ab) {
    var IDX = JSON.parse(txt(ab));
    var cache = {};
    var of = window.fetch.bind(window);
    window.fetch = function (u, o) { var s = typeof u === 'string' ? u : (u && u.url) || ''; var m = s.match(/\/_blob\/([0-9a-f]{32})/); if (m && IDX.data[m[1]]) { if (!cache[m[1]]) cache[m[1]] = getBin(IDX.data[m[1]]).then(txt); return cache[m[1]].then(function (t) { return new Response(t, { status: 200, headers: { 'Content-Type': 'text/plain' } }); }); } return of(u, o); };
    return getBin(IDX.boards[BOARD]).then(function (bb) {
      var B = JSON.parse(txt(bb)), ids = Object.keys(B.imgs || {});
      return Promise.all(ids.map(function (id) { return getBin(B.imgs[id][0]).then(function (ab) { return [id, URL.createObjectURL(new Blob([ab], { type: B.imgs[id][1] }))]; }); })).then(function (pairs) {
        var rep = function (s) { pairs.forEach(function (p) { s = s.split('/_blob/' + p[0]).join(p[1]); }); return s; };
        document.head.insertAdjacentHTML('beforeend', rep(B.helmet || ''));
        document.getElementById('root').innerHTML = '';
        window.__TPL = rep(B.tpl);
        var sc = document.createElement('script'); sc.textContent = rep(B.script) + '\n;window.__mount(Component, {});'; document.body.appendChild(sc);
      });
    });
  }).catch(fail);
})();
