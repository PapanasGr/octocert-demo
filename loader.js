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
    var seed = function () {
      var S = IDX.seed; if (!S) return Promise.resolve();
      var done = null; try { done = localStorage.getItem('octo_seed'); } catch (e) {}
      if (done === S.v) return Promise.resolve();
      var w = document.getElementById('octo-wait'); if (w) w.textContent = 'Πρώτη φόρτωση: μεταφορά Εκπαιδευτικού υλικού και Forum…';
      var opn = function (name, stores) { return new Promise(function (res, rej) { var r = indexedDB.open(name, 1); r.onupgradeneeded = function () { stores.forEach(function (n) { if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n); }); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); };
      var get = function (D, st, k) { return new Promise(function (res) { var q = D.transaction(st, 'readonly').objectStore(st).get(k); q.onsuccess = function () { res(q.result); }; q.onerror = function () { res(null); }; }); };
      var put = function (D, st, k, v) { return new Promise(function (res, rej) { var t = D.transaction(st, 'readwrite'); t.objectStore(st).put(v, k); t.oncomplete = function () { res(); }; t.onerror = function () { rej(t.error); }; }); };
      var byId = function (a, b) { var m = {}, out = []; (a || []).concat(b || []).forEach(function (x) { var k = x && (x.id || x.k || JSON.stringify(x)); if (!m[k]) { m[k] = 1; out.push(x); } }); return out; };
      return getBin(S.m).then(function (ab) { var M = JSON.parse(txt(ab));
        var eduP = opn('octo_edu', ['meta', 'files']).then(function (D) { return get(D, 'meta', 'db').then(function (cur) {
          cur = cur && typeof cur === 'object' ? cur : { items: {}, cats: [], secs: {} };
          var sd = M.edu || {}, db = { items: Object.assign({}, sd.items || {}, cur.items || {}), cats: byId(sd.cats, cur.cats), secs: Object.assign({}, sd.secs || {}, cur.secs || {}) };
          Object.keys(cur).forEach(function (k) { if (!(k in db)) db[k] = cur[k]; }); Object.keys(sd).forEach(function (k) { if (!(k in db)) db[k] = sd[k]; });
          var fk = Object.keys(M.ef || {});
          return fk.reduce(function (p, k) { return p.then(function () { return get(D, 'files', k).then(function (ex) { if (ex) return; return getBin(M.ef[k][0]).then(function (b) { return put(D, 'files', k, new Blob([b], { type: M.ef[k][1] })); }); }); }); }, Promise.resolve())
            .then(function () { return put(D, 'meta', 'db', db); })
            .then(function () { var o = {}; Object.keys(db.items).forEach(function (k) { var it = db.items[k]; if (it) o[k] = [it.at || 0, it.by || '']; }); try { localStorage.setItem('octo_edu_idx', JSON.stringify(o)); } catch (e) {} });
        }); });
        var forumP = opn('octo_forum', ['ph']).then(function (D) {
          var fk = Object.keys(M.fp || {});
          return fk.reduce(function (p, k) { return p.then(function () { return get(D, 'ph', k).then(function (ex) { if (ex) return; return getBin(M.fp[k][0]).then(function (b) { return put(D, 'ph', k, new Blob([b], { type: M.fp[k][1] })); }); }); }); }, Promise.resolve());
        }).then(function () { var g = {}; try { g = JSON.parse(localStorage.getItem('octo_registry') || '{}') || {}; } catch (e) {} g.forum = g.forum || {}; g.forum.t = Object.assign({}, M.forum || {}, g.forum.t || {}); localStorage.setItem('octo_registry', JSON.stringify(g)); try { if (window.top.__octoRegistry) window.top.__octoRegistry = g; } catch (e) {} });
        return Promise.all([eduP, forumP]).then(function () { try { localStorage.setItem('octo_seed', S.v); } catch (e) {} });
      }).catch(function (e) { console.error('seed', e); });
    };
    return seed().then(function () { return getBin(IDX.boards[BOARD]); }).then(function (bb) {
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
