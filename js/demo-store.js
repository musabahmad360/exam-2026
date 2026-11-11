/* ডেমো মোড: সার্ভার ছাড়াই এই ব্রাউজারে সব ডেটা রাখে (শুধু দেখার/পরীক্ষার জন্য) */
var DemoStore = (function () {
  var KEY = 'asm_exam_demo_v1';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  var db = load();
  function save() { localStorage.setItem(KEY, JSON.stringify(db)); }

  function sha256(ascii) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    var bytes = unescape(encodeURIComponent(ascii)), words = [], i, j, result = '';
    var H = [], K = [], isComposite = {};
    for (var c = 2, n = 0; n < 64; c++) {
      if (!isComposite[c]) {
        for (i = 0; i < 313; i += c) isComposite[i] = c;
        if (n < 8) H[n] = (Math.pow(c, .5) * 4294967296) | 0;
        K[n++] = (Math.pow(c, 1 / 3) * 4294967296) | 0;
      }
    }
    bytes += '\x80';
    while (bytes.length % 64 - 56) bytes += '\x00';
    for (i = 0; i < bytes.length; i++) words[i >> 2] |= bytes.charCodeAt(i) << ((3 - i) % 4) * 8;
    var bitLen = (unescape(encodeURIComponent(ascii)).length) * 8;
    words[words.length] = (bitLen / 4294967296) | 0;
    words[words.length] = bitLen;
    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16), oldH = H.slice(0);
      H = H.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2], a = H[0], e = H[4];
        var t1 = H[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & H[5]) ^ ((~e) & H[6])) + K[i] +
          (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        var t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & H[1]) ^ (a & H[2]) ^ (H[1] & H[2]));
        H = [(t1 + t2) | 0].concat(H);
        H[4] = (H[4] + t1) | 0;
      }
      for (i = 0; i < 8; i++) H[i] = (H[i] + oldH[i]) | 0;
    }
    for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) { var b = (H[i] >> (j * 8)) & 255; result += ((b < 16) ? 0 : '') + b.toString(16); }
    return result;
  }

  return {
    read: function (t) { return (db[t] || []).map(function (r) { return Object.assign({}, r); }); },
    write: function (t, rows) { db[t] = rows.map(function (r) { var o = {}; TABLES[t].forEach(function (c) { o[c] = r[c] === undefined || r[c] === null ? '' : r[c]; }); return o; }); save(); },
    append: function (t, row) { (db[t] = db[t] || []).push(row); if (t === 'Logs' && db[t].length > 1000) db[t] = db[t].slice(-1000); save(); },
    cacheGet: function (k) { var c = (db._cache || {})[k]; return c && c.exp > Date.now() ? c.v : null; },
    cachePut: function (k, v, sec) { (db._cache = db._cache || {})[k] = { v: v, exp: Date.now() + sec * 1000 }; save(); },
    cacheRemove: function (k) { if (db._cache) { delete db._cache[k]; save(); } },
    hash: sha256,
    uuid: function () { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'x' + Math.random().toString(36).slice(2) + Date.now().toString(36); },
    lock: function (fn) { return fn(); },
    reset: function () { localStorage.removeItem(KEY); db = {}; }
  };
})();
