/* আফটার স্কুল মাকতাব — পরীক্ষার নম্বর ব্যবস্থাপনা (ইন্টারফেস) */
(function () {
  'use strict';

  var DEMO = !CONFIG.API_URL;
  var core = null;
  if (DEMO) {
    core = createCore(DemoStore);
    core.setup(SEED_STUDENTS, { extraUsers: [{ username: 'ustad', name: 'ডেমো উস্তাদ', password: '1234',
      groups: [core.gidOf('সাধারণ শাখা', 'আল কুরআন হিফজ'), core.gidOf('সাধারণ শাখা', 'কায়দা নিউ'), core.gidOf('ফরজে আইন শাখা', 'আল কুরআন মুতাকাদ্দিম')] }] });
  }

  var S = { token: localStorage.getItem('asm_token') || '', user: null, settings: null, groups: [], shell: false };
  var root = document.getElementById('root');

  // ============ utilities ============
  function $(sel, el) { return (el || document).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function bn(n) { return String(n === null || n === undefined ? '' : n).replace(/[0-9]/g, function (d) { return '০১২৩৪৫৬৭৮৯'[d]; }); }
  function en(s) { return String(s || '').replace(/[০-৯]/g, function (d) { return '০১২৩৪৫৬৭৮৯'.indexOf(d); }); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function fmtTime(iso) {
    if (!iso) return '';
    var d = new Date(iso); if (isNaN(d)) return iso;
    return bn(d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
  }
  function showMark(v) { return v === 'A' ? 'অ' : bn(v); }
  function initials(n) { return (String(n || '?').trim().split(/\s+/).pop() || '?').charAt(0); }
  function enc(g) { return encodeURIComponent(g); }

  var ICONS = {
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-6 6.5-6s5.9 2.4 6.5 6"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.2c2.6.2 4.4 2.3 5 5.3"/>',
    student: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c2 2 10 2 12 0v-5"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3.1 14H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    log: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    print: '<path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2"/><rect x="6" y="14" width="12" height="7"/>',
    save: '<path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v6h8M7 21v-7h10v7"/>',
    send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    unlock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.8-1.2"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    upload: '<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    next: '<path d="M9 18l6-6-6-6"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>',
    card: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    wa: '<path d="M3 21l1.6-4.8A8.5 8.5 0 1 1 8 19.6z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.4-2-1-1 .9c-1-.4-1.8-1.2-2.2-2.2l.9-1-1-2z"/>',
    check: '<path d="M4 12l5 5L20 6"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>'
  };
  function ic(n, cls) { return '<svg class="icon ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[n] || '') + '</svg>'; }
  var EMBLEM_SVG = '<svg class="emblem" viewBox="0 0 64 64"><rect x="2" y="2" width="60" height="60" rx="14" fill="#14532d"/><g fill="none" stroke="#d9b968" stroke-width="2"><path d="M32 7l7.5 17.5L57 32l-17.5 7.5L32 57l-7.5-17.5L7 32l17.5-7.5z"/><rect x="17" y="17" width="30" height="30" transform="rotate(45 32 32)"/><rect x="17" y="17" width="30" height="30"/></g><circle cx="32" cy="32" r="5" fill="#d9b968"/></svg>';
  window.__ASM_EMBLEM = EMBLEM_SVG;
  var LOGO_URL = new URL('logo.svg', location.href).href;
  var EMBLEM = '<span class="logo-wrap"><img class="emblem" src="' + LOGO_URL + '" alt="লোগো" onerror="this.parentNode.classList.add(\'nologo\');this.outerHTML=window.__ASM_EMBLEM"></span>';

  // ============ toast / modal / loader ============
  function toast(msg, type) {
    var t = document.createElement('div');
    t.className = 'toast ' + (type || '');
    t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 3200);
    setTimeout(function () { t.remove(); }, 3600);
  }
  var loaderEl = null;
  function loading(on) {
    if (on && !loaderEl) { loaderEl = document.createElement('div'); loaderEl.className = 'loader'; loaderEl.innerHTML = '<div class="spin"></div>'; document.body.appendChild(loaderEl); }
    if (!on && loaderEl) { loaderEl.remove(); loaderEl = null; }
  }
  function modal(o) {
    var bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = '<div class="modal ' + (o.wide ? 'wide' : '') + '"><div class="modal-h"><h3>' + o.title + '</h3><button class="x" data-x>&times;</button></div><div class="modal-b">' + o.body + '</div>' + (o.foot ? '<div class="modal-f">' + o.foot + '</div>' : '') + '</div>';
    document.body.appendChild(bg);
    function close() { bg.remove(); document.removeEventListener('keydown', onKey); if (o.onClose) o.onClose(); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    bg.addEventListener('mousedown', function (e) { if (e.target === bg) close(); });
    $$('[data-x]', bg).forEach(function (b) { b.onclick = close; });
    var first = $('input,select,textarea', bg); if (first) setTimeout(function () { first.focus(); }, 50);
    return { el: bg, close: close };
  }
  function confirmBox(title, msg, okText, danger) {
    return new Promise(function (res) {
      var m = modal({ title: title, body: '<div style="font-size:16px">' + msg + '</div>',
        foot: '<button class="btn btn-ghost" data-x>বাতিল</button><button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" data-ok>' + (okText || 'হ্যাঁ') + '</button>',
        onClose: function () { res(false); } });
      $('[data-ok]', m.el).onclick = function () { m.el.remove(); res(true); };
    });
  }

  // ============ API ============
  var MUTATING = { saveUser: 1, deleteUser: 1, saveStudent: 1, deleteStudent: 1, saveSettings: 1, savePhones: 1, restore: 1, logMessage: 1, sendSms: 1 };
  function api(action, payload) {
    var req = Object.assign({ action: action, token: S.token }, payload || {});
    var p;
    if (DEMO) {
      p = sleep(90).then(function () { return core.handle(JSON.parse(JSON.stringify(req))); });
    } else {
      p = fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(req), redirect: 'follow' })
        .then(function (r) { return r.json(); })
        .catch(function () { throw new Error('সার্ভারের সাথে যোগাযোগ হচ্ছে না। ইন্টারনেট সংযোগ দেখুন।'); });
    }
    return p.then(function (res) {
      if (res.ok && MUTATING[action]) setTimeout(function () { RT.push({ kind: 'change', action: action }); }, 0);
      if (!res.ok) {
        if (res.auth && action !== 'login') { logoutLocal(); toast(res.error, 'err'); }
        throw new Error(res.error);
      }
      return res.data;
    });
  }
  function logoutLocal() {
    try { RT.stop(); } catch (e) { }
    S.token = ''; S.user = null; S.shell = false;
    localStorage.removeItem('asm_token');
    location.hash = '#/login';
    route();
  }

  // ============ login ============
  function renderLogin() {
    S.shell = false;
    root.innerHTML =
      '<div class="login-wrap pattern-bg"><div>' +
      '<div class="login-card"><div class="login-head">' + EMBLEM +
      '<h1>আফটার স্কুল মাকতাব</h1><p>বার্ষিক পরীক্ষা — নম্বর প্রদান প্যানেল</p></div>' +
      '<form class="login-body" id="loginForm">' +
      (DEMO ? '<div class="demo-note"><b>ডেমো মোড চলছে।</b> এডমিন: <b>admin</b> / <b>admin123</b> · পরীক্ষক: <b>ustad</b> / <b>1234</b></div>' : '') +
      '<div class="field"><label>ইউজারনেম</label><input class="input" name="username" autocomplete="username" autocapitalize="none" required></div>' +
      '<div class="field"><label>পাসওয়ার্ড</label><div class="pw-wrap"><input class="input" type="password" name="password" autocomplete="current-password" required><button type="button" class="eye" data-eye>' + ic('eye') + '</button></div></div>' +
      '<button class="btn btn-primary btn-block" type="submit">প্রবেশ করুন</button>' +
      '</form></div><div class="login-foot">ঝিলটুলী, ফরিদপুর</div></div></div>';
    $('[data-eye]').onclick = function () { var i = $('input[name=password]'); i.type = i.type === 'password' ? 'text' : 'password'; };
    $('#loginForm').onsubmit = function (e) {
      e.preventDefault();
      var f = e.target, btn = $('button[type=submit]', f);
      btn.disabled = true; btn.textContent = 'যাচাই হচ্ছে…';
      api('login', { username: f.username.value, password: f.password.value }).then(function (d) {
        S.token = d.token; localStorage.setItem('asm_token', d.token);
        location.hash = '#/';
        boot();
      }).catch(function (err) {
        toast(err.message, 'err'); btn.disabled = false; btn.textContent = 'প্রবেশ করুন';
      });
    };
  }

  // ============ shell ============
  function isAdmin() { return S.user && S.user.role === 'admin'; }
  function navItems() {
    if (isAdmin()) return [
      ['#/', 'home', 'ড্যাশবোর্ড'], ['#/live', 'eye', 'লাইভ পরীক্ষা'], ['#/groups', 'grid', 'নম্বর প্রদান'], ['sep', '', 'ফলাফল'],
      ['#/results', 'chart', 'গ্রুপভিত্তিক ফলাফল'], ['#/merit', 'star', 'মেধাতালিকা'], ['#/messages', 'send', 'অভিভাবককে পাঠান'], ['sep', '', 'ব্যবস্থাপনা'],
      ['#/users', 'users', 'পরীক্ষকবৃন্দ'], ['#/students', 'student', 'শিক্ষার্থী'], ['#/settings', 'gear', 'সেটিংস'], ['#/logs', 'log', 'কার্যক্রম']
    ];
    return [['#/', 'grid', 'আমার গ্রুপ'], ['#/results', 'chart', 'ফলাফল']];
  }
  function buildShell() {
    var nav = navItems().map(function (n) {
      if (n[0] === 'sep') return '<div class="sep">' + n[2] + '</div>';
      return '<a href="' + n[0] + '" data-nav="' + n[0] + '">' + ic(n[1]) + '<span>' + n[2] + '</span></a>';
    }).join('');
    root.innerHTML =
      '<div class="app"><aside class="sidebar pattern-bg" id="sidebar">' +
      '<div class="brand">' + EMBLEM + '<div><b>' + esc(S.settings.institution) + '</b><small>' + esc(S.settings.examTitle) + '</small></div></div>' +
      '<nav class="nav">' + nav + '</nav>' +
      '<div class="side-user"><div class="avatar">' + esc(initials(S.user.name)) + '</div><div class="who"><b>' + esc(S.user.name) + '</b><small>' + (isAdmin() ? 'এডমিন' : 'পরীক্ষক') + '</small></div>' +
      '<button title="পাসওয়ার্ড পরিবর্তন" data-pw>' + ic('key') + '</button><button title="লগআউট" data-logout>' + ic('logout') + '</button></div></aside>' +
      '<div class="main">' +
      (DEMO ? '<div class="demo-bar">' + ic('eye') + ' ডেমো মোড — ডেটা শুধু এই ব্রাউজারে থাকছে। আসল ব্যবহারের জন্য config.js-এ সার্ভারের লিংক বসান।</div>' : '') +
      (S.user.defaultPassword ? '<div class="warn-bar">নিরাপত্তার জন্য এডমিনের ডিফল্ট পাসওয়ার্ড (admin123) এখনই পরিবর্তন করুন — নিচে বাম পাশে চাবি আইকনে চাপুন।</div>' : '') +
      '<header class="topbar"><button class="menu-btn" data-menu>' + ic('menu') + '</button><h2 id="pageTitle"></h2><span class="live" id="liveChip" title="অন্যদের পরিবর্তন নিজে নিজে দেখাবে"><i></i>লাইভ</span><span class="exam-chip">' + esc(S.settings.examTitle) + '</span></header>' +
      '<section class="content" id="content"></section></div></div>';
    $('[data-logout]').onclick = function () {
      if (Entry.dirtyCount()) { if (!window.confirm('কিছু নম্বর এখনো সংরক্ষণ হয়নি। তবুও বের হবেন?')) return; }
      api('logout').catch(function () { }); logoutLocal();
    };
    $('[data-pw]').onclick = changePasswordModal;
    $('[data-menu]').onclick = function () { toggleMenu(true); };
    $$('.nav a').forEach(function (a) { a.addEventListener('click', function () { toggleMenu(false); }); });
    S.shell = true;
  }
  function toggleMenu(open) {
    var sb = $('#sidebar'); if (!sb) return;
    sb.classList.toggle('open', open);
    var sc = $('.scrim');
    if (open && !sc) { sc = document.createElement('div'); sc.className = 'scrim'; sc.onclick = function () { toggleMenu(false); }; document.body.appendChild(sc); }
    if (!open && sc) sc.remove();
  }
  function setPage(title, html, navKey) {
    var y = window.scrollY;
    $('#pageTitle').textContent = title;
    document.title = title + ' — ' + S.settings.institution;
    $('#content').innerHTML = html;
    $$('.nav a').forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-nav') === navKey); });
    window.scrollTo(0, S.silent ? y : 0);
  }
  function pageLoading(title, navKey) {
    if (S.silent) return; setPage(title, '<div class="grid stats"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div><div class="skeleton" style="height:260px"></div>', navKey); }

  function changePasswordModal() {
    var m = modal({ title: 'পাসওয়ার্ড পরিবর্তন',
      body: '<div class="field"><label>বর্তমান পাসওয়ার্ড</label><input class="input" type="password" id="pw0"></div>' +
        '<div class="field"><label>নতুন পাসওয়ার্ড</label><input class="input" type="password" id="pw1"></div>' +
        '<div class="field"><label>আবার নতুন পাসওয়ার্ড</label><input class="input" type="password" id="pw2"></div>',
      foot: '<button class="btn btn-ghost" data-x>বাতিল</button><button class="btn btn-primary" data-ok>পরিবর্তন করুন</button>' });
    $('[data-ok]', m.el).onclick = function () {
      var a = $('#pw1').value;
      if (a !== $('#pw2').value) return toast('নতুন পাসওয়ার্ড দুইবার একই হয়নি', 'err');
      api('changePassword', { oldPassword: $('#pw0').value, newPassword: a }).then(function () {
        m.close(); toast('পাসওয়ার্ড পরিবর্তন হয়েছে', 'ok');
        if (S.user.defaultPassword) { S.user.defaultPassword = false; var w = $('.warn-bar'); if (w) w.remove(); }
      }).catch(function (e) { toast(e.message, 'err'); });
    };
  }

  // ============ boot / router ============
  function boot() {
    if (location.hash.indexOf('#/m/') === 0) { route(); return; }
    if (!S.token) { renderLogin(); return; }
    if (!S.shell) root.innerHTML = '<div class="login-wrap pattern-bg"><div class="spin" style="border-color:rgba(255,255,255,.2);border-top-color:#d9b968"></div></div>';
    return api('bootstrap').then(function (d) {
      S.user = d.user; S.settings = d.settings; S.groups = d.groups;
      if (!S.shell) buildShell();
      RT.start();
      route();
    }).catch(function (e) { if (!S.token) return; toast(e.message, 'err'); renderLogin(); });
  }
  function refreshGroups() { return api('bootstrap').then(function (d) { S.groups = d.groups; S.settings = d.settings; }); }

  function route() {
    var h = location.hash.replace(/^#/, '') || '/';
    if (h.indexOf('/m/') === 0) { S.shell = false; return PublicSheet.open(h.split('/')[2], h.split('/')[3]); }
    if (!S.token) { renderLogin(); return; }
    if (!S.shell) { boot(); return; }
    if (Entry.active && !h.startsWith('/g/')) Entry.leave();
    var parts = h.split('/').filter(Boolean);
    var p0 = parts[0] || '';
    var arg = parts.slice(1).join('/');
    try { arg = decodeURIComponent(arg); } catch (e) { }
    if (p0 === 'g') return Entry.open(arg);
    if (p0 === 'r') return Results.open(arg);
    if (p0 === 'results') return Results.index();
    if (p0 === 'merit' && isAdmin()) return Merit.open();
    if (p0 === 'messages' && isAdmin()) return Messages.open();
    if (p0 === 'live' && isAdmin()) return LivePage.open();
    if (p0 === 'groups' && isAdmin()) return Groups.open('#/groups');
    if (p0 === 'users' && isAdmin()) return Users.open();
    if (p0 === 'students' && isAdmin()) return Students.open();
    if (p0 === 'settings' && isAdmin()) return Settings.open();
    if (p0 === 'logs' && isAdmin()) return Logs.open();
    if (isAdmin()) return Dashboard.open();
    return Groups.open('#/');
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('beforeunload', function (e) { if (Entry.dirtyCount()) { e.preventDefault(); e.returnValue = ''; } });

  // ============ common pieces ============
  function stateChip(st) { return st === 'submitted' ? '<span class="chip submitted">' + ic('lock') + ' জমা হয়েছে</span>' : '<span class="chip open">চলমান</span>'; }
  function progressBar(p, done) { return '<div style="display:flex;align-items:center;gap:8px"><div class="bar ' + (done ? 'done' : '') + '" style="flex:1"><i style="width:' + p.pct + '%"></i></div><span class="pct">' + bn(p.pct) + '%</span></div>'; }
  function groupCard(g, href) {
    return '<a class="card gcard ' + (g.state === 'submitted' ? 'submitted' : '') + '" href="' + href + '" style="text-decoration:none;color:inherit">' +
      '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><div class="t">' + esc(g.group) + '</div><div class="b">' + esc(g.branch) + '</div></div>' + stateChip(g.state) + '</div>' +
      progressBar(g.progress, g.state === 'submitted') +
      '<div class="meta"><span>' + ic('student') + ' ' + bn(g.count) + ' জন · ' + bn(g.subjects.length) + ' বিষয়</span><span>' + bn(g.progress.filled) + '/' + bn(g.progress.total) + '</span></div>' +
      (isAdmin() ? '<div class="b">' + (g.examiners.length ? 'পরীক্ষক: ' + esc(g.examiners.join(', ')) : '<span style="color:var(--red)">পরীক্ষক নির্ধারিত হয়নি</span>') + '</div>' : '') +
      '</a>';
  }
  function byBranch(groups, fn) {
    var out = '', last = null;
    groups.forEach(function (g) {
      if (g.branch !== last) { if (last !== null) out += '</div>'; out += '<div class="branch-title">' + esc(g.branch) + '</div><div class="grid group-cards">'; last = g.branch; }
      out += fn(g);
    });
    if (last !== null) out += '</div>';
    return out;
  }

  // ============ Groups (examiner home / admin entry list) ============
  var Groups = {
    open: function (navKey) {
      pageLoading(isAdmin() ? 'নম্বর প্রদান' : 'আমার গ্রুপ', navKey);
      refreshGroups().then(function () {
        var gs = S.groups;
        var done = gs.filter(function (g) { return g.state === 'submitted'; }).length;
        var filled = 0, total = 0; gs.forEach(function (g) { filled += g.progress.filled; total += g.progress.total; });
        var head = '<div class="grid stats">' +
          stat('আমার গ্রুপ', bn(gs.length), 'grid') +
          stat('শিক্ষার্থী', bn(gs.reduce(function (a, g) { return a + g.count; }, 0)), 'student', 'gold') +
          stat('নম্বর দেওয়া হয়েছে', bn(total ? Math.round(filled * 100 / total) : 0) + '%', 'chart', '', bn(filled) + ' / ' + bn(total) + ' ঘর') +
          stat('জমা সম্পন্ন', bn(done) + '/' + bn(gs.length), 'lock', 'gold') + '</div>';
        if (isAdmin()) head = '';
        var notice = !S.settings.entryOpen && !isAdmin() ? '<div class="card card-pad" style="border-left:4px solid var(--red);margin-bottom:14px">নম্বর দেওয়ার সময় এখন বন্ধ। প্রয়োজনে এডমিনের সাথে যোগাযোগ করুন।</div>' : '';
        var body = gs.length ? byBranch(gs, function (g) { return groupCard(g, '#/g/' + enc(g.gid)); })
          : '<div class="card empty">আপনাকে এখনো কোনো গ্রুপ দেওয়া হয়নি। এডমিনের সাথে যোগাযোগ করুন।</div>';
        setPage(isAdmin() ? 'নম্বর প্রদান' : 'আমার গ্রুপ', head + notice + body, navKey);
      }).catch(function (e) { toast(e.message, 'err'); });
    }
  };
  function stat(k, v, icon, cls, sub) { return '<div class="card stat ' + (cls || '') + '"><span class="ic">' + ic(icon) + '</span><div class="k">' + k + '</div><div class="v">' + v + '</div>' + (sub ? '<div class="s">' + sub + '</div>' : '') + '</div>'; }

  // ============ Dashboard ============
  var Dashboard = {
    liveNow: function () {
      var el = $('#liveNow'); if (!el) return;
      if (!RT.B) { el.innerHTML = '<b style="color:var(--green)">লাইভ পরীক্ষা</b> <span class="pct">— রিয়েল-টাইম সংযোগ চালু করলে এখানে দেখাবে কোন পরীক্ষকের কাছে কে পরীক্ষা দিচ্ছে।</span>'; return; }
      var users = {}, claims = [];
      Object.keys(RT.presence).forEach(function (k) { var p = RT.presence[k]; if (p.role !== 'admin') users[p.user] = p.name; });
      Object.keys(RT.claims).forEach(function (reg) { var c = RT.claimOf(reg); if (c) claims.push(c); });
      el.innerHTML = '<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><b style="color:var(--green);font-size:17px">' + ic('eye') + ' এখন চলছে</b>' +
        '<span class="chip open">' + bn(Object.keys(users).length) + ' জন পরীক্ষক অনলাইনে</span><span class="chip submitted">' + bn(claims.length) + ' জনের পরীক্ষা চলছে</span>' +
        '<span class="pct" style="flex:1">' + claims.slice(0, 4).map(function (c) { return esc(c.name) + ' → ' + esc(c.rname || ''); }).join(' · ') + (claims.length > 4 ? ' …' : '') + '</span><span class="pct">বিস্তারিত ' + ic('next') + '</span></div>';
    },
    open: function () {
      pageLoading('ড্যাশবোর্ড', '#/');
      api('dashboard').then(function (d) {
        var t = d.totals;
        var html = '<div class="grid stats">' +
          stat('মোট শিক্ষার্থী', bn(t.students), 'student') +
          stat('গ্রুপ', bn(t.groups), 'grid', 'gold') +
          stat('পরীক্ষক', bn(t.examiners), 'users') +
          stat('নম্বর প্রদান সম্পন্ন', bn(t.pct) + '%', 'chart', 'gold', bn(t.filled) + ' / ' + bn(t.cells) + ' ঘর') +
          stat('জমা হওয়া গ্রুপ', bn(t.submitted) + '/' + bn(t.groups), 'lock') + '</div>';
        html += '<a href="#/live" class="card card-pad live-banner" id="liveNow" style="display:block;text-decoration:none;color:inherit;margin-bottom:18px"></a>';
        html += '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-bottom:18px">' + d.branches.map(function (b) {
          var p = { pct: b.total ? Math.round(b.filled * 100 / b.total) : 0 };
          return '<div class="card card-pad"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><b style="color:var(--green)">' + esc(b.branch) + '</b><span class="pct">' + bn(b.students) + ' জন · ' + bn(b.groups) + ' গ্রুপ</span></div>' + progressBar(p, p.pct === 100) + '<div class="pct" style="margin-top:6px">জমা: ' + bn(b.submitted) + '/' + bn(b.groups) + ' গ্রুপ</div></div>';
        }).join('') + '</div>';
        html += '<div class="grid" style="grid-template-columns:minmax(0,2fr) minmax(280px,1fr);align-items:start" id="dashGrid">' +
          '<div class="card"><div class="card-head"><h3>গ্রুপভিত্তিক অগ্রগতি</h3><a class="btn btn-ghost btn-sm" href="#/merit">' + ic('star') + ' মেধাতালিকা</a></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>গ্রুপ</th><th>পরীক্ষক</th><th style="min-width:150px">অগ্রগতি</th><th>অবস্থা</th><th></th></tr></thead><tbody>' +
          d.groups.map(function (g) {
            return '<tr><td><b>' + esc(g.group) + '</b><small>' + esc(g.branch) + ' · ' + bn(g.count) + ' জন</small></td>' +
              '<td>' + (g.examiners.length ? esc(g.examiners.join(', ')) : '<span style="color:var(--red);font-size:14px">নির্ধারিত হয়নি</span>') + '</td>' +
              '<td>' + progressBar(g.progress, g.state === 'submitted') + '</td><td>' + stateChip(g.state) + '</td>' +
              '<td style="white-space:nowrap"><a class="btn btn-ghost btn-sm" href="#/g/' + enc(g.gid) + '">' + ic('edit') + '</a> <a class="btn btn-ghost btn-sm" href="#/r/' + enc(g.gid) + '">' + ic('chart') + '</a></td></tr>';
          }).join('') + '</tbody></table></div></div>' +
          '<div class="card"><div class="card-head"><h3>সাম্প্রতিক কার্যক্রম</h3><a class="btn btn-ghost btn-sm" href="#/logs">সব</a></div><ul class="log-list">' +
          (d.logs.length ? d.logs.map(logItem).join('') : '<li class="empty">এখনো কিছু নেই</li>') + '</ul></div></div>';
        setPage('ড্যাশবোর্ড', html, '#/');
        Dashboard.liveNow();
        if (window.innerWidth < 1000) $('#dashGrid').style.gridTemplateColumns = '1fr';
      }).catch(function (e) { toast(e.message, 'err'); });
    }
  };
  function logItem(l) { return '<li><span class="t">' + fmtTime(l.at) + '</span><span><b>' + esc(l.user) + '</b> — ' + esc(l.action) + (l.detail ? ' <span style="color:var(--muted)">' + esc(l.detail) + '</span>' : '') + '</span></li>'; }

  // ============ Mark entry ============
  var Entry = {
    active: false, gid: '', sum: null, students: [], server: {}, local: {}, dirty: {}, bad: {}, view: 'table', idx: 0, timer: null, saving: false, filter: '',
    dirtyCount: function () { return Entry.active ? Object.keys(Entry.dirty).length : 0; },
    leave: function () {
      if (Entry.dirtyCount()) Entry.save(true);
      Entry.active = false; clearTimeout(Entry.timer);
      RT.releaseMine(); RT.setPresence({ gid: null, gname: null });
    },
    canEdit: function () { return isAdmin() || (Entry.sum.state !== 'submitted' && S.settings.entryOpen); },
    key: function (reg, sub) { return reg + '\u0001' + sub; },
    draftKey: function () { return 'asm_draft_' + (S.user ? S.user.username : '') + '_' + Entry.gid; },

    open: function (gid) {
      if (Entry.active && Entry.gid !== gid && Entry.dirtyCount()) Entry.save(true);
      pageLoading('নম্বর প্রদান', isAdmin() ? '#/groups' : '#/');
      api('getGroup', { gid: gid }).then(function (d) {
        if (Entry.gid !== gid) RT.releaseMine();
        Entry.active = true; Entry.gid = gid; Entry.sum = d.summary; Entry.students = d.students; Entry.owners = d.owners || {}; Entry.me = d.me;
        RT.setPresence({ gid: gid, gname: d.summary.group + (d.summary.branch !== 'সাধারণ শাখা' ? ' (' + d.summary.branch + ')' : '') });
        Entry.server = d.marks; Entry.local = JSON.parse(JSON.stringify(d.marks)); Entry.dirty = {}; Entry.bad = {}; Entry.filter = '';
        Entry.view = localStorage.getItem('asm_view') || (window.innerWidth < 700 ? 'card' : 'table');
        Entry.idx = 0;
        // restore unsaved draft
        try {
          var dr = JSON.parse(localStorage.getItem(Entry.draftKey()) || 'null');
          if (dr && Entry.canEdit()) {
            var n = 0;
            Object.keys(dr).forEach(function (k) {
              var p = k.split('\u0001');
              if (Entry.local[p[0]] && p[1] in Entry.local[p[0]] && Entry.local[p[0]][p[1]] !== dr[k]) { Entry.local[p[0]][p[1]] = dr[k]; Entry.dirty[k] = 1; n++; }
            });
            if (n) setTimeout(function () { toast('আগের অসংরক্ষিত ' + bn(n) + 'টি নম্বর ফিরিয়ে আনা হয়েছে', 'ok'); Entry.schedule(); }, 300);
            else localStorage.removeItem(Entry.draftKey());
          }
        } catch (e) { }
        Entry.render();
      }).catch(function (e) { toast(e.message, 'err'); location.hash = '#/'; });
    },

    render: function () {
      var s = Entry.sum, edit = Entry.canEdit();
      var html = '<div class="entry-head"><div class="info"><a href="' + (isAdmin() ? '#/groups' : '#/') + '" class="btn btn-ghost btn-sm" style="margin-bottom:6px">' + ic('back') + ' সব গ্রুপ</a>' +
        '<h3>' + esc(s.group) + '</h3><div class="sub"><span>' + esc(s.branch) + '</span><span>·</span><span>' + bn(s.count) + ' জন শিক্ষার্থী</span><span>·</span><span>পূর্ণমান প্রতি বিষয়ে ' + bn(S.settings.fullMark) + '</span>' + stateChip(s.state) + '</div>' +
        '<div style="max-width:360px;margin-top:8px" id="progWrap">' + progressBar(s.progress, s.state === 'submitted') + '</div></div>' +
        '<div class="toolbar">' +
        '<span class="save-state ok" id="saveState"><span class="dot"></span><span>সব সংরক্ষিত</span></span>' +
        (edit ? '<button class="btn btn-primary" data-save>' + ic('save') + ' সংরক্ষণ</button>' : '') +
        (edit && s.state !== 'submitted' ? '<button class="btn btn-gold" data-submit>' + ic('send') + ' চূড়ান্ত জমা</button>' : '') +
        (isAdmin() ? (s.state === 'submitted' ? '<button class="btn btn-ghost" data-unlock>' + ic('unlock') + ' আনলক</button>' : '<button class="btn btn-ghost" data-lock>' + ic('lock') + ' লক</button>') : '') +
        '<button class="btn btn-ghost" data-print>' + ic('print') + ' প্রিন্ট</button>' +
        '<a class="btn btn-ghost" href="#/r/' + enc(Entry.gid) + '">' + ic('chart') + ' ফলাফল</a>' +
        '</div></div>';
      if (!edit) html += '<div class="card card-pad" style="border-left:4px solid var(--gold);margin-bottom:12px">' + (s.state === 'submitted' ? 'এই গ্রুপের নম্বর চূড়ান্ত জমা হয়েছে। পরিবর্তন লাগলে এডমিনকে আনলক করতে বলুন।' : 'নম্বর দেওয়ার সময় বন্ধ আছে।') + '</div>';
      html += '<div class="toolbar-line"><div class="search grow">' + ic('search') + '<input class="input" id="stuSearch" placeholder="নাম বা রেজি নম্বর দিয়ে খুঁজুন…"></div>' +
        '<div class="view-toggle"><button data-view="table" class="' + (Entry.view === 'table' ? 'on' : '') + '">' + ic('table') + ' টেবিল</button><button data-view="card" class="' + (Entry.view === 'card' ? 'on' : '') + '">' + ic('card') + ' একজন করে</button></div></div>';
      html += '<div id="entryBody"></div>';
      html += '<div class="tips">টিপস: <span class="kbd">Enter</span> চাপলে পরের ঘরে যাবে, <span class="kbd">↑</span><span class="kbd">↓</span> দিয়ে উপর-নিচে। অনুপস্থিত হলে <b>অ</b> লিখুন। বাংলা বা ইংরেজি দুই সংখ্যাই চলবে। নম্বর নিজে নিজে সংরক্ষণ হয়।</div>';
      setPage(s.group + ' — নম্বর প্রদান', html, isAdmin() ? '#/groups' : '#/');
      Entry.renderBody();
      var c = $('#content');
      var sv = $('[data-save]', c); if (sv) sv.onclick = function () { Entry.save(); };
      var sb = $('[data-submit]', c); if (sb) sb.onclick = Entry.submit;
      var ul = $('[data-unlock]', c); if (ul) ul.onclick = function () { Entry.setState('open'); };
      var lk = $('[data-lock]', c); if (lk) lk.onclick = function () { Entry.setState('submitted'); };
      $('[data-print]', c).onclick = function () {
        printMarkSheet(Entry.sum, Entry.students, Entry.local, true);
      };
      $$('[data-view]', c).forEach(function (b) { b.onclick = function () { Entry.view = b.getAttribute('data-view'); localStorage.setItem('asm_view', Entry.view); $$('[data-view]', c).forEach(function (x) { x.classList.toggle('on', x === b); }); Entry.renderBody(); }; });
      $('#stuSearch').oninput = function (e) { Entry.filter = e.target.value.trim().toLowerCase(); Entry.applyFilter(); };
      Entry.updateState();
    },

    visibleIdx: function () {
      var f = Entry.filter;
      return Entry.students.map(function (s, i) { return i; }).filter(function (i) {
        var s = Entry.students[i];
        return !f || s.name.toLowerCase().indexOf(f) >= 0 || s.reg.toLowerCase().indexOf(f) >= 0 || bn(s.roll) === f || String(s.roll) === en(f);
      });
    },
    applyFilter: function () {
      if (Entry.view === 'table') {
        var vis = {}; Entry.visibleIdx().forEach(function (i) { vis[i] = 1; });
        $$('#entryBody tr[data-i]').forEach(function (tr) { tr.style.display = vis[tr.getAttribute('data-i')] ? '' : 'none'; });
      } else {
        var v = Entry.visibleIdx(); if (v.length) { Entry.idx = v[0]; Entry.renderBody(); }
      }
    },

    renderBody: function () {
      var s = Entry.sum, subs = s.subjects, edit = Entry.canEdit(), box = $('#entryBody');
      if (Entry.view === 'table') {
        var h = '<div class="card tbl-wrap" style="max-height:calc(100vh - 210px)"><table class="marks"><thead><tr><th>ক্রম</th><th class="name">শিক্ষার্থী</th><th>রেজি</th>' +
          subs.map(function (x) { return '<th class="sub">' + esc(x) + '</th>'; }).join('') + '<th>মোট</th>' + (edit ? '<th></th>' : '') + '</tr></thead><tbody>';
        Entry.students.forEach(function (st, i) {
          h += '<tr data-i="' + i + '"><td>' + bn(st.roll) + '</td><td class="name"><b>' + esc(st.name) + '</b><small>' + esc(st.father) + '</small><span class="rowtag" data-tag="' + i + '"></span></td><td class="reg">' + esc(st.reg) + '</td>';
          subs.forEach(function (sub, j) { h += '<td>' + Entry.inputHtml(st.reg, sub, i, j, edit) + '</td>'; });
          h += '<td class="total" data-total="' + i + '">' + Entry.totalText(st.reg) + '</td>' + (edit ? '<td><button class="row-act" data-abs="' + i + '" title="সব বিষয়ে অনুপস্থিত">অনু.</button></td>' : '') + '</tr>';
        });
        h += '</tbody></table></div>';
        box.innerHTML = h;
        Entry.applyFilter();
      } else {
        var vis = Entry.visibleIdx();
        if (vis.indexOf(Entry.idx) < 0) Entry.idx = vis.length ? vis[0] : 0;
        var i = Entry.idx, st = Entry.students[i];
        if (!st) { box.innerHTML = '<div class="card empty">কাউকে পাওয়া যায়নি</div>'; return; }
        var pos = vis.indexOf(i);
        var opts = Entry.students.map(function (x, k) { return '<option value="' + k + '"' + (k === i ? ' selected' : '') + '>' + bn(x.roll) + '. ' + esc(x.name) + (Entry.rowDone(x.reg) ? ' ✓' : '') + '</option>'; }).join('');
        box.innerHTML = '<div class="card mcard"><select class="input" id="stuPick" style="margin-bottom:14px">' + opts + '</select>' +
          '<div class="who"><div class="avatar" style="width:48px;height:48px;font-size:20px">' + bn(st.roll) + '</div><div><div class="n">' + esc(st.name) + '</div><div class="f">পিতা: ' + esc(st.father) + ' · ' + esc(st.reg) + '</div><span class="rowtag" data-tag="' + i + '"></span></div></div>' +
          '<div class="subs">' + subs.map(function (sub, j) { return '<label>' + esc(sub) + Entry.inputHtml(st.reg, sub, i, j, edit) + '</label>'; }).join('') + '</div>' +
          '<div class="tot"><span>মোট নম্বর</span><span data-total="' + i + '">' + Entry.totalText(st.reg) + '</span></div>' +
          '<div class="nav-row"><button class="btn btn-ghost" data-prev ' + (pos <= 0 ? 'disabled' : '') + '>' + ic('back') + ' আগের</button><span class="mid">' + bn(pos + 1) + ' / ' + bn(vis.length) + '</span><button class="btn btn-primary" data-next ' + (pos >= vis.length - 1 ? 'disabled' : '') + '>পরের ' + ic('next') + '</button></div>' +
          (edit ? '<div style="text-align:center;margin-top:10px;display:flex;gap:8px;justify-content:center"><button class="row-act" data-abs="' + i + '">সব বিষয়ে অনুপস্থিত</button>' + (isAdmin() ? '' : '<button class="btn btn-gold btn-sm" data-free>পরের খালি শিক্ষার্থী ' + ic('next') + '</button>') + '</div>' : '') + '</div>';
        $('#stuPick').onchange = function (e) { Entry.idx = +e.target.value; Entry.renderBody(); };
        var pv = $('[data-prev]', box), nx = $('[data-next]', box);
        pv.onclick = function () { Entry.idx = vis[pos - 1]; Entry.renderBody(); };
        nx.onclick = function () { Entry.idx = vis[pos + 1]; Entry.renderBody(); var f = $('.mk', box); if (f) f.focus(); };
        var fr = $('[data-free]', box); if (fr) fr.onclick = function () { Entry.nextFree(); };
        if (edit && !isAdmin() && !Entry.lockOf(st.reg)) Entry.claimRow(i);
      }
      $$('.mk', box).forEach(function (inp) {
        inp.addEventListener('input', Entry.onInput);
        inp.addEventListener('keydown', Entry.onKey);
        inp.addEventListener('focus', function () { inp.select(); var tr = inp.closest('tr'); if (tr) tr.classList.add('focus-row'); Entry.claimRow(+inp.getAttribute('data-r')); });
        inp.addEventListener('blur', function () {
          var tr = inp.closest('tr'); if (tr) tr.classList.remove('focus-row');
          var p = Entry.parse(inp.value); if (p.ok) inp.value = showMark(p.v);
        });
      });
      $$('[data-abs]', box).forEach(function (b) {
        b.onclick = function () {
          var st = Entry.students[+b.getAttribute('data-abs')];
          Entry.sum.subjects.forEach(function (sub) { Entry.setVal(st.reg, sub, 'A'); });
          Entry.refreshRow(+b.getAttribute('data-abs'));
          Entry.schedule();
        };
      });
      Entry.applyLocks();
    },
    lockOf: function (reg) {
      var o = Entry.owners && Entry.owners[reg];
      if (o && o.user !== Entry.me) return { type: 'done', name: o.name };
      var c = RT.claimOf(reg);
      if (c && c.sid !== RT.sid && c.user !== S.user.username) return { type: 'busy', name: c.name };
      if (c && c.sid === RT.sid) return { type: 'mine' };
      return null;
    },
    applyLocks: function () {
      if (!Entry.active) return;
      var edit = Entry.canEdit();
      Entry.students.forEach(function (st, i) {
        var L = Entry.lockOf(st.reg), tag = $$('[data-tag="' + i + '"]');
        var html = '';
        if (L && L.type === 'done') html = '<span class="chip pending">' + ic('check') + ' ' + esc(L.name) + ' নিয়েছেন</span>';
        else if (L && L.type === 'busy') html = '<span class="chip busy">' + esc(L.name) + ' পরীক্ষা নিচ্ছেন</span>';
        else if (L && L.type === 'mine') html = '<span class="chip open">আপনি নিচ্ছেন</span>';
        tag.forEach(function (t) { t.innerHTML = html; });
        var lock = !edit || (!isAdmin() && L && L.type !== 'mine');
        $$('.mk[data-r="' + i + '"]').forEach(function (inp) { if (inp !== document.activeElement || lock) inp.disabled = !!lock; });
        var tr = $('#entryBody tr[data-i="' + i + '"]'); if (tr) tr.classList.toggle('locked-row', !!(L && L.type !== 'mine' && !isAdmin()));
      });
    },
    claimRow: function (i) {
      if (isAdmin() || !Entry.canEdit()) return;
      var st = Entry.students[i]; if (!st || RT.myClaim === st.reg) return;
      var L = Entry.lockOf(st.reg);
      if (L && L.type !== 'mine') { toast(L.name + (L.type === 'done' ? ' এই শিক্ষার্থীর পরীক্ষা নিয়েছেন' : ' এখন এই শিক্ষার্থীর পরীক্ষা নিচ্ছেন'), 'err'); Entry.applyLocks(); return; }
      RT.claim(st.reg, { gid: Entry.gid, gname: Entry.sum.group, rname: st.name }).then(function (r) {
        if (!r.ok) {
          toast((r.by && r.by.name ? r.by.name : 'অন্য একজন') + ' এখন এই শিক্ষার্থীর পরীক্ষা নিচ্ছেন', 'err');
          var a = document.activeElement; if (a && a.classList.contains('mk') && +a.getAttribute('data-r') === i) a.blur();
        }
        Entry.applyLocks();
      });
    },
    nextFree: function () {
      var n = Entry.students.length;
      for (var k = 1; k <= n; k++) {
        var i = (Entry.idx + k) % n, st = Entry.students[i];
        if (!Entry.lockOf(st.reg) && !Entry.rowDone(st.reg)) { Entry.idx = i; Entry.renderBody(); var f = $('#entryBody .mk:not([disabled])'); if (f) f.focus(); return; }
      }
      toast('এই গ্রুপে আর কোনো খালি শিক্ষার্থী নেই', 'ok');
    },
    syncSoon: function () { clearTimeout(Entry.st); Entry.st = setTimeout(Entry.sync, 400); },
    applyRemote: function (ev) {
      var changed = 0;
      (ev.entries || []).forEach(function (e) {
        var i = -1; Entry.students.forEach(function (s, k) { if (s.reg === e.reg) i = k; });
        if (i < 0 || !Entry.server[e.reg]) return;
        if (ev.role !== 'admin' && !ev.fix && !Entry.owners[e.reg] && e.value !== '') Entry.owners[e.reg] = { user: ev.user, name: ev.name };
        if (ev.live) {
          var kk = Entry.key(e.reg, e.subject);
          if (Entry.dirty[kk] || Entry.bad[kk] || Entry.local[e.reg][e.subject] === e.value) return;
        } else {
          if (Entry.server[e.reg][e.subject] === e.value && Entry.local[e.reg][e.subject] === e.value) return;
          Entry.server[e.reg][e.subject] = e.value;
        }
        var k2 = Entry.key(e.reg, e.subject);
        if (Entry.dirty[k2] || Entry.bad[k2]) { if (Entry.local[e.reg][e.subject] === e.value) delete Entry.dirty[k2]; return; }
        Entry.local[e.reg][e.subject] = e.value; changed++;
        var j = Entry.sum.subjects.indexOf(e.subject);
        var inp = $('.mk[data-r="' + i + '"][data-c="' + j + '"]');
        if (inp && inp !== document.activeElement) { inp.value = showMark(e.value); inp.classList.toggle('abs', e.value === 'A'); inp.classList.toggle('low', Entry.isLow(e.value)); inp.classList.remove('flash'); void inp.offsetWidth; inp.classList.add('flash'); }
        $$('[data-total="' + i + '"]').forEach(function (x) { x.textContent = Entry.totalText(e.reg); });
      });
      if (ev.progress) { Entry.sum.progress = ev.progress; var pw = $('#progWrap'); if (pw) pw.innerHTML = progressBar(ev.progress, Entry.sum.state === 'submitted'); }
      Entry.applyLocks(); Entry.updateState();
    },
    inputHtml: function (reg, sub, i, j, edit) {
      var v = Entry.local[reg][sub], k = Entry.key(reg, sub);
      var cls = 'mk' + (Entry.dirty[k] ? ' dirty' : '') + (v === 'A' ? ' abs' : '') + (Entry.isLow(v) ? ' low' : '');
      return '<input class="' + cls + '" inputmode="decimal" autocomplete="off" data-reg="' + esc(reg) + '" data-sub="' + esc(sub) + '" data-r="' + i + '" data-c="' + j + '" value="' + esc(showMark(v)) + '"' + (edit ? '' : ' disabled') + '>';
    },
    isLow: function (v) { var n = parseFloat(v); return v !== '' && v !== 'A' && !isNaN(n) && n * 100 / S.settings.fullMark < S.settings.passMark; },
    parse: function (raw) {
      var v = en(raw).trim();
      if (v === '') return { ok: true, v: '' };
      if (/^(a|A|অ|অনু|অনুপস্থিত)$/.test(v)) return { ok: true, v: 'A' };
      if (!/^\d+(\.\d+)?$/.test(v)) return { ok: false };
      var n = Number(v);
      if (n < 0 || n > S.settings.fullMark || Math.round(n * 2) !== n * 2) return { ok: false };
      return { ok: true, v: String(n) };
    },
    setVal: function (reg, sub, v) {
      var k = Entry.key(reg, sub);
      var changed = Entry.local[reg][sub] !== v;
      Entry.local[reg][sub] = v; delete Entry.bad[k];
      if (Entry.server[reg][sub] === v) delete Entry.dirty[k]; else Entry.dirty[k] = 1;
      if (changed) Entry.livePush(reg, sub, v);
    },
    livePend: {},
    livePush: function (reg, sub, v) {
      if (!RT.B) return;
      Entry.livePend[Entry.key(reg, sub)] = { reg: reg, subject: sub, value: v };
      if (Entry.liveT) return;
      Entry.liveT = setTimeout(function () {
        Entry.liveT = null;
        var es = Object.keys(Entry.livePend).map(function (k) { return Entry.livePend[k]; });
        Entry.livePend = {};
        if (es.length) RT.push({ kind: 'marks', gid: Entry.gid, entries: es, live: true });
      }, 60);
    },
    onInput: function (e) {
      var inp = e.target, reg = inp.getAttribute('data-reg'), sub = inp.getAttribute('data-sub'), k = Entry.key(reg, sub);
      var p = Entry.parse(inp.value);
      if (!p.ok) { Entry.bad[k] = 1; inp.classList.add('bad'); Entry.updateState(); return; }
      inp.classList.remove('bad');
      Entry.setVal(reg, sub, p.v);
      inp.classList.toggle('dirty', !!Entry.dirty[k]);
      inp.classList.toggle('abs', p.v === 'A');
      inp.classList.toggle('low', Entry.isLow(p.v));
      if (p.v === 'A' && inp.value !== 'অ') inp.value = 'অ';
      var t = $$('[data-total="' + inp.getAttribute('data-r') + '"]'); t.forEach(function (x) { x.textContent = Entry.totalText(reg); });
      Entry.schedule();
    },
    onKey: function (e) {
      var inp = e.target, r = +inp.getAttribute('data-r'), c = +inp.getAttribute('data-c'), n = Entry.sum.subjects.length;
      var go = null;
      if (e.key === 'Enter') { go = c + 1 < n ? [r, c + 1] : [r + 1, 0]; }
      else if (e.key === 'ArrowDown') go = [r + 1, c];
      else if (e.key === 'ArrowUp') go = [r - 1, c];
      else if (e.key === 'ArrowRight' && inp.selectionStart === inp.value.length) go = [r, c + 1];
      else if (e.key === 'ArrowLeft' && inp.selectionStart === 0) go = [r, c - 1];
      if (!go) return;
      e.preventDefault();
      if (Entry.view === 'card') {
        if (go[0] !== r) {
          var vis = Entry.visibleIdx(), pos = vis.indexOf(r) + (go[0] > r ? 1 : -1);
          if (vis[pos] === undefined) return;
          Entry.idx = vis[pos]; Entry.renderBody();
          var f = $('.mk[data-c="' + (e.key === 'Enter' ? 0 : c) + '"]'); if (f) f.focus();
          return;
        }
      } else {
        // skip filtered rows
        var dir = go[0] > r ? 1 : go[0] < r ? -1 : 0;
        while (dir && go[0] >= 0 && go[0] < Entry.students.length) {
          var tr = $('#entryBody tr[data-i="' + go[0] + '"]');
          if (tr && tr.style.display !== 'none') break;
          go[0] += dir;
        }
      }
      var t = $('.mk[data-r="' + go[0] + '"][data-c="' + go[1] + '"]');
      if (t) { t.focus(); }
    },
    rowDone: function (reg) { var m = Entry.local[reg]; return Entry.sum.subjects.every(function (s) { return m[s] !== ''; }); },
    totalText: function (reg) {
      var m = Entry.local[reg], t = 0, any = false;
      Entry.sum.subjects.forEach(function (s) { var n = parseFloat(m[s]); if (!isNaN(n)) { t += n; any = true; } });
      return any ? bn(Math.round(t * 100) / 100) : '—';
    },
    refreshRow: function (i) {
      var st = Entry.students[i];
      Entry.sum.subjects.forEach(function (sub, j) {
        var inp = $('.mk[data-r="' + i + '"][data-c="' + j + '"]'); if (!inp) return;
        var v = Entry.local[st.reg][sub]; inp.value = showMark(v);
        inp.classList.toggle('dirty', !!Entry.dirty[Entry.key(st.reg, sub)]);
        inp.classList.toggle('abs', v === 'A'); inp.classList.remove('bad');
      });
      $$('[data-total="' + i + '"]').forEach(function (x) { x.textContent = Entry.totalText(st.reg); });
    },
    schedule: function () {
      Entry.updateState();
      try {
        var dr = {}; Object.keys(Entry.dirty).forEach(function (k) { var p = k.split('\u0001'); dr[k] = Entry.local[p[0]][p[1]]; });
        if (Object.keys(dr).length) localStorage.setItem(Entry.draftKey(), JSON.stringify(dr)); else localStorage.removeItem(Entry.draftKey());
      } catch (e) { }
      clearTimeout(Entry.timer);
      Entry.timer = setTimeout(function () { Entry.save(true); }, 800);
    },
    updateState: function (forced) {
      var el = $('#saveState'); if (!el) return;
      var d = Object.keys(Entry.dirty).length, b = Object.keys(Entry.bad).length;
      var cls = 'ok', txt = 'সব সংরক্ষিত';
      if (forced) { cls = forced[0]; txt = forced[1]; }
      else if (Entry.saving) { cls = 'saving'; txt = 'সংরক্ষণ হচ্ছে…'; }
      else if (b) { cls = 'err'; txt = bn(b) + 'টি ভুল নম্বর'; }
      else if (d) { cls = 'dirty'; txt = bn(d) + 'টি অসংরক্ষিত'; }
      el.className = 'save-state ' + cls;
      el.innerHTML = '<span class="dot"></span><span>' + txt + '</span>';
    },
    save: function (quiet) {
      if (!Entry.active || Entry.saving) return Promise.resolve();
      clearTimeout(Entry.timer);
      var keys = Object.keys(Entry.dirty);
      if (!keys.length) { if (!quiet) toast('সংরক্ষণের মতো নতুন কিছু নেই'); Entry.updateState(); return Promise.resolve(); }
      var entries = keys.map(function (k) { var p = k.split('\u0001'); return { reg: p[0], subject: p[1], value: Entry.local[p[0]][p[1]] }; });
      Entry.saving = true; Entry.updateState();
      var gid = Entry.gid;
      return api('saveMarks', { gid: gid, entries: entries }).then(function (d) {
        Entry.saving = false;
        if (Entry.gid !== gid) return;
        entries.forEach(function (e) {
          Entry.server[e.reg][e.subject] = e.value;
          var k = Entry.key(e.reg, e.subject);
          if (Entry.local[e.reg][e.subject] === e.value) {
            delete Entry.dirty[k];
            var inp = $('.mk[data-reg="' + CSS.escape(e.reg) + '"][data-sub="' + CSS.escape(e.subject) + '"]'); if (inp) inp.classList.remove('dirty');
          }
        });
        Object.keys(d.conflicts || {}).forEach(function (reg) {
          Entry.sum.subjects.forEach(function (sub) { var k = Entry.key(reg, sub); delete Entry.dirty[k]; Entry.local[reg][sub] = Entry.server[reg][sub]; });
          var idx = -1; Entry.students.forEach(function (s, k) { if (s.reg === reg) idx = k; });
          if (idx >= 0) Entry.refreshRow(idx);
          toast(d.conflicts[reg] + ' আগেই এই শিক্ষার্থীর পরীক্ষা নিয়েছেন, আপনার নম্বর রাখা হয়নি', 'err');
        });
        var reverts = [];
        Object.keys(d.conflicts || {}).forEach(function (reg) { Entry.sum.subjects.forEach(function (sub) { reverts.push({ reg: reg, subject: sub, value: Entry.server[reg][sub] }); }); });
        if (reverts.length) RT.push({ kind: 'marks', gid: gid, entries: reverts, fix: true });
        if (d.owners) Entry.owners = d.owners;
        var okEntries = entries.filter(function (e) { return !(d.conflicts || {})[e.reg]; });
        if (okEntries.length) RT.push({ kind: 'marks', gid: gid, entries: okEntries, progress: d.progress });
        Entry.applyLocks();
        Entry.sum.progress = d.progress;
        var pw = $('#progWrap'); if (pw) pw.innerHTML = progressBar(d.progress, Entry.sum.state === 'submitted');
        if (!Object.keys(Entry.dirty).length) localStorage.removeItem(Entry.draftKey());
        Entry.updateState();
        if (!quiet) toast('সংরক্ষিত হয়েছে', 'ok');
        if (Object.keys(Entry.dirty).length) Entry.schedule();
      }).catch(function (e) {
        Entry.saving = false;
        Entry.updateState(['err', 'সংরক্ষণ হয়নি — আবার চেষ্টা হবে']);
        toast(e.message, 'err');
        clearTimeout(Entry.timer);
        Entry.timer = setTimeout(function () { Entry.save(true); }, 10000);
      });
    },
    submit: function () {
      if (Object.keys(Entry.bad).length) return toast('আগে লাল চিহ্নিত ভুল নম্বরগুলো ঠিক করুন', 'err');
      Entry.save(true).then(function () {
        var p = Entry.sum.progress;
        var low = 0, abs = 0;
        Entry.students.forEach(function (st) { Entry.sum.subjects.forEach(function (sub) { var v = Entry.local[st.reg][sub]; if (v === 'A') abs++; else if (Entry.isLow(v)) low++; }); });
        var msg = '<p>গ্রুপ: <b>' + esc(Entry.sum.group) + '</b> (' + esc(Entry.sum.branch) + ')</p>' +
          '<p>পূরণ হয়েছে: <b>' + bn(p.filled) + ' / ' + bn(p.total) + '</b> ঘর' + (p.filled < p.total ? ' <span style="color:var(--red)">— এখনো কিছু ঘর খালি!</span>' : ' ✓') + '</p>' +
          (low ? '<p>পাস নম্বরের নিচে: <b style="color:var(--red)">' + bn(low) + '</b>টি</p>' : '') + (abs ? '<p>অনুপস্থিত: <b>' + bn(abs) + '</b>টি</p>' : '') +
          '<p style="color:var(--muted)">জমা দেওয়ার পর আর পরিবর্তন করা যাবে না (এডমিন আনলক করলে করা যাবে)।</p>';
        return confirmBox('চূড়ান্ত জমা দেবেন?', msg, 'হ্যাঁ, জমা দিন').then(function (ok) {
          if (!ok) return;
          loading(true);
          return api('submitGroup', { gid: Entry.gid }).then(function () {
            loading(false); toast('নম্বর চূড়ান্ত জমা হয়েছে। জাযাকাল্লাহু খাইরান', 'ok'); RT.push({ kind: 'change', gid: Entry.gid }); Entry.open(Entry.gid);
          }).catch(function (e) { loading(false); toast(e.message, 'err'); });
        });
      });
    },
    setState: function (st) {
      confirmBox(st === 'open' ? 'গ্রুপ আনলক করবেন?' : 'গ্রুপ লক করবেন?', st === 'open' ? 'পরীক্ষক আবার নম্বর পরিবর্তন করতে পারবেন।' : 'পরীক্ষক আর নম্বর পরিবর্তন করতে পারবেন না।').then(function (ok) {
        if (!ok) return;
        api('setGroupState', { gid: Entry.gid, state: st }).then(function () { toast('হয়েছে', 'ok'); RT.push({ kind: 'change', gid: Entry.gid }); Entry.open(Entry.gid); }).catch(function (e) { toast(e.message, 'err'); });
      });
    }
  };

  // ============ Results ============
  var Results = {
    index: function () {
      pageLoading('ফলাফল', '#/results');
      refreshGroups().then(function () {
        var top = isAdmin() ? '<div class="toolbar-line"><span class="grow" style="color:var(--muted)">যেকোনো গ্রুপে চাপ দিয়ে ফলাফল, মেধাস্থান ও প্রিন্ট দেখুন।</span><button class="btn btn-gold" data-allx>' + ic('download') + ' সব গ্রুপের ফলাফল Excel</button><button class="btn btn-ghost" data-allp>' + ic('print') + ' সব ফলাফল প্রিন্ট</button></div>' : '';
        setPage('ফলাফল', top + byBranch(S.groups, function (g) { return groupCard(g, '#/r/' + enc(g.gid)); }), '#/results');
        var ax = $('[data-allx]'); if (ax) ax.onclick = function () { loading(true); api('results', { gid: '*' }).then(function (d) { loading(false); exportExcel(d.groups, 'সব_গ্রুপের_ফলাফল'); }).catch(function (e) { loading(false); toast(e.message, 'err'); }); };
        var ap = $('[data-allp]'); if (ap) ap.onclick = function () { loading(true); api('results', { gid: '*' }).then(function (d) { loading(false); printResults(d.groups, d.settings); }).catch(function (e) { loading(false); toast(e.message, 'err'); }); };
      }).catch(function (e) { toast(e.message, 'err'); });
    },
    open: function (gid) {
      pageLoading('ফলাফল', '#/results');
      api('results', { gid: gid }).then(function (d) {
        var R = d.groups[0], st = R.stats;
        Results.cur = R; Results.settings = d.settings;
        var html = '<div class="entry-head"><div class="info"><a href="#/results" class="btn btn-ghost btn-sm" style="margin-bottom:6px">' + ic('back') + ' সব ফলাফল</a><h3>' + esc(R.group) + '</h3><div class="sub">' + esc(R.branch) + '</div></div>' +
          '<div class="toolbar"><a class="btn btn-ghost" href="#/g/' + enc(gid) + '">' + ic('edit') + ' নম্বর</a><button class="btn btn-ghost" data-p>' + ic('print') + ' ফলাফল প্রিন্ট</button><button class="btn btn-ghost" data-cards>' + ic('card') + ' সবার মার্কশিট</button><button class="btn btn-gold" data-x>' + ic('download') + ' Excel</button></div></div>';
        html += '<div class="grid stats">' +
          stat('কৃতকার্য', bn(st.passed) + '/' + bn(st.complete), 'check', '', st.passRate === null ? '' : 'পাসের হার ' + bn(st.passRate) + '%') +
          stat('সর্বোচ্চ নম্বর', st.highest === null ? '—' : bn(st.highest), 'star', 'gold') +
          stat('গড় মোট নম্বর', st.average === null ? '—' : bn(st.average), 'chart') +
          stat('অকৃতকার্য / অনুপস্থিত', bn(st.failed) + ' / ' + bn(st.absent), 'users', 'gold', st.complete < st.count ? bn(st.count - st.complete) + ' জনের নম্বর অসম্পূর্ণ' : '') + '</div>';
        var dist = Object.keys(st.grades).map(function (g) { return '<span>' + esc(g) + ': <b>' + bn(st.grades[g]) + '</b></span>'; }).join('');
        if (dist) html += '<div class="card card-pad" style="margin-bottom:16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap"><b style="color:var(--green)">গ্রেড বিন্যাস</b><div class="dist">' + dist + '</div></div>';
        html += '<div class="card tbl-wrap"><table class="tbl"><thead><tr><th class="c">মেধা</th><th>শিক্ষার্থী</th>' + R.subjects.map(function (s) { return '<th class="c">' + esc(s) + '</th>'; }).join('') + '<th class="c">মোট</th><th class="c">গড়</th><th class="c">গ্রেড</th><th>ফলাফল</th></tr></thead><tbody>';
        var rows = R.rows.slice().sort(function (a, b) { return (a.rank || 999) - (b.rank || 999) || b.total - a.total || a.roll - b.roll; });
        rows.forEach(function (r) {
          html += '<tr style="cursor:pointer" data-reg="' + esc(r.reg) + '"><td class="c">' + (r.rank ? '<span class="rank-badge ' + (r.rank <= 3 ? 'r' + r.rank : '') + '">' + bn(r.rank) + '</span>' : '—') + '</td>' +
            '<td><b>' + esc(r.name) + '</b><small>' + esc(r.reg) + ' · ' + esc(r.father) + '</small></td>' +
            R.subjects.map(function (s) { var v = r.marks[s]; var low = v !== '' && v !== 'A' && parseFloat(v) * 100 / d.settings.fullMark < d.settings.passMark; return '<td class="num" style="' + (low || v === 'A' ? 'color:var(--red);font-weight:700' : '') + '">' + (v === '' ? '<span style="color:#ccc">—</span>' : showMark(v)) + '</td>'; }).join('') +
            '<td class="num"><b>' + bn(r.total) + '</b></td><td class="num">' + bn(r.avg) + '</td><td class="c">' + esc(r.grade) + '</td><td>' + resultChip(r.result) + '</td></tr>';
        });
        html += '<tr><td></td><td><b style="color:var(--muted)">বিষয়ভিত্তিক গড়</b></td>' + R.subjects.map(function (s) { return '<td class="num" style="color:var(--muted)">' + (st.subjectAvg[s] === null ? '—' : bn(st.subjectAvg[s])) + '</td>'; }).join('') + '<td colspan="4"></td></tr>';
        html += '</tbody></table></div><div class="tips">কোনো শিক্ষার্থীর সারিতে চাপ দিলে তার মার্কশিট দেখা ও প্রিন্ট করা যাবে।</div>';
        setPage(R.group + ' — ফলাফল', html, '#/results');
        $('[data-x]').onclick = function () { exportExcel([R], R.group + '_ফলাফল'); };
        $('[data-p]').onclick = function () { printResults([R], d.settings); };
        $('[data-cards]').onclick = function () { printMarksheets(R, R.rows, d.settings); };
        $$('tr[data-reg]').forEach(function (tr) { tr.onclick = function () { Results.studentModal(tr.getAttribute('data-reg')); }; });
      }).catch(function (e) { toast(e.message, 'err'); });
    },
    studentModal: function (reg) {
      var R = Results.cur, r = R.rows.filter(function (x) { return x.reg === reg; })[0], S2 = Results.settings;
      var body = '<div style="display:flex;gap:14px;align-items:center;margin-bottom:14px"><div class="avatar" style="width:52px;height:52px;font-size:22px">' + (r.rank ? bn(r.rank) : '—') + '</div><div><div style="font-size:20px;font-weight:700;color:var(--green)">' + esc(r.name) + '</div><div style="color:var(--muted)">পিতা: ' + esc(r.father) + ' · ' + esc(r.reg) + '</div></div></div>' +
        '<table class="tbl"><thead><tr><th>বিষয়</th><th class="c">পূর্ণমান</th><th class="c">প্রাপ্ত নম্বর</th></tr></thead><tbody>' +
        R.subjects.map(function (s) { return '<tr><td>' + esc(s) + '</td><td class="num">' + bn(S2.fullMark) + '</td><td class="num"><b>' + (r.marks[s] === '' ? '—' : showMark(r.marks[s])) + '</b></td></tr>'; }).join('') +
        '<tr><td><b>মোট</b></td><td class="num">' + bn(S2.fullMark * R.subjects.length) + '</td><td class="num"><b>' + bn(r.total) + '</b></td></tr></tbody></table>' +
        '<div class="grid" style="grid-template-columns:repeat(3,1fr);margin-top:14px;text-align:center"><div class="card card-pad"><div class="pct">গড়</div><b>' + bn(r.avg) + '</b></div><div class="card card-pad"><div class="pct">গ্রেড</div><b>' + esc(r.grade) + '</b></div><div class="card card-pad"><div class="pct">ফলাফল</div><b>' + esc(r.result) + '</b></div></div>';
      var m = modal({ title: 'মার্কশিট', body: body, foot: '<button class="btn btn-ghost" data-x>বন্ধ</button><button class="btn btn-primary" data-pr>' + ic('print') + ' প্রিন্ট</button>' });
      $('[data-pr]', m.el).onclick = function () { printMarksheets(R, [r], S2); };
    }
  };
  function resultChip(r) {
    var c = r === 'কৃতকার্য' ? 'open' : r === 'অকৃতকার্য' ? 'fail' : 'pending';
    return '<span class="chip ' + c + '">' + esc(r) + '</span>';
  }

  // ============ Merit ============
  var Merit = {
    open: function () {
      pageLoading('মেধাতালিকা', '#/merit');
      api('results', { gid: '*' }).then(function (d) {
        Merit.data = d;
        var html = '<div class="toolbar-line"><span class="grow" style="color:var(--muted)">প্রতিটি গ্রুপের প্রথম তিনজন (শুধু কৃতকার্যদের মধ্যে)।</span><button class="btn btn-ghost" data-p>' + ic('print') + ' মেধাতালিকা প্রিন্ট</button></div>';
        var last = null;
        d.groups.forEach(function (R) {
          if (R.branch !== last) { if (last !== null) html += '</div>'; html += '<div class="branch-title">' + esc(R.branch) + '</div><div class="grid merit">'; last = R.branch; }
          var top = R.rows.filter(function (r) { return r.rank && r.rank <= 3; }).sort(function (a, b) { return a.rank - b.rank; });
          html += '<div class="card"><div class="card-head"><h3>' + esc(R.group) + '</h3><a class="btn btn-ghost btn-sm" href="#/r/' + enc(R.gid) + '">বিস্তারিত</a></div>' +
            (top.length ? '<ol>' + top.map(function (r) { return '<li><span class="rank-badge r' + r.rank + '">' + bn(r.rank) + '</span><span class="nm">' + esc(r.name) + '<small>' + esc(r.reg) + '</small></span><span class="sc">' + bn(r.total) + '<small>' + esc(r.grade) + '</small></span></li>'; }).join('') + '</ol>'
              : '<div class="empty" style="padding:22px">' + (R.stats.complete ? 'কেউ কৃতকার্য হয়নি' : 'নম্বর এখনো আসেনি') + '</div>') + '</div>';
        });
        if (last !== null) html += '</div>';
        setPage('মেধাতালিকা', html, '#/merit');
        $('[data-p]').onclick = function () { printMerit(d.groups, d.settings); };
      }).catch(function (e) { toast(e.message, 'err'); });
    }
  };

  // ============ Users ============
  var Users = {
    open: function () {
      pageLoading('পরীক্ষকবৃন্দ', '#/users');
      Promise.all([api('listUsers'), refreshGroups()]).then(function (res) {
        Users.list = res[0].users;
        var html = '<div class="toolbar-line"><div class="search grow">' + ic('search') + '<input class="input" id="uq" placeholder="খুঁজুন…"></div><button class="btn btn-primary" data-add>' + ic('plus') + ' নতুন পরীক্ষক</button></div>';
        html += '<div class="card tbl-wrap"><table class="tbl"><thead><tr><th>নাম</th><th>ইউজারনেম</th><th>ভূমিকা</th><th>দায়িত্বপ্রাপ্ত গ্রুপ</th><th>মোবাইল</th><th></th></tr></thead><tbody id="ubody"></tbody></table></div>';
        var unassigned = S.groups.filter(function (g) { return !g.examiners.length; });
        if (unassigned.length) html += '<div class="card card-pad" style="margin-top:14px;border-left:4px solid var(--gold)"><b>পরীক্ষক নেই এমন গ্রুপ (' + bn(unassigned.length) + '):</b> ' + unassigned.map(function (g) { return esc(g.group) + ' <small style="color:var(--muted)">(' + esc(g.branch) + ')</small>'; }).join(', ') + '</div>';
        setPage('পরীক্ষকবৃন্দ', html, '#/users');
        Users.draw('');
        $('#uq').oninput = function (e) { Users.draw(e.target.value.trim().toLowerCase()); };
        $('[data-add]').onclick = function () { Users.form(null); };
      }).catch(function (e) { toast(e.message, 'err'); });
    },
    groupName: function (gid) { var g = S.groups.filter(function (x) { return x.gid === gid; })[0]; return g ? g.group + (g.branch !== 'সাধারণ শাখা' ? ' (' + g.branch.replace(' শাখা', '') + ')' : '') : gid; },
    draw: function (q) {
      var rows = Users.list.filter(function (u) { return !q || (u.name + ' ' + u.username).toLowerCase().indexOf(q) >= 0; });
      $('#ubody').innerHTML = rows.map(function (u) {
        return '<tr' + (u.active ? '' : ' style="opacity:.55"') + '><td><b>' + esc(u.name) + '</b>' + (u.active ? '' : '<small>নিষ্ক্রিয়</small>') + '</td><td>' + esc(u.username) + '</td>' +
          '<td>' + (u.role === 'admin' ? '<span class="chip admin">এডমিন</span>' : '<span class="chip open">পরীক্ষক</span>') + '</td>' +
          '<td style="max-width:360px">' + (u.role === 'admin' ? '<small>সব গ্রুপ</small>' : u.groups.length ? u.groups.map(function (g) { return '<span class="chip pending" style="margin:2px">' + esc(Users.groupName(g)) + '</span>'; }).join('') : '<small style="color:var(--red)">কোনো গ্রুপ নেই</small>') + '</td>' +
          '<td>' + esc(u.phone) + '</td><td style="white-space:nowrap"><button class="btn btn-ghost btn-sm" data-e="' + esc(u.username) + '">' + ic('edit') + '</button> ' +
          (u.username !== S.user.username ? '<button class="btn btn-danger btn-sm" data-d="' + esc(u.username) + '">' + ic('trash') + '</button>' : '') + '</td></tr>';
      }).join('') || '<tr><td colspan="6" class="empty">কেউ নেই</td></tr>';
      $$('[data-e]').forEach(function (b) { b.onclick = function () { Users.form(Users.list.filter(function (u) { return u.username === b.getAttribute('data-e'); })[0]); }; });
      $$('[data-d]').forEach(function (b) {
        b.onclick = function () {
          var un = b.getAttribute('data-d');
          confirmBox('মুছে ফেলবেন?', '<b>' + esc(un) + '</b> অ্যাকাউন্টটি মুছে যাবে। তার দেওয়া নম্বর থেকে যাবে।', 'মুছে ফেলুন', true).then(function (ok) {
            if (ok) api('deleteUser', { username: un }).then(function () { toast('মুছে ফেলা হয়েছে', 'ok'); Users.open(); }).catch(function (e) { toast(e.message, 'err'); });
          });
        };
      });
    },
    form: function (u) {
      var isNew = !u; u = u || { username: '', name: '', role: 'examiner', groups: [], active: true, phone: '' };
      var checks = '', last = null;
      S.groups.forEach(function (g) {
        if (g.branch !== last) { checks += '<div class="gb">' + esc(g.branch) + '</div>'; last = g.branch; }
        var others = g.examiners.filter(function (n) { return n !== u.name; });
        checks += '<label class="check"><input type="checkbox" value="' + esc(g.gid) + '"' + (u.groups.indexOf(g.gid) >= 0 ? ' checked' : '') + '> ' + esc(g.group) + ' <small style="color:var(--muted)">(' + bn(g.count) + ' জন' + (others.length ? ' · ' + esc(others.join(', ')) : '') + ')</small></label>';
      });
      var m = modal({ title: isNew ? 'নতুন পরীক্ষক' : 'পরীক্ষকের তথ্য', wide: true,
        body: '<div class="row2"><div class="field"><label>পূর্ণ নাম *</label><input class="input" id="fName" value="' + esc(u.name) + '"></div>' +
          '<div class="field"><label>ইউজারনেম * (ইংরেজি ছোট হাতের)</label><input class="input" id="fUser" value="' + esc(u.username) + '" autocapitalize="none"></div></div>' +
          '<div class="row2"><div class="field"><label>' + (isNew ? 'পাসওয়ার্ড *' : 'নতুন পাসওয়ার্ড (বদলাতে চাইলে)') + '</label><div style="display:flex;gap:6px"><input class="input" id="fPass" type="text" placeholder="' + (isNew ? '' : 'খালি রাখলে আগেরটাই থাকবে') + '"><button class="btn btn-ghost" type="button" data-gen title="স্বয়ংক্রিয় পাসওয়ার্ড">' + ic('key') + '</button></div></div>' +
          '<div class="field"><label>মোবাইল (WhatsApp)</label><input class="input" id="fPhone" inputmode="tel" value="' + esc(u.phone) + '" placeholder="01XXXXXXXXX"></div></div>' +
          '<div class="row2"><div class="field"><label>ভূমিকা</label><select class="input" id="fRole"><option value="examiner">পরীক্ষক</option><option value="admin"' + (u.role === 'admin' ? ' selected' : '') + '>এডমিন (সব ক্ষমতা)</option></select></div>' +
          '<div class="field"><label>অবস্থা</label><label class="check" style="padding-top:8px"><input type="checkbox" id="fActive"' + (u.active ? ' checked' : '') + '> সক্রিয় (লগইন করতে পারবেন)</label></div></div>' +
          '<div class="field" id="grpField"><label>দায়িত্বপ্রাপ্ত গ্রুপ</label><div class="group-checks">' + checks + '</div></div>',
        foot: '<button class="btn btn-ghost" data-x>বাতিল</button><button class="btn btn-primary" data-ok>' + ic('save') + ' সংরক্ষণ</button>' });
      var gf = $('#grpField', m.el);
      function rt() { gf.style.display = $('#fRole', m.el).value === 'admin' ? 'none' : ''; }
      $('#fRole', m.el).onchange = rt; rt();
      $('[data-gen]', m.el).onclick = function () { $('#fPass', m.el).value = String(Math.floor(100000 + Math.random() * 900000)); };
      if (isNew) $('#fPass', m.el).value = String(Math.floor(100000 + Math.random() * 900000));
      $('[data-ok]', m.el).onclick = function () {
        var pass = $('#fPass', m.el).value.trim();
        var data = { original: isNew ? '' : u.username, name: $('#fName', m.el).value, username: $('#fUser', m.el).value, password: pass,
          phone: $('#fPhone', m.el).value, role: $('#fRole', m.el).value, active: $('#fActive', m.el).checked,
          groups: $$('.group-checks input:checked', m.el).map(function (x) { return x.value; }) };
        api('saveUser', { user: data }).then(function (d) {
          m.close(); toast('সংরক্ষিত হয়েছে', 'ok');
          Users.open();
          if (pass) Users.share(d.user, pass);
        }).catch(function (e) { toast(e.message, 'err'); });
      };
    },
    share: function (u, pass) {
      var link = location.href.split('#')[0];
      var groups = u.role === 'admin' ? 'সব গ্রুপ' : u.groups.map(Users.groupName).join(', ');
      var msg = 'আসসালামু আলাইকুম, ' + u.name + '\n' + S.settings.institution + ' — ' + S.settings.examTitle + '\nনম্বর দেওয়ার লিংক: ' + link + '\nইউজারনেম: ' + u.username + '\nপাসওয়ার্ড: ' + pass + (groups ? '\nআপনার গ্রুপ: ' + groups : '');
      var phone = en(u.phone).replace(/\D/g, ''); if (phone.indexOf('0') === 0) phone = '88' + phone;
      var m = modal({ title: 'লগইন তথ্য পাঠান', body: '<p style="color:var(--muted);margin-top:0">পাসওয়ার্ড শুধু এখনই দেখা যাচ্ছে — পরীক্ষককে পাঠিয়ে দিন।</p><textarea class="input" rows="7" id="shareTxt">' + esc(msg) + '</textarea>',
        foot: '<button class="btn btn-ghost" data-copy>' + ic('copy') + ' কপি</button><a class="btn btn-primary" target="_blank" href="https://wa.me/' + phone + '?text=' + encodeURIComponent(msg) + '">' + ic('wa') + ' WhatsApp-এ পাঠান</a>' });
      $('[data-copy]', m.el).onclick = function () { $('#shareTxt').select(); try { navigator.clipboard.writeText(msg); } catch (e) { document.execCommand('copy'); } toast('কপি হয়েছে', 'ok'); };
    }
  };

  // ============ Students ============
  var Students = {
    open: function () {
      pageLoading('শিক্ষার্থী', '#/students');
      api('listStudents').then(function (d) {
        Students.list = d.students;
        var branches = uniq(d.students.map(function (s) { return s.branch; }));
        var html = '<div class="toolbar-line"><div class="search grow">' + ic('search') + '<input class="input" id="sq" placeholder="নাম, পিতার নাম বা রেজি নম্বর…"></div>' +
          '<select class="input" id="sb" style="width:auto"><option value="">সব শাখা</option>' + branches.map(function (b) { return '<option>' + esc(b) + '</option>'; }).join('') + '</select>' +
          '<select class="input" id="sg" style="width:auto"><option value="">সব গ্রুপ</option></select>' +
          '<button class="btn btn-ghost" data-ex>' + ic('download') + ' Excel</button><button class="btn btn-ghost" data-ph>' + ic('wa') + ' অভিভাবকের মোবাইল</button><button class="btn btn-primary" data-add>' + ic('plus') + ' নতুন শিক্ষার্থী</button></div>' +
          '<div class="card tbl-wrap"><table class="tbl"><thead><tr><th>রেজি</th><th>নাম</th><th>পিতা</th><th>গ্রুপ</th><th>অভিভাবকের মোবাইল</th><th></th></tr></thead><tbody id="sbody"></tbody></table></div><div class="tips" id="scount"></div>';
        setPage('শিক্ষার্থী', html, '#/students');
        function fillGroups() {
          var b = $('#sb').value;
          var gs = uniq(Students.list.filter(function (s) { return !b || s.branch === b; }).map(function (s) { return s.group; }));
          $('#sg').innerHTML = '<option value="">সব গ্রুপ</option>' + gs.map(function (g) { return '<option>' + esc(g) + '</option>'; }).join('');
        }
        fillGroups();
        $('#sb').onchange = function () { fillGroups(); Students.draw(); };
        $('#sg').onchange = Students.draw; $('#sq').oninput = Students.draw;
        $('[data-add]').onclick = function () { Students.form(null); };
        $('[data-ex]').onclick = function () { Students.export(); };
        $('[data-ph]').onclick = function () { Phones.open($('#sb').value, $('#sg').value); };
        Students.draw();
      }).catch(function (e) { toast(e.message, 'err'); });
    },
    filtered: function () {
      var q = ($('#sq').value || '').trim().toLowerCase(), b = $('#sb').value, g = $('#sg').value;
      return Students.list.filter(function (s) {
        return (!b || s.branch === b) && (!g || s.group === g) && (!q || (s.name + ' ' + s.father + ' ' + s.reg).toLowerCase().indexOf(q) >= 0);
      });
    },
    draw: function () {
      var rows = Students.filtered();
      $('#sbody').innerHTML = rows.slice(0, 400).map(function (s) {
        return '<tr><td>' + esc(s.reg) + '</td><td><b>' + esc(s.name) + '</b></td><td>' + esc(s.father) + '</td><td>' + esc(s.group) + '<small>' + esc(s.branch) + ' · ' + esc(s.year) + '</small></td><td>' + (s.phone ? bn(s.phone) : '<span style="color:#bbb">—</span>') + '</td>' +
          '<td style="white-space:nowrap"><button class="btn btn-ghost btn-sm" data-e="' + esc(s.reg) + '">' + ic('edit') + '</button> <button class="btn btn-danger btn-sm" data-d="' + esc(s.reg) + '">' + ic('trash') + '</button></td></tr>';
      }).join('') || '<tr><td colspan="6" class="empty">কাউকে পাওয়া যায়নি</td></tr>';
      $('#scount').textContent = 'মোট ' + bn(rows.length) + ' জন';
      $$('#sbody [data-e]').forEach(function (b) { b.onclick = function () { Students.form(Students.list.filter(function (s) { return s.reg === b.getAttribute('data-e'); })[0]); }; });
      $$('#sbody [data-d]').forEach(function (b) {
        b.onclick = function () {
          var reg = b.getAttribute('data-d');
          confirmBox('মুছে ফেলবেন?', '<b>' + esc(reg) + '</b> শিক্ষার্থী ও তার সব নম্বর মুছে যাবে।', 'মুছে ফেলুন', true).then(function (ok) {
            if (ok) api('deleteStudent', { reg: reg }).then(function () { toast('মুছে ফেলা হয়েছে', 'ok'); Students.open(); }).catch(function (e) { toast(e.message, 'err'); });
          });
        };
      });
    },
    form: function (s) {
      var isNew = !s; s = s || { reg: Students.nextReg(), name: '', father: '', branch: 'সাধারণ শাখা', group: '', year: '', phone: '' };
      var branches = uniq(BRANCH_ORDER.concat(Students.list.map(function (x) { return x.branch; })));
      var groups = uniq(Students.list.map(function (x) { return x.group; }));
      var m = modal({ title: isNew ? 'নতুন শিক্ষার্থী' : 'শিক্ষার্থীর তথ্য',
        body: '<div class="row2"><div class="field"><label>রেজি নম্বর *</label><input class="input" id="tReg" value="' + esc(s.reg) + '"></div><div class="field"><label>বর্ষ ও সেমিস্টার</label><input class="input" id="tYear" value="' + esc(s.year) + '"></div></div>' +
          '<div class="field"><label>শিক্ষার্থীর নাম *</label><input class="input" id="tName" value="' + esc(s.name) + '"></div>' +
          '<div class="row2"><div class="field"><label>পিতা/অভিভাবকের নাম</label><input class="input" id="tFather" value="' + esc(s.father) + '"></div>' +
          '<div class="field"><label>অভিভাবকের মোবাইল</label><input class="input" id="tPhone" inputmode="tel" placeholder="01XXXXXXXXX" value="' + esc(s.phone || '') + '"></div></div>' +
          '<div class="row2"><div class="field"><label>শাখা *</label><select class="input" id="tBranch">' + branches.map(function (b) { return '<option' + (b === s.branch ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('') + '</select></div>' +
          '<div class="field"><label>গ্রুপ *</label><input class="input" id="tGroup" list="grpList" value="' + esc(s.group) + '"><datalist id="grpList">' + groups.map(function (g) { return '<option value="' + esc(g) + '">'; }).join('') + '</datalist></div></div>' +
          '<div class="tips">গ্রুপের নামে "আল কুরআন" থাকলে আল কুরআন ও তাজবীদ বিষয় আসবে, না থাকলে কায়দা।</div>',
        foot: '<button class="btn btn-ghost" data-x>বাতিল</button><button class="btn btn-primary" data-ok>' + ic('save') + ' সংরক্ষণ</button>' });
      $('[data-ok]', m.el).onclick = function () {
        var d = { original: isNew ? '' : s.reg, reg: $('#tReg', m.el).value, name: $('#tName', m.el).value, father: $('#tFather', m.el).value,
          branch: $('#tBranch', m.el).value, group: $('#tGroup', m.el).value, year: $('#tYear', m.el).value, phone: $('#tPhone', m.el).value };
        api('saveStudent', { student: d }).then(function () { m.close(); toast('সংরক্ষিত হয়েছে', 'ok'); Students.open(); }).catch(function (e) { toast(e.message, 'err'); });
      };
    },
    nextReg: function () {
      var max = 0, pre = 'ASM26';
      Students.list.forEach(function (s) { var m = /^([A-Za-z]+\d{2})(\d+)$/.exec(s.reg); if (m) { pre = m[1]; max = Math.max(max, +m[2]); } });
      return pre + (max + 1);
    },
    export: function () {
      var rows = Students.filtered().map(function (s, i) { return { 'ক্রম': i + 1, 'রেজি নং': s.reg, 'শিক্ষার্থীর নাম': s.name, 'পিতা/অভিভাবকের নাম': s.father, 'শাখা': s.branch, 'গ্রুপ': s.group, 'বর্ষ ও সেমিস্টার': s.year, 'অভিভাবকের মোবাইল': s.phone || '' }; });
      xlsx([{ name: 'শিক্ষার্থী', rows: rows }], 'শিক্ষার্থী_তালিকা');
    }
  };
  var BRANCH_ORDER = ['সাধারণ শাখা', 'মাস্তুরাত শাখা', 'ফরজে আইন শাখা'];
  function uniq(a) { var o = []; a.forEach(function (x) { if (x && o.indexOf(x) < 0) o.push(x); }); return o; }

  // ============ Settings ============
  var Settings = {
    open: function () {
      var s = S.settings;
      var html = '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(340px,1fr));align-items:start">' +
        '<div class="card"><div class="card-head"><h3>প্রতিষ্ঠান ও পরীক্ষা</h3></div><div class="card-pad">' +
        '<div class="field"><label>প্রতিষ্ঠানের নাম</label><input class="input" id="sInst" value="' + esc(s.institution) + '"></div>' +
        '<div class="field"><label>ঠিকানা</label><textarea class="input" id="sAddr" rows="2">' + esc(s.address) + '</textarea></div>' +
        '<div class="field"><label>পরীক্ষার নাম</label><input class="input" id="sExam" value="' + esc(s.examTitle) + '"></div>' +
        '<div class="row2"><div class="field"><label>প্রতি বিষয়ের পূর্ণমান</label><input class="input" id="sFull" inputmode="numeric" value="' + bn(s.fullMark) + '"></div>' +
        '<div class="field"><label>পাস নম্বর (%)</label><input class="input" id="sPass" inputmode="numeric" value="' + bn(s.passMark) + '"></div></div>' +
        '<label class="check" style="margin:6px 0 4px"><input type="checkbox" id="sOpen"' + (s.entryOpen ? ' checked' : '') + '> পরীক্ষকরা নম্বর দিতে পারবেন (বন্ধ করলে শুধু এডমিন পারবেন)</label></div></div>' +
        '<div class="card"><div class="card-head"><h3>গ্রেড পদ্ধতি</h3><button class="btn btn-ghost btn-sm" data-addg>' + ic('plus') + ' গ্রেড</button></div><div class="card-pad"><div class="tips" style="margin:0 0 10px">গড় শতকরা নম্বর অনুযায়ী গ্রেড। কোনো বিষয়ে পাস নম্বরের নিচে পেলে বা অনুপস্থিত থাকলে "রাসিব" (অকৃতকার্য)।</div><div class="grade-rows" id="gradeRows"></div></div></div>' +
        '<div class="card"><div class="card-head"><h3>ফলাফল প্রকাশ ও SMS</h3></div><div class="card-pad">' +
        '<label class="check" style="margin-bottom:12px"><input type="checkbox" id="sPub"' + (s.published ? ' checked' : '') + '> ফলাফল প্রকাশিত (অভিভাবকরা মার্কশিট লিংক খুলতে পারবেন)</label>' +
        '<div class="field"><label>SMS API লিংক (আপনার SMS কোম্পানির দেওয়া)</label><textarea class="input" id="sSms" rows="3" placeholder="https://api.sms.net.bd/sendsms?api_key=আপনার_API_KEY&msg={message}&to={number}">' + esc(s.smsUrl || '') + '</textarea></div>' +
        '<div class="tips" style="margin:-6px 0 12px">লিংকে নম্বরের জায়গায় <b>{number}</b> (8801XXXXXXXXX) বা <b>{number11}</b> (01XXXXXXXXX), আর বার্তার জায়গায় <b>{message}</b> লিখুন। API key শুধু এডমিন দেখতে পান।</div>' +
        '<div style="display:flex;gap:8px"><input class="input" id="sTestNo" inputmode="tel" placeholder="পরীক্ষার জন্য নিজের নম্বর"><button class="btn btn-ghost" data-test>পরীক্ষামূলক SMS</button></div>' +
        '</div></div>' +
        '</div><div style="margin:16px 0"><button class="btn btn-primary" data-save>' + ic('save') + ' সেটিংস সংরক্ষণ</button></div>' +
        '<div class="card"><div class="card-head"><h3>ব্যাকআপ ও পুনরুদ্ধার</h3></div><div class="card-pad toolbar">' +
        '<button class="btn btn-ghost" data-bk>' + ic('download') + ' পুরো ডেটার ব্যাকআপ নামান</button>' +
        '<label class="btn btn-ghost">' + ic('upload') + ' ব্যাকআপ থেকে ফিরিয়ে আনুন<input type="file" accept=".json" id="rsFile" hidden></label>' +
        (DEMO ? '<button class="btn btn-danger" data-reset>ডেমো ডেটা মুছে নতুন করে শুরু</button>' : '') +
        '</div></div>';
      setPage('সেটিংস', html, '#/settings');
      var grades = (s.grades || []).slice().sort(function (a, b) { return b.min - a.min; });
      function drawG() {
        $('#gradeRows').innerHTML = grades.map(function (g, i) {
          return '<div class="grade-row"><input class="input" data-gmin="' + i + '" value="' + bn(g.min) + '" title="সর্বনিম্ন %"><input class="input" data-gname="' + i + '" value="' + esc(g.name) + '"><button class="btn btn-danger btn-sm" data-gdel="' + i + '">' + ic('trash') + '</button></div>';
        }).join('') + '<div class="grade-row"><input class="input" disabled value="এর নিচে"><input class="input" disabled value="রাসিব"><span></span></div>';
        $$('[data-gmin]').forEach(function (x) { x.oninput = function () { grades[+x.getAttribute('data-gmin')].min = +en(x.value) || 0; }; });
        $$('[data-gname]').forEach(function (x) { x.oninput = function () { grades[+x.getAttribute('data-gname')].name = x.value; }; });
        $$('[data-gdel]').forEach(function (x) { x.onclick = function () { grades.splice(+x.getAttribute('data-gdel'), 1); drawG(); }; });
      }
      drawG();
      $('[data-addg]').onclick = function () { grades.push({ min: 0, name: '' }); drawG(); };
      $('[data-save]').onclick = function () {
        var ns = { institution: $('#sInst').value.trim(), address: $('#sAddr').value.trim(), examTitle: $('#sExam').value.trim(),
          fullMark: +en($('#sFull').value) || 100, passMark: +en($('#sPass').value) || 0, entryOpen: $('#sOpen').checked,
          published: $('#sPub').checked, smsUrl: $('#sSms').value.trim(),
          grades: grades.filter(function (g) { return g.name.trim(); }) };
        api('saveSettings', { settings: ns }).then(function (d) { S.settings = d.settings; toast('সেটিংস সংরক্ষিত হয়েছে', 'ok'); S.shell = false; boot(); }).catch(function (e) { toast(e.message, 'err'); });
      };
      $('[data-bk]').onclick = function () {
        api('backup').then(function (d) {
          var blob = new Blob([JSON.stringify(d.backup)], { type: 'application/json' });
          download(blob, 'পরীক্ষা_ব্যাকআপ_' + new Date().toISOString().slice(0, 10) + '.json');
        }).catch(function (e) { toast(e.message, 'err'); });
      };
      $('#rsFile').onchange = function (e) {
        var f = e.target.files[0]; if (!f) return;
        var rd = new FileReader();
        rd.onload = function () {
          var b; try { b = JSON.parse(rd.result); } catch (er) { return toast('ফাইলটি পড়া যাচ্ছে না', 'err'); }
          confirmBox('ব্যাকআপ থেকে ফিরিয়ে আনবেন?', 'বর্তমান সব ডেটা ব্যাকআপের ডেটা দিয়ে বদলে যাবে।', 'হ্যাঁ, ফিরিয়ে আনুন', true).then(function (ok) {
            if (ok) api('restore', { backup: b }).then(function () { toast('পুনরুদ্ধার হয়েছে', 'ok'); S.shell = false; boot(); }).catch(function (er) { toast(er.message, 'err'); });
          });
        };
        rd.readAsText(f);
      };
      $('[data-test]').onclick = function () {
        var no = $('#sTestNo').value;
        if (!no) return toast('নিজের মোবাইল নম্বর দিন', 'err');
        var urlNow = $('#sSms').value.trim();
        (urlNow !== (S.settings.smsUrl || '') ? api('saveSettings', { settings: { smsUrl: urlNow } }).then(function (d) { S.settings = d.settings; }) : Promise.resolve())
          .then(function () { loading(true); return api('sendSms', { items: [{ reg: '', phone: no, message: S.settings.institution + ': পরীক্ষামূলক SMS। আলহামদুলিল্লাহ, ঠিকমতো কাজ করছে।', test: true }] }); })
          .then(function (d) { loading(false); var r = d.results[0]; modal({ title: r.ok ? 'SMS পাঠানো হয়েছে ✓' : 'SMS যায়নি', body: '<p>SMS কোম্পানির উত্তর:</p><pre style="white-space:pre-wrap;background:#f6f6f2;padding:10px;border-radius:8px">' + esc(r.detail) + '</pre>' + (r.ok ? '<p>ফোনে SMS এসেছে কি না দেখে নিন।</p>' : '<p>API লিংক, API key আর Sender ID ঠিক আছে কি না দেখুন, আর অ্যাকাউন্টে ব্যালেন্স আছে কি না।</p>') }); })
          .catch(function (e) { loading(false); toast(e.message, 'err'); });
      };
      var rs = $('[data-reset]'); if (rs) rs.onclick = function () { confirmBox('ডেমো রিসেট?', 'ডেমোর সব নম্বর ও পরিবর্তন মুছে যাবে।', 'রিসেট', true).then(function (ok) { if (ok) { DemoStore.reset(); localStorage.removeItem('asm_token'); location.hash = ''; location.reload(); } }); };
    }
  };

  // ============ Logs ============
  var Logs = {
    open: function () {
      pageLoading('কার্যক্রম', '#/logs');
      api('logs', { limit: 500 }).then(function (d) {
        setPage('কার্যক্রম', '<div class="card"><div class="card-head"><h3>সাম্প্রতিক ' + bn(d.logs.length) + 'টি কার্যক্রম</h3></div><ul class="log-list">' + (d.logs.map(logItem).join('') || '<li class="empty">কিছু নেই</li>') + '</ul></div>', '#/logs');
      }).catch(function (e) { toast(e.message, 'err'); });
    }
  };

  // ============ Live (রিয়েল-টাইম) ============
  var Live = {
    last: null, busy: false, fails: 0,
    start: function () {
      setInterval(function () { if (!RT.B || Date.now() - (Live.lastTick || 0) > 55000) Live.tick(); }, 10000);
      setTimeout(Live.tick, 1500);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) Live.tick(); });
      window.addEventListener('online', Live.tick);
    },
    chip: function (ok) { var c = $('#liveChip'); if (c) { c.classList.toggle('off', !ok); c.lastChild.textContent = ok ? 'লাইভ' : 'অফলাইন'; } },
    tick: function () {
      if (Live.busy || document.hidden || !S.token || !S.shell || location.hash.indexOf('#/m/') === 0) return;
      if ($('.modal-bg')) return;
      Live.busy = true; Live.lastTick = Date.now();
      api('rev').then(function (d) {
        Live.busy = false; if (!RT.B) Live.chip(true);
        if (Live.last !== null && d.rev !== Live.last) Live.refresh();
        Live.last = d.rev;
      }).catch(function () { Live.busy = false; Live.chip(false); });
    },
    refreshSoon: function () { clearTimeout(Live.rt); Live.rt = setTimeout(Live.refresh, 500); },
    refresh: function () {
      var h = location.hash.replace(/^#\/?/, '').split('/')[0];
      if (h === 'g') { Entry.sync(); return; }
      if (['', 'groups', 'results', 'r', 'merit', 'logs', 'messages'].indexOf(h) < 0) return;
      if (h === 'messages') { if (!$('.modal-bg')) Messages.load(); return; }
      var a = document.activeElement; if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
      S.silent = true; route(); setTimeout(function () { S.silent = false; }, 3000);
    }
  };
  Entry.sync = function () {
    if (!Entry.active) return;
    var gid = Entry.gid;
    api('getGroup', { gid: gid }).then(function (d) {
      if (!Entry.active || Entry.gid !== gid) return;
      var structural = d.students.length !== Entry.students.length || d.summary.state !== Entry.sum.state;
      if (structural && !Entry.dirtyCount()) { S.silent = true; Entry.open(gid); setTimeout(function () { S.silent = false; }, 3000); return; }
      var changed = 0;
      Entry.students.forEach(function (st, i) {
        if (!d.marks[st.reg]) return;
        Entry.sum.subjects.forEach(function (sub, j) {
          var v = d.marks[st.reg][sub];
          if (v === Entry.server[st.reg][sub]) return;
          Entry.server[st.reg][sub] = v;
          var k = Entry.key(st.reg, sub);
          if (Entry.dirty[k] || Entry.bad[k]) { if (Entry.local[st.reg][sub] === v) delete Entry.dirty[k]; return; }
          Entry.local[st.reg][sub] = v; changed++;
          var inp = $('.mk[data-r="' + i + '"][data-c="' + j + '"]');
          if (inp && inp !== document.activeElement) { inp.value = showMark(v); inp.classList.toggle('abs', v === 'A'); inp.classList.toggle('low', Entry.isLow(v)); inp.classList.remove('flash'); void inp.offsetWidth; inp.classList.add('flash'); }
          $$('[data-total="' + i + '"]').forEach(function (x) { x.textContent = Entry.totalText(st.reg); });
        });
      });
      Entry.sum.progress = d.summary.progress;
      var pw = $('#progWrap'); if (pw) pw.innerHTML = progressBar(d.summary.progress, Entry.sum.state === 'submitted');
      if (changed) toast(bn(changed) + 'টি নম্বর অন্য কেউ হালনাগাদ করেছেন');
      Entry.updateState();
    }).catch(function () { });
  };

  // ============ অভিভাবকের মোবাইল নম্বর ============
  var Phones = {
    open: function (branch, group) {
      var list = (Students.list || []).filter(function (s) { return (!branch || s.branch === branch) && (!group || s.group === group); });
      var has = list.filter(function (s) { return s.phone; }).length;
      var rows = list.map(function (s, i) {
        return '<tr><td>' + bn(i + 1) + '</td><td><b>' + esc(s.name) + '</b><small>' + esc(s.reg) + ' · ' + esc(s.group) + '</small></td><td><input class="input ph-in" data-reg="' + esc(s.reg) + '" inputmode="tel" placeholder="01XXXXXXXXX" value="' + esc(s.phone || '') + '" style="max-width:170px"></td></tr>';
      }).join('');
      var m = modal({ title: 'অভিভাবকের মোবাইল নম্বর', wide: true,
        body: '<div class="toolbar-line" style="margin-bottom:10px"><span class="grow" style="color:var(--muted)">' + (group ? esc(group) : branch ? esc(branch) : 'সব শিক্ষার্থী') + ' · ' + bn(list.length) + ' জন, নম্বর আছে ' + bn(has) + ' জনের। উপরের ফিল্টার দিয়ে গ্রুপ বেছে নিলে এখানে শুধু সেই গ্রুপ আসবে।</span>' +
          '<label class="btn btn-ghost btn-sm">' + ic('upload') + ' Excel থেকে আনুন<input type="file" id="phFile" accept=".xlsx,.xls,.csv" hidden></label></div>' +
          '<div class="tips" style="margin:0 0 10px">Excel-এ "রেজি নং" আর "অভিভাবকের মোবাইল" কলাম থাকলেই হবে। শিক্ষার্থী পাতার Excel বোতাম দিয়ে নামানো ফাইলে নম্বর লিখে এখানে তুলে দিন।</div>' +
          '<div class="tbl-wrap" style="max-height:55vh"><table class="tbl"><thead><tr><th>ক্রম</th><th>শিক্ষার্থী</th><th>মোবাইল</th></tr></thead><tbody>' + rows + '</tbody></table></div>',
        foot: '<button class="btn btn-ghost" data-x>বাতিল</button><button class="btn btn-primary" data-ok>' + ic('save') + ' সংরক্ষণ</button>' });
      $$('.ph-in', m.el).forEach(function (inp, i, all) {
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); if (all[i + 1]) all[i + 1].focus(); } });
        inp.addEventListener('blur', function () { var v = en(inp.value).replace(/\D/g, ''); inp.classList.toggle('bad', !!v && !/^(88)?01[3-9]\d{8}$/.test(v)); });
      });
      $('[data-ok]', m.el).onclick = function () {
        var entries = $$('.ph-in', m.el).map(function (x) { return { reg: x.getAttribute('data-reg'), phone: x.value }; });
        Phones.save(entries, function () { m.close(); });
      };
      $('#phFile', m.el).onchange = function (e) { Phones.importFile(e.target.files[0], function () { m.close(); }); };
    },
    save: function (entries, done) {
      loading(true);
      api('savePhones', { entries: entries }).then(function (d) {
        loading(false);
        toast(bn(d.saved) + 'টি নম্বর সংরক্ষিত হয়েছে', 'ok');
        if (d.bad.length) toast(bn(d.bad.length) + 'টি নম্বর ভুল ছিল, বাদ গেছে: ' + d.bad.slice(0, 5).join(', '), 'err');
        if (done) done();
        if (location.hash.indexOf('students') >= 0) Students.open(); else if (location.hash.indexOf('messages') >= 0) Messages.load();
      }).catch(function (e) { loading(false); toast(e.message, 'err'); });
    },
    importFile: function (f, done) {
      if (!f) return;
      loading(true);
      loadXlsx().then(function () {
        var rd = new FileReader();
        rd.onload = function () {
          try {
            var wb = XLSX.read(new Uint8Array(rd.result), { type: 'array' });
            var entries = [];
            wb.SheetNames.forEach(function (n) {
              XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: '' }).forEach(function (r) {
                var keys = Object.keys(r);
                var kr = keys.filter(function (k) { return /রেজি|reg/i.test(k); })[0];
                var kp = keys.filter(function (k) { return /মোবাইল|ফোন|phone|mobile|contact/i.test(k); })[0];
                if (kr && kp && String(r[kp]).trim()) entries.push({ reg: String(r[kr]).trim(), phone: String(r[kp]) });
              });
            });
            loading(false);
            if (!entries.length) return toast('ফাইলে "রেজি" আর "মোবাইল" কলাম পাওয়া যায়নি', 'err');
            Phones.save(entries, done);
          } catch (e) { loading(false); toast('ফাইলটি পড়া যায়নি', 'err'); }
        };
        rd.readAsArrayBuffer(f);
      }).catch(function () { loading(false); toast('Excel পড়ার ব্যবস্থা লোড হয়নি, ইন্টারনেট দেখুন', 'err'); });
    }
  };

  // ============ অভিভাবককে বার্তা ============
  var PLACEHOLDERS = ['নাম', 'পিতা', 'রেজি', 'গ্রুপ', 'মোট', 'গড়', 'গ্রেড', 'মেধা', 'ফলাফল', 'বিষয়ভিত্তিক', 'লিংক', 'প্রতিষ্ঠান', 'পরীক্ষা'];
  function sheetLink(r) { return location.href.split('#')[0] + '#/m/' + encodeURIComponent(r.reg) + '/' + r.code; }
  function fillTemplate(tpl, r, R, st) {
    var subj = R.subjects.map(function (s) { return '• ' + s + ': ' + (r.marks[s] === '' ? '—' : showMark(r.marks[s])); }).join('\n');
    var v = { 'নাম': r.name, 'পিতা': r.father, 'রেজি': r.reg, 'গ্রুপ': R.group, 'মোট': bn(r.total) + '/' + bn(st.fullMark * R.subjects.length),
      'গড়': bn(r.avg), 'গ্রেড': r.grade, 'মেধা': r.rank ? bn(r.rank) : '—', 'ফলাফল': r.result, 'বিষয়ভিত্তিক': subj, 'লিংক': sheetLink(r),
      'প্রতিষ্ঠান': st.institution, 'পরীক্ষা': st.examTitle };
    return String(tpl || '').replace(/\{([^}]+)\}/g, function (m0, k) { return v.hasOwnProperty(k) ? v[k] : m0; });
  }
  function smsParts(t) { var uni = /[^\x00-\x7F]/.test(t), n = t.length; return uni ? (n <= 70 ? 1 : Math.ceil(n / 67)) : (n <= 160 ? 1 : Math.ceil(n / 153)); }
  function waNumber(p) { p = en(p).replace(/\D/g, ''); if (p.indexOf('01') === 0) p = '88' + p; return p; }

  var Messages = {
    gid: '*', filter: 'all', q: '', tab: 'wa', sel: {},
    open: function () {
      pageLoading('অভিভাবককে পাঠান', '#/messages');
      Messages.load();
    },
    load: function () {
      return api('messageData', { gid: '*' }).then(function (d) {
        Messages.data = d; S.settings = Object.assign(S.settings, d.settings);
        Messages.render();
      }).catch(function (e) { toast(e.message, 'err'); });
    },
    rows: function () {
      var out = [];
      Messages.data.groups.forEach(function (R) {
        if (Messages.gid !== '*' && R.gid !== Messages.gid) return;
        R.rows.forEach(function (r) { out.push({ r: r, R: R }); });
      });
      var f = Messages.filter, q = Messages.q;
      return out.filter(function (x) {
        var r = x.r;
        if (q && (r.name + ' ' + r.reg + ' ' + (r.phone || '')).toLowerCase().indexOf(q) < 0) return false;
        if (f === 'phone') return !!r.phone;
        if (f === 'nophone') return !r.phone;
        if (f === 'nowa') return r.phone && !r.sent.wa;
        if (f === 'nosms') return r.phone && !(r.sent.sms && r.sent.sms.status === 'sent');
        if (f === 'done') return r.complete;
        return true;
      });
    },
    render: function () {
      var d = Messages.data, st = S.settings, all = [];
      d.groups.forEach(function (R) { R.rows.forEach(function (r) { all.push(r); }); });
      var withPhone = all.filter(function (r) { return r.phone; }).length;
      var waSent = all.filter(function (r) { return r.sent.wa; }).length;
      var smsSent = all.filter(function (r) { return r.sent.sms && r.sent.sms.status === 'sent'; }).length;
      var html = '<div class="grid stats">' +
        stat('মোবাইল নম্বর আছে', bn(withPhone) + '/' + bn(all.length), 'users', '', withPhone < all.length ? bn(all.length - withPhone) + ' জনের নম্বর বাকি' : 'সবার আছে') +
        stat('WhatsApp পাঠানো', bn(waSent), 'wa', 'gold') + stat('SMS পাঠানো', bn(smsSent), 'send') +
        '<div class="card stat gold"><span class="ic">' + ic('eye') + '</span><div class="k">অনলাইন মার্কশিট</div><div class="v" style="font-size:20px;margin-top:8px">' + (st.published ? '<span class="chip open">প্রকাশিত</span>' : '<span class="chip fail">প্রকাশিত হয়নি</span>') + '</div><button class="btn btn-sm ' + (st.published ? 'btn-ghost' : 'btn-gold') + '" data-pub style="margin-top:8px">' + (st.published ? 'প্রকাশ বন্ধ করুন' : 'এখন প্রকাশ করুন') + '</button></div></div>';
      if (!st.published) html += '<div class="card card-pad" style="border-left:4px solid var(--gold);margin-bottom:14px">ফলাফল প্রকাশ না করলে অভিভাবকরা মার্কশিট লিংক খুলতে পারবেন না। সব নম্বর চূড়ান্ত হলে "এখন প্রকাশ করুন" চাপুন।</div>';
      if (!st.smsUrl) html += '<div class="card card-pad" style="border-left:4px solid var(--line);margin-bottom:14px;color:var(--muted)">SMS পাঠাতে সেটিংসে আপনার SMS কোম্পানির API লিংক বসাতে হবে। WhatsApp এখনই পাঠানো যাবে, কোনো খরচ ছাড়া। <a href="#/settings">সেটিংস</a></div>';
      // template editor
      html += '<div class="card" style="margin-bottom:16px"><div class="card-head"><h3>বার্তার নমুনা</h3><div class="view-toggle"><button data-tab="wa" class="' + (Messages.tab === 'wa' ? 'on' : '') + '">' + ic('wa') + ' WhatsApp</button><button data-tab="sms" class="' + (Messages.tab === 'sms' ? 'on' : '') + '">' + ic('send') + ' SMS</button></div></div>' +
        '<div class="card-pad grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px" id="tplGrid"><div><textarea class="input" id="tpl" rows="9">' + esc(Messages.tab === 'wa' ? st.waTemplate : st.smsTemplate) + '</textarea>' +
        '<div class="ph-chips">' + PLACEHOLDERS.map(function (p) { return '<button class="chip pending" data-ph="' + p + '">{' + p + '}</button>'; }).join('') + '</div>' +
        '<button class="btn btn-ghost btn-sm" data-savetpl style="margin-top:8px">' + ic('save') + ' নমুনা সংরক্ষণ</button></div>' +
        '<div><div class="pct" style="margin-bottom:6px">প্রিভিউ (প্রথম শিক্ষার্থী) <span id="partInfo"></span></div><div class="wa-bubble" id="tplPrev"></div></div></div></div>';
      // list
      var groupsOpt = '<option value="*">সব গ্রুপ</option>' + d.groups.map(function (R) { return '<option value="' + esc(R.gid) + '"' + (R.gid === Messages.gid ? ' selected' : '') + '>' + esc(R.group) + (R.branch !== 'সাধারণ শাখা' ? ' (' + esc(R.branch) + ')' : '') + '</option>'; }).join('');
      var fl = [['all', 'সবাই'], ['phone', 'মোবাইল আছে'], ['nophone', 'মোবাইল নেই'], ['nowa', 'WhatsApp যায়নি'], ['nosms', 'SMS যায়নি'], ['done', 'ফলাফল সম্পূর্ণ']];
      html += '<div class="toolbar-line"><select class="input" id="mg" style="width:auto">' + groupsOpt + '</select><select class="input" id="mf" style="width:auto">' + fl.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === Messages.filter ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>' +
        '<div class="search grow">' + ic('search') + '<input class="input" id="mq" placeholder="নাম, রেজি বা মোবাইল…" value="' + esc(Messages.q) + '"></div>' +
        '<button class="btn btn-ghost" data-phones>' + ic('edit') + ' মোবাইল নম্বর</button></div>' +
        '<div class="bulk-bar card" id="bulkBar"></div>' +
        '<div class="card tbl-wrap"><table class="tbl"><thead><tr><th class="c"><input type="checkbox" id="selAll"></th><th>শিক্ষার্থী</th><th>মোবাইল</th><th>ফলাফল</th><th class="c">WhatsApp</th><th class="c">SMS</th><th></th></tr></thead><tbody id="mbody"></tbody></table></div>';
      setPage('অভিভাবককে পাঠান', html, '#/messages');
      if (window.innerWidth < 900) $('#tplGrid').style.gridTemplateColumns = '1fr';
      Messages.drawList(); Messages.preview();
      $$('[data-tab]').forEach(function (b) { b.onclick = function () { Messages.saveTplLocal(); Messages.tab = b.getAttribute('data-tab'); Messages.render(); }; });
      $('#tpl').oninput = function () { Messages.saveTplLocal(); Messages.preview(); };
      $$('[data-ph]').forEach(function (b) { b.onclick = function () { var t = $('#tpl'), p = t.selectionStart || t.value.length; t.value = t.value.slice(0, p) + '{' + b.getAttribute('data-ph') + '}' + t.value.slice(p); t.focus(); Messages.saveTplLocal(); Messages.preview(); }; });
      $('[data-savetpl]').onclick = function () { api('saveSettings', { settings: { waTemplate: st.waTemplate, smsTemplate: st.smsTemplate } }).then(function () { toast('নমুনা সংরক্ষিত হয়েছে', 'ok'); }).catch(function (e) { toast(e.message, 'err'); }); };
      $('[data-pub]').onclick = function () {
        var to = !st.published;
        confirmBox(to ? 'ফলাফল প্রকাশ করবেন?' : 'প্রকাশ বন্ধ করবেন?', to ? 'অভিভাবকরা লিংক দিয়ে নিজের সন্তানের মার্কশিট দেখতে পারবেন। প্রত্যেক লিংক আলাদা ও গোপন।' : 'মার্কশিট লিংকগুলো আর খুলবে না।').then(function (ok) {
          if (ok) api('saveSettings', { settings: { published: to } }).then(function (dd) { S.settings = dd.settings; toast(to ? 'ফলাফল প্রকাশিত হয়েছে' : 'প্রকাশ বন্ধ হয়েছে', 'ok'); Messages.render(); }).catch(function (e) { toast(e.message, 'err'); });
        });
      };
      $('#mg').onchange = function (e) { Messages.gid = e.target.value; Messages.sel = {}; Messages.drawList(); Messages.preview(); };
      $('#mf').onchange = function (e) { Messages.filter = e.target.value; Messages.sel = {}; Messages.drawList(); };
      $('#mq').oninput = function (e) { Messages.q = e.target.value.trim().toLowerCase(); Messages.drawList(); };
      $('[data-phones]').onclick = function () {
        api('listStudents').then(function (dd) {
          Students.list = dd.students;
          var R = Messages.data.groups.filter(function (x) { return x.gid === Messages.gid; })[0];
          Phones.open(R ? R.branch : '', R ? R.group : '');
        });
      };
    },
    saveTplLocal: function () { var t = $('#tpl'); if (!t) return; if (Messages.tab === 'wa') S.settings.waTemplate = t.value; else S.settings.smsTemplate = t.value; },
    tpl: function (ch) { return ch === 'sms' ? S.settings.smsTemplate : S.settings.waTemplate; },
    preview: function () {
      var rows = Messages.rows(), x = rows[0] || null, el = $('#tplPrev'); if (!el) return;
      if (!x) { el.textContent = '—'; return; }
      var t = fillTemplate(Messages.tpl(Messages.tab), x.r, x.R, S.settings);
      el.innerHTML = esc(t).replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
      $('#partInfo').textContent = Messages.tab === 'sms' ? '· ' + bn(t.length) + ' অক্ষর, প্রতিজনে ' + bn(smsParts(t)) + 'টি SMS' : '';
    },
    drawList: function () {
      var rows = Messages.rows();
      Messages.cur = rows;
      $('#mbody').innerHTML = rows.map(function (x, i) {
        var r = x.r, s = r.sent, sms = s.sms;
        return '<tr data-i="' + i + '"><td class="c"><input type="checkbox" class="msel" data-i="' + i + '"' + (Messages.sel[r.reg] ? ' checked' : '') + (r.phone ? '' : ' disabled') + '></td>' +
          '<td><b>' + esc(r.name) + '</b><small>' + esc(r.reg) + ' · ' + esc(x.R.group) + '</small></td>' +
          '<td>' + (r.phone ? bn(r.phone) : '<span style="color:var(--red);font-size:14px">নেই</span>') + '</td>' +
          '<td>' + (r.complete ? bn(r.total) + ' · ' + esc(r.grade) + (r.rank ? ' · মেধা ' + bn(r.rank) : '') : '<span class="chip pending">অসম্পূর্ণ</span>') + '</td>' +
          '<td class="c">' + (s.wa ? '<span class="chip open" title="' + esc(fmtTime(s.wa.at)) + '">' + ic('check') + ' গেছে</span>' : '—') + '</td>' +
          '<td class="c">' + (sms ? '<span class="chip ' + (sms.status === 'sent' ? 'open' : 'fail') + '" title="' + esc(sms.detail) + '">' + (sms.status === 'sent' ? ic('check') + ' গেছে' : 'ব্যর্থ') + '</span>' : '—') + '</td>' +
          '<td style="white-space:nowrap">' + (r.phone ? '<button class="btn btn-sm btn-wa" data-wa="' + i + '" title="WhatsApp">' + ic('wa') + '</button> <button class="btn btn-ghost btn-sm" data-sms="' + i + '" title="SMS">' + ic('send') + '</button> ' : '') +
          '<a class="btn btn-ghost btn-sm" target="_blank" href="' + esc(sheetLink(r)) + '" title="মার্কশিট লিংক">' + ic('eye') + '</a></td></tr>';
      }).join('') || '<tr><td colspan="7" class="empty">কেউ নেই</td></tr>';
      $$('.msel').forEach(function (c) { c.onchange = function () { var r = rows[+c.getAttribute('data-i')].r; if (c.checked) Messages.sel[r.reg] = 1; else delete Messages.sel[r.reg]; Messages.bar(); }; });
      $('#selAll').onchange = function (e) { rows.forEach(function (x) { if (x.r.phone) { if (e.target.checked) Messages.sel[x.r.reg] = 1; else delete Messages.sel[x.r.reg]; } }); Messages.drawList(); };
      $$('[data-wa]').forEach(function (b) { b.onclick = function () { Messages.sendWa(rows[+b.getAttribute('data-wa')]); }; });
      $$('[data-sms]').forEach(function (b) { b.onclick = function () { Messages.bulkSms([rows[+b.getAttribute('data-sms')]]); }; });
      Messages.bar();
    },
    selected: function () { return (Messages.cur || []).filter(function (x) { return Messages.sel[x.r.reg] && x.r.phone; }); },
    bar: function () {
      var n = Messages.selected().length, el = $('#bulkBar');
      el.innerHTML = '<span><b>' + bn(n) + '</b> জন নির্বাচিত</span><span class="grow"></span>' +
        '<button class="btn btn-wa" data-bwa ' + (n ? '' : 'disabled') + '>' + ic('wa') + ' WhatsApp একে একে</button>' +
        '<button class="btn btn-primary" data-bsms ' + (n ? '' : 'disabled') + '>' + ic('send') + ' সবাইকে SMS</button>' +
        '<button class="btn btn-ghost" data-bcopy ' + (n ? '' : 'disabled') + '>' + ic('download') + ' তালিকা (Excel)</button>';
      $('[data-bwa]').onclick = function () { Messages.waQueue(Messages.selected()); };
      $('[data-bsms]').onclick = function () { Messages.bulkSms(Messages.selected()); };
      $('[data-bcopy]').onclick = function () {
        xlsx([{ name: 'বার্তা', rows: Messages.selected().map(function (x) { return { 'রেজি নং': x.r.reg, 'নাম': x.r.name, 'মোবাইল': x.r.phone, 'বার্তা': fillTemplate(Messages.tpl(Messages.tab), x.r, x.R, S.settings) }; }) }], 'অভিভাবক_বার্তা');
      };
    },
    checkPub: function () {
      if (S.settings.published) return Promise.resolve(true);
      return confirmBox('ফলাফল এখনো প্রকাশিত হয়নি', 'এখন পাঠালে অভিভাবকরা মার্কশিট লিংক খুলতে পারবেন না। তবুও পাঠাবেন?', 'হ্যাঁ, পাঠান');
    },
    sendWa: function (x) {
      var text = fillTemplate(S.settings.waTemplate, x.r, x.R, S.settings);
      window.open('https://wa.me/' + waNumber(x.r.phone) + '?text=' + encodeURIComponent(text), '_blank');
      x.r.sent.wa = { status: 'sent', at: new Date().toISOString() };
      api('logMessage', { items: [{ reg: x.r.reg, channel: 'wa', status: 'sent' }] }).catch(function () { });
      Messages.drawList();
    },
    waQueue: function (list) {
      Messages.checkPub().then(function (ok) {
        if (!ok || !list.length) return;
        var i = 0;
        var m = modal({ title: 'WhatsApp-এ একে একে পাঠান', body: '<div id="wq"></div>', foot: '<button class="btn btn-ghost" data-x>বন্ধ</button><button class="btn btn-ghost" data-skip>বাদ দিন</button><button class="btn btn-wa" data-go>' + ic('wa') + ' খুলুন ও পরেরটা</button>', onClose: function () { Messages.drawList(); } });
        function show() {
          if (i >= list.length) { $('#wq', m.el).innerHTML = '<div class="empty">' + ic('check') + '<br>সবাইকে পাঠানো শেষ। জাযাকাল্লাহু খাইরান।</div>'; $('[data-go]', m.el).remove(); $('[data-skip]', m.el).remove(); return; }
          var x = list[i], t = fillTemplate(S.settings.waTemplate, x.r, x.R, S.settings);
          $('#wq', m.el).innerHTML = '<div class="pct" style="margin-bottom:8px">' + bn(i + 1) + ' / ' + bn(list.length) + '</div><div class="bar" style="margin-bottom:12px"><i style="width:' + Math.round(i * 100 / list.length) + '%"></i></div>' +
            '<div style="font-size:18px;font-weight:700;color:var(--green)">' + esc(x.r.name) + '</div><div class="pct" style="margin-bottom:10px">' + bn(x.r.phone) + (x.r.sent.wa ? ' · <span style="color:var(--gold)">আগে একবার পাঠানো হয়েছে</span>' : '') + '</div>' +
            '<div class="wa-bubble" style="max-height:240px;overflow:auto">' + esc(t).replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/\n/g, '<br>') + '</div>' +
            '<div class="tips">WhatsApp খুললে সেখানে শুধু Send চাপুন, তারপর এই পাতায় ফিরে আসুন।</div>';
        }
        show();
        $('[data-go]', m.el).onclick = function () { Messages.sendWa(list[i]); i++; show(); };
        $('[data-skip]', m.el).onclick = function () { i++; show(); };
      });
    },
    bulkSms: function (list) {
      if (!S.settings.smsUrl) return toast('আগে সেটিংসে SMS API লিংক বসান', 'err');
      if (!list.length) return;
      var texts = list.map(function (x) { return fillTemplate(S.settings.smsTemplate, x.r, x.R, S.settings); });
      var parts = texts.reduce(function (a, t) { return a + smsParts(t); }, 0);
      Messages.checkPub().then(function (ok) {
        if (!ok) return;
        return confirmBox('SMS পাঠাবেন?', '<p><b>' + bn(list.length) + '</b> জন অভিভাবককে SMS যাবে।</p><p>মোট খরচ হবে প্রায় <b>' + bn(parts) + '</b>টি SMS-এর সমান (বাংলায় ৬৭ অক্ষরে ১টি SMS ধরা হয়)।</p>', 'হ্যাঁ, পাঠান').then(function (ok2) {
          if (!ok2) return;
          var m = modal({ title: 'SMS পাঠানো হচ্ছে…', body: '<div class="bar" style="margin-bottom:10px"><i id="smsBar" style="width:0%"></i></div><div id="smsTxt" class="pct">শুরু হচ্ছে…</div>' });
          var done = 0, okN = 0, fails = [], B = 10;
          function next() {
            if (done >= list.length) {
              $('#smsTxt', m.el).innerHTML = '<b style="color:var(--green)">শেষ: ' + bn(okN) + ' জনের কাছে গেছে</b>' + (fails.length ? '<br><span style="color:var(--red)">' + bn(fails.length) + ' জনের কাছে যায়নি।</span><pre style="white-space:pre-wrap;font-size:12px;background:#f6f6f2;padding:8px;border-radius:8px;max-height:160px;overflow:auto">' + esc(fails.slice(0, 10).join('\n')) + '</pre>' : '');
              $('.modal-h h3', m.el).textContent = 'SMS পাঠানো শেষ';
              Messages.load();
              return;
            }
            var chunk = list.slice(done, done + B);
            api('sendSms', { items: chunk.map(function (x, k) { return { reg: x.r.reg, phone: x.r.phone, message: texts[done + k] }; }) }).then(function (d) {
              d.results.forEach(function (r) { if (r.ok) okN++; else fails.push(r.reg + ': ' + r.detail); });
              done += chunk.length;
              $('#smsBar', m.el).style.width = Math.round(done * 100 / list.length) + '%';
              $('#smsTxt', m.el).textContent = bn(done) + ' / ' + bn(list.length) + ' পাঠানো হয়েছে…';
              next();
            }).catch(function (e) { $('#smsTxt', m.el).innerHTML = '<span style="color:var(--red)">' + esc(e.message) + '</span>'; Messages.load(); });
          }
          next();
        });
      });
    }
  };

  // ============ অভিভাবকের জন্য মার্কশিট (লগইন ছাড়া) ============
  var PublicSheet = {
    open: function (reg, code) {
      root.innerHTML = '<div class="pub-wrap pattern-bg"><div class="spin" style="border-color:rgba(255,255,255,.2);border-top-color:#d9b968"></div></div>';
      try { reg = decodeURIComponent(reg || ''); } catch (e) { }
      var req = { action: 'publicMarksheet', reg: reg, code: code || '' };
      var p = DEMO ? sleep(100).then(function () { return core.handle(req); })
        : fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(req), redirect: 'follow' }).then(function (r) { return r.json(); });
      p.then(function (res) {
        if (!res.ok) throw new Error(res.error);
        PublicSheet.render(res.data);
      }).catch(function (e) {
        root.innerHTML = '<div class="pub-wrap pattern-bg"><div class="pub-card" style="text-align:center;padding:40px 26px">' + EMBLEM + '<h2 style="color:var(--green)">মার্কশিট</h2><p style="font-size:17px">' + esc(e.message || 'সার্ভারের সাথে যোগাযোগ হচ্ছে না') + '</p></div></div>';
      });
    },
    render: function (d) {
      var st = d.settings, r = d.row, full = st.fullMark;
      document.title = r.name + ' — মার্কশিট';
      var rows = d.subjects.map(function (s, i) {
        var v = r.marks[s], n = parseFloat(v), low = v === 'A' || (!isNaN(n) && n * 100 / full < st.passMark);
        return '<tr><td class="c">' + bn(i + 1) + '</td><td>' + esc(s) + '</td><td class="num">' + bn(full) + '</td><td class="num"' + (low ? ' style="color:var(--red);font-weight:700"' : '') + '><b>' + (v === '' ? '—' : showMark(v)) + '</b></td></tr>';
      }).join('');
      var ok = r.result === 'কৃতকার্য';
      root.innerHTML = '<div class="pub-wrap pattern-bg"><div class="pub-card">' +
        '<div class="pub-head">' + EMBLEM + '<div class="pi">' + esc(st.institution) + '</div><div class="pa">' + esc(st.address) + '</div><div class="pe">' + esc(st.examTitle) + ' — মার্কশিট</div></div>' +
        '<div class="pub-info"><div><span>শিক্ষার্থীর নাম</span><b>' + esc(r.name) + '</b></div><div><span>পিতার নাম</span><b>' + esc(r.father) + '</b></div>' +
        '<div><span>রেজি নম্বর</span><b>' + esc(r.reg) + '</b></div><div><span>গ্রুপ</span><b>' + esc(d.group) + '</b></div></div>' +
        '<table class="tbl pub-tbl"><thead><tr><th class="c">ক্রম</th><th>বিষয়</th><th class="c">পূর্ণমান</th><th class="c">প্রাপ্ত নম্বর</th></tr></thead><tbody>' + rows +
        '<tr class="tot"><td></td><td><b>সর্বমোট</b></td><td class="num"><b>' + bn(full * d.subjects.length) + '</b></td><td class="num"><b>' + bn(r.total) + '</b></td></tr></tbody></table>' +
        '<div class="pub-boxes"><div><span>গড়</span><b>' + bn(r.avg) + '</b></div><div><span>গ্রেড</span><b>' + esc(r.grade) + '</b></div><div><span>মেধাস্থান</span><b>' + (r.rank ? bn(r.rank) : '—') + '</b><small>' + bn(d.count) + ' জনের মধ্যে</small></div>' +
        '<div class="' + (ok ? 'pass' : 'failr') + '"><span>ফলাফল</span><b>' + esc(r.result) + '</b></div></div>' +
        (ok && r.rank && r.rank <= 3 ? '<div class="pub-congrats">' + ic('star') + ' মাশাআল্লাহ! গ্রুপে ' + bn(r.rank) + 'য় স্থান অর্জন করেছে। আল্লাহ তাআলা কবুল করুন।</div>' : '') +
        '<div class="pub-sign"><span>পরীক্ষা নিয়ন্ত্রক</span><span>পরিচালক</span></div>' +
        '<div class="pub-actions"><button class="btn btn-primary" onclick="window.print()">' + ic('print') + ' প্রিন্ট / PDF</button></div>' +
        '</div><div class="login-foot">' + esc(st.institution) + '</div></div>';
    }
  };

  // ============ রিয়েল-টাইম সংযোগ (Firebase / ডেমোতে ব্রাউজার-ভিত্তিক) ============
  var RT = {
    mode: null, B: null, ok: false, sid: 's' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
    presence: {}, claims: {}, fns: [], started: false, myClaim: null,
    init: function () {
      var fc = CONFIG.FIREBASE;
      if (fc && fc.databaseURL) {
        return loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js')
          .then(function () { return loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js'); })
          .then(function () { RT.B = fbAdapter(fc); RT.mode = 'fb'; })
          .catch(function () { RT.mode = null; toast('রিয়েল-টাইম সংযোগ চালু হয়নি, সাধারণ মোডে চলছে', 'err'); });
      }
      if (DEMO && window.BroadcastChannel) { RT.B = localAdapter(); RT.mode = 'local'; }
      return Promise.resolve();
    },
    start: function () {
      if (!RT.B || RT.started || !S.user) return;
      RT.started = true;
      RT.B.connected(function (c) { RT.ok = c; Live.chip(c); if (c) RT.setPresence({}); });
      RT.B.watch('presence', function (v) { RT.presence = v || {}; RT.emit('presence'); });
      RT.B.watch('claims', function (v) { RT.claims = v || {}; RT.emit('claims'); });
      RT.B.watch('ev', function (v) { if (v && v.sid !== RT.sid) RT.emit('ev', v); });
      window.addEventListener('pagehide', function () { RT.B.remove('presence/' + RT.sid); if (RT.myClaim) RT.B.remove('claims/' + RT.myClaim); });
    },
    stop: function () { if (!RT.B || !RT.started) return; RT.releaseMine(); RT.B.remove('presence/' + RT.sid); },
    on: function (fn) { RT.fns.push(fn); },
    emit: function (kind, data) { RT.fns.forEach(function (f) { try { f(kind, data); } catch (e) { console.error(e); } }); },
    pres: {},
    setPresence: function (extra) {
      if (!RT.B || !S.user) return;
      Object.assign(RT.pres, extra || {});
      var p = Object.assign({ user: S.user.username, name: S.user.name, role: S.user.role, since: RT.pres.since || Date.now(), at: RT.B.now() }, RT.pres);
      RT.pres.since = p.since;
      RT.B.set('presence/' + RT.sid, p);
      RT.B.onDisc('presence/' + RT.sid);
    },
    alive: function (sid) { return !!RT.presence[sid]; },
    claimOf: function (reg) {
      var c = RT.claims[reg];
      if (!c) return null;
      if (c.sid !== RT.sid && !RT.alive(c.sid)) return null;
      return c;
    },
    claim: function (reg, info) {
      if (!RT.B) return Promise.resolve({ ok: true });
      if (RT.myClaim === reg) return Promise.resolve({ ok: true });
      var me = S.user.username, blocked = null;
      return RT.B.tx('claims/' + reg, function (cur) {
        if (cur && cur.user !== me && cur.sid && RT.alive(cur.sid)) { blocked = cur; return; }
        return Object.assign({ user: me, name: S.user.name, sid: RT.sid, at: RT.B.now() }, info);
      }).then(function (r) {
        if (!r.committed) return { ok: false, by: blocked || r.value };
        var prev = RT.myClaim; RT.myClaim = reg;
        RT.B.onDisc('claims/' + reg);
        if (prev && prev !== reg) RT.B.tx('claims/' + prev, function (cur) { if (cur && cur.sid === RT.sid) return null; return cur; });
        RT.setPresence({ gid: info.gid, gname: info.gname, reg: reg, rname: info.rname, claimAt: Date.now() });
        return { ok: true };
      }).catch(function () { return { ok: true }; });
    },
    releaseMine: function () {
      if (!RT.B || !RT.myClaim) return;
      var reg = RT.myClaim; RT.myClaim = null;
      RT.B.tx('claims/' + reg, function (cur) { if (cur && cur.sid === RT.sid) return null; return cur; });
      RT.setPresence({ reg: null, rname: null, claimAt: null });
    },
    push: function (ev) {
      if (!RT.B) return;
      RT.B.set('ev', Object.assign({ sid: RT.sid, user: S.user.username, name: S.user.name, role: S.user.role, t: RT.B.now() }, ev));
    }
  };
  function loadScript(src) {
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }
  function fbAdapter(cfg) {
    var app = firebase.apps.length ? firebase.app() : firebase.initializeApp(cfg);
    var db = app.database(), R = db.ref('asm');
    return {
      watch: function (n, cb) { R.child(n).on('value', function (s) { cb(s.val()); }); },
      set: function (p, v) { return R.child(p).set(v); },
      remove: function (p) { return R.child(p).remove(); },
      tx: function (p, fn) { return R.child(p).transaction(fn, null, false).then(function (r) { return { committed: r.committed, value: r.snapshot.val() }; }); },
      onDisc: function (p) { R.child(p).onDisconnect().remove(); },
      now: function () { return firebase.database.ServerValue.TIMESTAMP; },
      connected: function (cb) { db.ref('.info/connected').on('value', function (s) { cb(!!s.val()); }); }
    };
  }
  function localAdapter() {
    var KEY = 'asm_rt_demo', ch = new BroadcastChannel('asm_rt_demo'), watchers = {}, disc = [];
    function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
    function save(d, top) { localStorage.setItem(KEY, JSON.stringify(d)); ch.postMessage(top); fire(top); }
    function fire(top) { (watchers[top] || []).forEach(function (cb) { cb(load()[top] || null); }); }
    function setAt(p, v) { var d = load(), k = p.split('/'), o = d; for (var i = 0; i < k.length - 1; i++) o = o[k[i]] = o[k[i]] || {}; if (v === null || v === undefined) delete o[k[k.length - 1]]; else o[k[k.length - 1]] = v; save(d, k[0]); }
    function getAt(p) { var o = load(), k = p.split('/'); for (var i = 0; i < k.length; i++) { if (!o) return null; o = o[k[i]]; } return o === undefined ? null : o; }
    ch.onmessage = function (e) { setTimeout(function () { fire(e.data); }, 0); };
    var lastSnap = {};
    window.addEventListener('storage', function (e) {
      if (e.key !== KEY) return;
      var d = load();
      Object.keys(watchers).forEach(function (top) { var j = JSON.stringify(d[top] || null); if (j !== lastSnap[top]) { lastSnap[top] = j; fire(top); } });
    });
    window.addEventListener('pagehide', function () { disc.forEach(function (p) { setAt(p, null); }); });
    return {
      watch: function (n, cb) { (watchers[n] = watchers[n] || []).push(cb); cb(load()[n] || null); },
      set: function (p, v) { setAt(p, JSON.parse(JSON.stringify(v))); return Promise.resolve(); },
      remove: function (p) { setAt(p, null); return Promise.resolve(); },
      tx: function (p, fn) { var cur = getAt(p), nv = fn(cur); if (nv === undefined) return Promise.resolve({ committed: false, value: cur }); setAt(p, nv); return Promise.resolve({ committed: true, value: nv }); },
      onDisc: function (p) { if (disc.indexOf(p) < 0) disc.push(p); },
      now: function () { return Date.now(); },
      connected: function (cb) { cb(true); }
    };
  }
  function ago(t) {
    var m = Math.max(0, Math.floor((Date.now() - (+t || Date.now())) / 60000));
    return m < 1 ? 'এইমাত্র' : bn(m) + ' মিনিট';
  }

  // ============ লাইভ পরীক্ষা (এডমিন) ============
  var LivePage = {
    open: function () {
      if (!RT.B) {
        setPage('লাইভ পরীক্ষা', '<div class="card card-pad"><h3 style="margin-top:0;color:var(--green)">রিয়েল-টাইম সংযোগ চালু হয়নি</h3><p>কোন পরীক্ষকের কাছে এখন কোন শিক্ষার্থী আছে তা সাথে সাথে দেখতে config.js-এ Firebase-এর তথ্য বসাতে হবে। README.md ফাইলে ধাপগুলো দেওয়া আছে।</p></div>', '#/live');
        return;
      }
      api('listUsers').then(function (d) { LivePage.users = d.users; LivePage.draw(); }).catch(function () { LivePage.users = []; LivePage.draw(); });
      setPage('লাইভ পরীক্ষা', '<div id="livePage"></div>', '#/live');
    },
    draw: function () {
      var el = $('#livePage'); if (!el) return;
      var pres = RT.presence, byUser = {};
      Object.keys(pres).forEach(function (sid) { var p = pres[sid]; if (!byUser[p.user]) byUser[p.user] = []; byUser[p.user].push(p); });
      var claims = Object.keys(RT.claims).map(function (reg) { var c = RT.claimOf(reg); return c ? Object.assign({ reg: reg }, c) : null; }).filter(Boolean)
        .sort(function (a, b) { return (a.at || 0) - (b.at || 0); });
      var examiners = (LivePage.users || []).filter(function (u) { return u.role !== 'admin' && u.active; });
      var onlineN = examiners.filter(function (u) { return byUser[u.username]; }).length;
      var html = '<div class="grid stats">' + stat('অনলাইনে পরীক্ষক', bn(onlineN) + '/' + bn(examiners.length), 'users') +
        stat('এখন পরীক্ষা চলছে', bn(claims.length) + ' জন', 'student', 'gold') +
        '<div class="card stat"><span class="ic">' + ic('eye') + '</span><div class="k">সংযোগ</div><div class="v" style="font-size:20px;margin-top:6px">' + (RT.ok ? '<span class="chip open">সরাসরি যুক্ত</span>' : '<span class="chip fail">বিচ্ছিন্ন</span>') + '</div><div class="s">কিছু বদলালে সাথে সাথে এখানে দেখাবে</div></div></div>';
      html += '<div class="card" style="margin-bottom:16px"><div class="card-head"><h3>এখন কার কাছে কে পরীক্ষা দিচ্ছে</h3></div>' +
        (claims.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>পরীক্ষক</th><th>শিক্ষার্থী</th><th>গ্রুপ</th><th>সময়</th></tr></thead><tbody>' +
          claims.map(function (c) { return '<tr><td><b>' + esc(c.name) + '</b></td><td><b>' + esc(c.rname || c.reg) + '</b><small>' + esc(c.reg) + '</small></td><td>' + esc(c.gname || '') + '</td><td><span class="chip open">' + ago(c.at) + ' ধরে</span></td></tr>'; }).join('') +
          '</tbody></table></div>' : '<div class="empty">এই মুহূর্তে কারো পরীক্ষা চলছে না</div>') + '</div>';
      html += '<div class="grid group-cards">' + examiners.map(function (u) {
        var ps = byUser[u.username] || [], p = ps.filter(function (x) { return x.reg; })[0] || ps[0];
        var on = ps.length > 0;
        return '<div class="card card-pad live-ex ' + (on ? 'on' : '') + '"><div style="display:flex;gap:10px;align-items:center"><div class="avatar">' + esc(initials(u.name)) + '</div><div style="flex:1;min-width:0"><b>' + esc(u.name) + '</b><div class="pct">' + (on ? '<span class="dot-on"></span> অনলাইন' : 'অফলাইন') + '</div></div></div>' +
          (on && p && p.reg ? '<div class="live-now">' + ic('student') + ' <span><b>' + esc(p.rname || p.reg) + '</b><small>' + esc(p.gname || '') + ' · ' + ago(p.claimAt) + ' ধরে</small></span></div>'
            : on && p && p.gname ? '<div class="pct" style="margin-top:10px">' + esc(p.gname) + ' খোলা আছে</div>' : '') + '</div>';
      }).join('') + '</div>';
      el.innerHTML = html;
    }
  };
  RT.on(function (kind) {
    var h = location.hash;
    if (h.indexOf('#/live') === 0 && (kind === 'presence' || kind === 'claims')) LivePage.draw();
    if (kind === 'claims' && Entry.active) Entry.applyLocks();
    if ((kind === 'presence' || kind === 'claims') && $('#liveNow')) Dashboard.liveNow();
  });
  setInterval(function () { if (location.hash.indexOf('#/live') === 0) LivePage.draw(); }, 30000);
  RT.on(function (kind, ev) {
    if (kind !== 'ev') return;
    if (ev.kind === 'marks' && Entry.active && Entry.gid === ev.gid) Entry.applyRemote(ev);
    else if (Entry.active && (ev.kind === 'change' || ev.gid === Entry.gid)) Entry.syncSoon();
    else Live.refreshSoon();
  });

  // ============ Export ============
  function download(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  var xlsxLoading = null;
  function loadXlsx() {
    if (window.XLSX) return Promise.resolve();
    if (!xlsxLoading) xlsxLoading = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
    return xlsxLoading;
  }
  function xlsx(sheets, fname) {
    loading(true);
    loadXlsx().then(function () {
      var wb = XLSX.utils.book_new(), used = {};
      sheets.forEach(function (sh) {
        var ws = XLSX.utils.json_to_sheet(sh.rows);
        var keys = sh.rows.length ? Object.keys(sh.rows[0]) : [];
        ws['!cols'] = keys.map(function (k) { return { wch: Math.max(8, Math.min(34, Math.max.apply(null, [k.length + 2].concat(sh.rows.map(function (r) { return String(r[k]).length + 2; }))))) }; });
        var n = sh.name.replace(/[\\\/\?\*\[\]:]/g, ' ').slice(0, 31), k = 1;
        while (used[n]) n = n.slice(0, 28) + ' ' + (++k);
        used[n] = 1;
        XLSX.utils.book_append_sheet(wb, ws, n);
      });
      XLSX.writeFile(wb, fname + '.xlsx');
      loading(false);
    }).catch(function () {
      loading(false);
      // CSV fallback
      var sh = sheets[0], keys = sh.rows.length ? Object.keys(sh.rows[0]) : [];
      var csv = '\ufeff' + [keys.join(',')].concat(sh.rows.map(function (r) { return keys.map(function (k) { return '"' + String(r[k]).replace(/"/g, '""') + '"'; }).join(','); })).join('\n');
      download(new Blob([csv], { type: 'text/csv' }), fname + '.csv');
      toast('Excel লোড হয়নি, CSV ফাইল নামানো হলো');
    });
  }
  function exportExcel(groups, fname) {
    xlsx(groups.map(function (R) {
      var rows = R.rows.map(function (r) {
        var o = { 'ক্রমিক': r.roll, 'রেজি নং': r.reg, 'শিক্ষার্থীর নাম': r.name, 'পিতার নাম': r.father };
        R.subjects.forEach(function (s) { var v = r.marks[s]; o[s] = v === 'A' ? 'অনুপস্থিত' : v === '' ? '' : Number(v); });
        o['মোট নম্বর'] = r.total; o['গড়'] = r.avg; o['গ্রেড'] = r.grade; o['মেধাস্থান'] = r.rank || ''; o['ফলাফল'] = r.result;
        return o;
      });
      var short = R.group.replace('আল কুরআন ', '') + (R.branch !== 'সাধারণ শাখা' ? ' - ' + R.branch.replace(' শাখা', '') : '');
      return { name: short, rows: rows };
    }), fname);
  }

  // ============ Print ============
  function printDoc(title, bodyHtml, landscape) {
    var css = '@page{size:A4 ' + (landscape ? 'landscape' : 'portrait') + ';margin:10mm}' +
      'body{font-family:"Kalpurush","Kalpurush Modified","Hind Siliguri","Noto Sans Bengali",sans-serif;color:#111;margin:0}' +
      '.pg{page-break-after:always}.pg:last-child{page-break-after:auto}' +
      '.hd{text-align:center;margin-bottom:8px}.hd .i{font-size:24px;font-weight:700}.hd .a{font-size:12.5px}.hd .e{font-size:19px;font-weight:700;margin-top:2px}.hd .g{font-size:16px}' +
      'table{width:100%;border-collapse:collapse;font-size:14px}th,td{border:1px solid #000;padding:4px 5px;text-align:center}th{font-weight:600;font-size:13px}td.l{text-align:left}' +
      'thead{display:table-header-group}tr{page-break-inside:avoid}' +
      '.sig{display:flex;justify-content:space-between;margin-top:40px;font-size:14px}.sig span{border-top:1px solid #000;padding-top:4px;min-width:170px;text-align:center}' +
      '.ms{border:3px double #14532d;padding:18px 22px;margin:0 auto;max-width:180mm;position:relative}.ms .hd .i{color:#14532d}.ms table{font-size:15px;margin-top:10px}' +
      '.ms .row{display:flex;gap:20px;justify-content:space-between;font-size:15px;margin:3px 0}.ms .box{display:flex;gap:8px;margin-top:12px}.ms .box div{flex:1;border:1px solid #000;padding:6px;text-align:center}' +
      '.mt h4{margin:14px 0 6px;font-size:16px;border-bottom:1px solid #000;padding-bottom:3px}';
    var html = '<!DOCTYPE html><html lang="bn"><head><meta charset="utf-8"><title>' + esc(title) + '</title>' +
      '<link rel="stylesheet" href="https://fonts.maateen.me/kalpurush/font.css"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap">' +
      '<style>' + css + '</style></head><body>' + bodyHtml + '</body></html>';
    var fr = document.createElement('iframe');
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(fr);
    var d = fr.contentWindow.document; d.open(); d.write(html); d.close();
    var done = false;
    function go() { if (done) return; done = true; fr.contentWindow.focus(); fr.contentWindow.print(); setTimeout(function () { fr.remove(); }, 2000); }
    fr.onload = function () { setTimeout(go, 500); };
    setTimeout(go, 2500);
  }
  function headHtml(group, branch, sub) {
    var st = S.settings;
    return '<div class="hd"><img src="' + LOGO_URL + '" onerror="this.remove()" style="height:56px;display:block;margin:0 auto 4px"><div class="i">' + esc(st.institution) + '</div><div class="a">' + esc(st.address) + '</div><div class="e">' + esc(st.examTitle) + (sub ? ' — ' + sub : '') + '</div>' +
      (group ? '<div class="g">গ্রুপঃ ' + esc(group) + (branch && branch !== 'সাধারণ শাখা' ? ' (' + esc(branch) + ')' : '') + '</div>' : '') + '</div>';
  }
  function printMarkSheet(sum, students, marks, withMarks) {
    var h = '<div class="pg">' + headHtml(sum.group, sum.branch, 'নম্বর শীট') + '<table><thead><tr><th>ক্রমিক নম্বর</th><th>রেজিঃ নম্বর</th><th>পরীক্ষার্থীর নাম</th><th>পিতার নাম</th>' +
      sum.subjects.map(function (s) { return '<th>' + esc(s) + '</th>'; }).join('') + '<th>মোট নম্বর</th></tr></thead><tbody>';
    students.forEach(function (st) {
      var m = marks[st.reg] || {}, t = 0, any = false;
      h += '<tr><td>' + bn(st.roll) + '</td><td>' + esc(st.reg) + '</td><td class="l">' + esc(st.name) + '</td><td class="l">' + esc(st.father) + '</td>' +
        sum.subjects.map(function (s) { var v = withMarks ? (m[s] || '') : ''; var n = parseFloat(v); if (!isNaN(n)) { t += n; any = true; } return '<td>' + showMark(v) + '</td>'; }).join('') +
        '<td>' + (any ? bn(t) : '') + '</td></tr>';
    });
    h += '</tbody></table><div class="sig"><span>পরীক্ষকের স্বাক্ষর</span><span>পরিচালকের স্বাক্ষর</span></div></div>';
    printDoc(sum.group + ' নম্বর শীট', h, true);
  }
  function printResults(groups, settings) {
    var h = groups.map(function (R) {
      return '<div class="pg">' + headHtml(R.group, R.branch, 'ফলাফল') + '<table><thead><tr><th>ক্রমিক</th><th>রেজিঃ নম্বর</th><th>পরীক্ষার্থীর নাম</th><th>পিতার নাম</th>' +
        R.subjects.map(function (s) { return '<th>' + esc(s) + '</th>'; }).join('') + '<th>মোট</th><th>গড়</th><th>গ্রেড</th><th>মেধা</th></tr></thead><tbody>' +
        R.rows.map(function (r) {
          return '<tr><td>' + bn(r.roll) + '</td><td>' + esc(r.reg) + '</td><td class="l">' + esc(r.name) + '</td><td class="l">' + esc(r.father) + '</td>' +
            R.subjects.map(function (s) { return '<td>' + showMark(r.marks[s]) + '</td>'; }).join('') +
            '<td><b>' + bn(r.total) + '</b></td><td>' + bn(r.avg) + '</td><td>' + esc(r.grade) + '</td><td>' + (r.rank ? bn(r.rank) : '') + '</td></tr>';
        }).join('') + '</tbody></table><div class="sig"><span>পরীক্ষা নিয়ন্ত্রক</span><span>পরিচালকের স্বাক্ষর</span></div></div>';
    }).join('');
    printDoc('ফলাফল', h, true);
  }
  function printMarksheets(R, rows, settings) {
    var h = rows.map(function (r) {
      return '<div class="pg" style="padding-top:6mm"><div class="ms">' + headHtml('', '', 'মার্কশিট') +
        '<div class="row"><span>নাম: <b>' + esc(r.name) + '</b></span><span>রেজি নং: <b>' + esc(r.reg) + '</b></span></div>' +
        '<div class="row"><span>পিতার নাম: ' + esc(r.father) + '</span><span>ক্রমিক: ' + bn(r.roll) + '</span></div>' +
        '<div class="row"><span>গ্রুপ: ' + esc(R.group) + ' (' + esc(R.branch) + ')</span><span>' + esc(r.year || '') + '</span></div>' +
        '<table><thead><tr><th>ক্রম</th><th>বিষয়</th><th>পূর্ণমান</th><th>প্রাপ্ত নম্বর</th></tr></thead><tbody>' +
        R.subjects.map(function (s, i) { return '<tr><td>' + bn(i + 1) + '</td><td class="l">' + esc(s) + '</td><td>' + bn(settings.fullMark) + '</td><td>' + showMark(r.marks[s]) + '</td></tr>'; }).join('') +
        '<tr><td></td><td class="l"><b>সর্বমোট</b></td><td><b>' + bn(settings.fullMark * R.subjects.length) + '</b></td><td><b>' + bn(r.total) + '</b></td></tr></tbody></table>' +
        '<div class="box"><div>গড়<br><b>' + bn(r.avg) + '</b></div><div>গ্রেড<br><b>' + esc(r.grade) + '</b></div><div>মেধাস্থান<br><b>' + (r.rank ? bn(r.rank) : '—') + '</b></div><div>ফলাফল<br><b>' + esc(r.result) + '</b></div></div>' +
        '<div class="sig"><span>শ্রেণি শিক্ষক</span><span>অভিভাবক</span><span>পরিচালক</span></div></div></div>';
    }).join('');
    printDoc('মার্কশিট', h, false);
  }
  function printMerit(groups, settings) {
    var h = '<div class="pg mt">' + headHtml('', '', 'মেধাতালিকা');
    var last = null;
    groups.forEach(function (R) {
      var top = R.rows.filter(function (r) { return r.rank && r.rank <= 3; }).sort(function (a, b) { return a.rank - b.rank; });
      if (!top.length) return;
      if (R.branch !== last) { h += '<h4>' + esc(R.branch) + '</h4>'; last = R.branch; }
      h += '<table style="margin-bottom:8px"><thead><tr><th colspan="5" style="text-align:left">' + esc(R.group) + '</th></tr><tr><th>মেধাস্থান</th><th>রেজিঃ নম্বর</th><th>নাম</th><th>মোট নম্বর</th><th>গ্রেড</th></tr></thead><tbody>' +
        top.map(function (r) { return '<tr><td>' + bn(r.rank) + '</td><td>' + esc(r.reg) + '</td><td class="l">' + esc(r.name) + '</td><td>' + bn(r.total) + '</td><td>' + esc(r.grade) + '</td></tr>'; }).join('') + '</tbody></table>';
    });
    h += '<div class="sig"><span>পরীক্ষা নিয়ন্ত্রক</span><span>পরিচালকের স্বাক্ষর</span></div></div>';
    printDoc('মেধাতালিকা', h, false);
  }

  // ============ start ============
  if (!window.CSS || !CSS.escape) { window.CSS = window.CSS || {}; CSS.escape = function (s) { return String(s).replace(/["\\]/g, '\\$&'); }; }
  if (!String.prototype.startsWith) String.prototype.startsWith = function (s) { return this.indexOf(s) === 0; };
  window.__ASM = { Entry: Entry, RT: RT };
  RT.init().then(function () { boot(); Live.start(); });
})();
