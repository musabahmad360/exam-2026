/*
 * পরীক্ষা ব্যবস্থাপনা — মূল লজিক
 * এই ফাইলটা দুই জায়গায় চলে: ব্রাউজারে (ডেমো মোড) আর Google Apps Script-এ (আসল সার্ভার)।
 * তাই এখানে কোনো ব্রাউজার বা Google-নির্দিষ্ট কোড নেই — সব store-এর মাধ্যমে।
 */
var SUBJECTS_QURAN = ['আল কুরআন', 'তাজবীদ', 'সূরা মুখস্ত', 'মাসনূন দোয়া', 'আকাঈদ', 'সালাত', 'ফিকহ', 'আদব ও আমাল'];
var SUBJECTS_KAIDA = ['কায়দা', 'সূরা মুখস্ত', 'মাসনূন দোয়া', 'আকাঈদ', 'সালাত', 'ফিকহ', 'আদব ও আমাল'];

var TABLES = {
  Students: ['reg', 'name', 'father', 'branch', 'group', 'year', 'roll', 'phone'],
  Users: ['username', 'name', 'role', 'salt', 'hash', 'groups', 'active', 'phone'],
  Marks: ['reg', 'subject', 'value', 'by', 'at'],
  Status: ['gid', 'state', 'by', 'at'],
  Settings: ['key', 'value'],
  Logs: ['at', 'user', 'action', 'detail'],
  Messages: ['at', 'reg', 'channel', 'status', 'by', 'detail']
};

var DEFAULT_SETTINGS = {
  institution: 'আফটার স্কুল মাকতাব',
  address: 'ঝিলটুলী, সারদা সুন্দরী মহিলা কলেজ রোড, (দক্ষিণ ঝিলটুলী প্রবেশপথ সংলগ্ন) কোতয়ালী, ফরিদপুর। ৭৮০০',
  examTitle: 'বার্ষিক পরীক্ষা ২০২৬',
  fullMark: 100,
  passMark: 33,
  entryOpen: true,
  published: false,
  smsUrl: '',
  smsTemplate: '{প্রতিষ্ঠান}\n{নাম} ({রেজি})\n{পরীক্ষা}: মোট {মোট}, গ্রেড {গ্রেড}, মেধা {মেধা}\nমার্কশিট: {লিংক}',
  waTemplate: 'আসসালামু আলাইকুম।\n*{প্রতিষ্ঠান}*\n{পরীক্ষা}-এর ফলাফল\n\nনাম: *{নাম}*\nপিতা: {পিতা}\nরেজি: {রেজি}\nগ্রুপ: {গ্রুপ}\n\n{বিষয়ভিত্তিক}\n\nমোট নম্বর: *{মোট}*\nগড়: {গড়}\nগ্রেড: *{গ্রেড}*\nমেধাস্থান: {মেধা}\nফলাফল: {ফলাফল}\n\nপূর্ণ মার্কশিট দেখুন ও প্রিন্ট করুন:\n{লিংক}\n\nজাযাকাল্লাহু খাইরান।',
  grades: [
    { min: 80, name: 'মুমতায' },
    { min: 65, name: 'জায়্যিদ জিদ্দান' },
    { min: 50, name: 'জায়্যিদ' },
    { min: 33, name: 'মাকবুল' }
  ]
};

var BRANCH_ORDER = ['সাধারণ শাখা', 'মাস্তুরাত শাখা', 'ফরজে আইন শাখা'];

function createCore(store) {
  var SESSION_SECONDS = 6 * 60 * 60;

  function str(v) { return v === null || v === undefined ? '' : String(v); }
  function gidOf(branch, group) { return str(branch) + ' | ' + str(group); }
  function subjectsFor(group) { return str(group).indexOf('আল কুরআন') >= 0 ? SUBJECTS_QURAN : SUBJECTS_KAIDA; }
  function fail(msg) { throw new Error(msg); }
  function bn(n) { return String(n).replace(/[0-9]/g, function (d) { return '০১২৩৪৫৬৭৮৯'[d]; }); }
  function nowIso() { return new Date().toISOString(); }
  function toNum(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }
  function parseJson(v, d) { try { return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function W(t, rows) { store.write(t, rows); if (t !== 'Logs' && t !== 'Messages') bump(); }
  function bump() { try { store.cachePut('rev', String(Date.now()), 21600); } catch (e) { } }
  function normPhone(p) {
    p = String(p || '').replace(/[০-৯]/g, function (d) { return '০১২৩৪৫৬৭৮৯'.indexOf(d); }).replace(/\D/g, '');
    if (p.indexOf('880') === 0) p = p.slice(2);
    if (p.indexOf('88') === 0 && p.length === 13) p = p.slice(2);
    if (p.length === 10 && p.charAt(0) === '1') p = '0' + p;
    return p;
  }
  function smsOk(res) {
    if (!(res.code >= 200 && res.code < 300)) return false;
    var b = str(res.body), j = null;
    try { j = JSON.parse(b); } catch (e) { }
    if (j && typeof j === 'object') {
      if (j.error !== undefined) return Number(j.error) === 0 || j.error === false;
      if (j.response_code !== undefined) return [200, 201, 202].indexOf(Number(j.response_code)) >= 0;
      if (j.status !== undefined) return /success|ok|sent|true|200|1000/i.test(String(j.status));
      if (j.success !== undefined) return j.success === true || String(j.success) === '1';
    }
    return !/error|invalid|fail|insufficient|wrong|denied|unauthori/i.test(b);
  }
  function validPhone(p) { return /^01[3-9]\d{8}$/.test(p); }

  // ---------- settings ----------
  function getSettings() {
    var s = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    store.read('Settings').forEach(function (r) {
      var k = str(r.key); if (!k) return;
      var v = str(r.value);
      if (k === 'grades') s.grades = parseJson(v, s.grades);
      else if (k === 'fullMark' || k === 'passMark') s[k] = toNum(v) === null ? s[k] : toNum(v);
      else if (k === 'entryOpen' || k === 'published') s[k] = v === 'true' || v === 'TRUE';
      else s[k] = v;
    });
    return s;
  }

  function publicSettings(s, u) {
    var o = JSON.parse(JSON.stringify(s));
    delete o.linkSecret;
    if (!u || u.role !== 'admin') delete o.smsUrl;
    return o;
  }
  function linkSecret() {
    var rows = store.read('Settings');
    var r = rows.filter(function (x) { return str(x.key) === 'linkSecret'; })[0];
    if (r && str(r.value)) return str(r.value);
    var sec = store.uuid() + store.uuid();
    store.append('Settings', { key: 'linkSecret', value: sec });
    return sec;
  }
  function linkCode(secret, reg) { return store.hash(secret + '|' + reg).slice(0, 10); }
  function readMessages() {
    var m = {};
    store.read('Messages').forEach(function (r) {
      var reg = str(r.reg); if (!reg) return;
      if (!m[reg]) m[reg] = {};
      m[reg][str(r.channel)] = { status: str(r.status), at: str(r.at), detail: str(r.detail) };
    });
    return m;
  }

  // ---------- users / auth ----------
  function hashPw(salt, pw) { return store.hash(str(salt) + '::' + str(pw)); }
  function readUsers() {
    return store.read('Users').map(function (u) {
      return {
        username: str(u.username).toLowerCase(), name: str(u.name), role: str(u.role) || 'examiner',
        salt: str(u.salt), hash: str(u.hash), groups: parseJson(str(u.groups), []),
        active: str(u.active) !== 'false' && str(u.active) !== 'FALSE', phone: str(u.phone)
      };
    }).filter(function (u) { return u.username; });
  }
  function writeUsers(users) {
    W('Users', users.map(function (u) {
      return { username: u.username, name: u.name, role: u.role, salt: u.salt, hash: u.hash,
        groups: JSON.stringify(u.groups || []), active: u.active ? 'true' : 'false', phone: u.phone || '' };
    }));
  }
  function publicUser(u) {
    return { username: u.username, name: u.name, role: u.role, groups: u.groups, active: u.active, phone: u.phone,
      defaultPassword: u.role === 'admin' && u.hash === hashPw(u.salt, 'admin123') };
  }
  function log(user, action, detail) {
    try { store.append('Logs', { at: nowIso(), user: user || '', action: action, detail: detail || '' }); } catch (e) { }
  }
  function auth(req) {
    var token = str(req.token);
    if (!token) fail('AUTH');
    var uname = store.cacheGet('s_' + token);
    if (!uname) fail('AUTH');
    var u = readUsers().filter(function (x) { return x.username === uname; })[0];
    if (!u || !u.active) fail('AUTH');
    store.cachePut('s_' + token, uname, SESSION_SECONDS);
    return u;
  }
  function requireAdmin(u) { if (u.role !== 'admin') fail('এই কাজের অনুমতি শুধু এডমিনের আছে'); }
  function canAccess(u, gid) { return u.role === 'admin' || (u.groups || []).indexOf(gid) >= 0; }

  // ---------- students / groups ----------
  function readStudents() {
    return store.read('Students').map(function (s) {
      return { reg: str(s.reg), name: str(s.name), father: str(s.father), branch: str(s.branch),
        group: str(s.group), year: str(s.year), roll: toNum(s.roll) || 0, phone: str(s.phone) };
    }).filter(function (s) { return s.reg; });
  }
  function groupList(students) {
    var map = {}, order = [];
    students.forEach(function (s) {
      var g = gidOf(s.branch, s.group);
      if (!map[g]) { map[g] = { gid: g, branch: s.branch, group: s.group, subjects: subjectsFor(s.group), students: [] }; order.push(g); }
      map[g].students.push(s);
    });
    order.sort(function (a, b) {
      var ba = BRANCH_ORDER.indexOf(map[a].branch), bb = BRANCH_ORDER.indexOf(map[b].branch);
      if (ba < 0) ba = 9; if (bb < 0) bb = 9;
      return ba - bb; // stable within branch keeps first-seen order
    });
    return order.map(function (g) {
      map[g].students.sort(function (a, b) { return a.roll - b.roll; });
      return map[g];
    });
  }
  function readMarks() {
    var m = {};
    store.read('Marks').forEach(function (r) {
      var reg = str(r.reg); if (!reg) return;
      if (!m[reg]) m[reg] = {};
      m[reg][str(r.subject)] = { value: str(r.value), by: str(r.by), at: str(r.at) };
    });
    return m;
  }
  function writeMarks(m) {
    var rows = [];
    Object.keys(m).forEach(function (reg) {
      Object.keys(m[reg]).forEach(function (sub) {
        var c = m[reg][sub];
        if (c.value !== '') rows.push({ reg: reg, subject: sub, value: c.value, by: c.by, at: c.at });
      });
    });
    W('Marks', rows);
  }
  function readStatus() {
    var s = {};
    store.read('Status').forEach(function (r) { if (str(r.gid)) s[str(r.gid)] = { state: str(r.state) || 'open', by: str(r.by), at: str(r.at) }; });
    return s;
  }
  function setStatus(gid, state, by) {
    var all = readStatus();
    all[gid] = { state: state, by: by, at: nowIso() };
    W('Status', Object.keys(all).map(function (g) { return { gid: g, state: all[g].state, by: all[g].by, at: all[g].at }; }));
  }
  function ownersOf(students, marks, users) {
    var role = {}, nm = {};
    users.forEach(function (x) { role[x.username] = x.role; nm[x.username] = x.name; });
    var out = {};
    students.forEach(function (s) {
      var m = marks[s.reg] || {}, first = null;
      Object.keys(m).forEach(function (sub) {
        var c = m[sub];
        if (c.value === '' || !c.by || role[c.by] === 'admin') return;
        if (!first || c.at < first.at) first = { user: c.by, name: nm[c.by] || c.by, at: c.at };
      });
      if (first) out[s.reg] = first;
    });
    return out;
  }
  function progressOf(g, marks) {
    var total = g.students.length * g.subjects.length, filled = 0;
    g.students.forEach(function (s) {
      var m = marks[s.reg] || {};
      g.subjects.forEach(function (sub) { if (m[sub] && m[sub].value !== '') filled++; });
    });
    return { total: total, filled: filled, pct: total ? Math.round(filled * 100 / total) : 0 };
  }
  function groupSummary(g, marks, status, users) {
    var st = status[g.gid] || { state: 'open' };
    return {
      gid: g.gid, branch: g.branch, group: g.group, subjects: g.subjects, count: g.students.length,
      state: st.state, stateBy: st.by || '', stateAt: st.at || '', progress: progressOf(g, marks),
      examiners: users.filter(function (u) { return u.role !== 'admin' && (u.groups || []).indexOf(g.gid) >= 0; })
        .map(function (u) { return u.name; })
    };
  }

  // ---------- results ----------
  function gradeOf(pct, settings) {
    var gs = (settings.grades || []).slice().sort(function (a, b) { return b.min - a.min; });
    for (var i = 0; i < gs.length; i++) if (pct >= gs[i].min) return gs[i].name;
    return 'রাসিব';
  }
  function computeGroup(g, marks, settings) {
    var full = settings.fullMark, pass = settings.passMark;
    var rows = g.students.map(function (s) {
      var m = marks[s.reg] || {}, total = 0, filled = 0, absent = 0, failed = [], vals = {};
      g.subjects.forEach(function (sub) {
        var v = m[sub] ? m[sub].value : '';
        vals[sub] = v;
        if (v === '') return;
        filled++;
        if (v === 'A') { absent++; failed.push(sub); return; }
        var n = toNum(v) || 0; total += n;
        if (n * 100 / full < pass) failed.push(sub);
      });
      var complete = filled === g.subjects.length;
      var pct = g.subjects.length ? total * 100 / (full * g.subjects.length) : 0;
      var result, grade;
      if (!complete) { result = 'অসম্পূর্ণ'; grade = '—'; }
      else if (absent === g.subjects.length) { result = 'অনুপস্থিত'; grade = '—'; }
      else if (failed.length) { result = 'অকৃতকার্য'; grade = 'রাসিব'; }
      else { result = 'কৃতকার্য'; grade = gradeOf(pct, settings); }
      return { reg: s.reg, name: s.name, father: s.father, roll: s.roll, year: s.year, marks: vals,
        total: Math.round(total * 100) / 100, avg: g.subjects.length ? Math.round(total * 100 / g.subjects.length) / 100 : 0,
        pct: Math.round(pct * 100) / 100, complete: complete, failed: failed, result: result, grade: grade, rank: null };
    });
    var ranked = rows.filter(function (r) { return r.result === 'কৃতকার্য'; })
      .sort(function (a, b) { return b.total - a.total; });
    var last = null, rank = 0;
    ranked.forEach(function (r, i) { if (r.total !== last) { rank = i + 1; last = r.total; } r.rank = rank; });
    var done = rows.filter(function (r) { return r.complete; });
    var passed = done.filter(function (r) { return r.result === 'কৃতকার্য'; });
    var dist = {};
    passed.forEach(function (r) { dist[r.grade] = (dist[r.grade] || 0) + 1; });
    var subjectAvg = {};
    g.subjects.forEach(function (sub) {
      var t = 0, c = 0;
      rows.forEach(function (r) { var n = toNum(r.marks[sub]); if (n !== null) { t += n; c++; } });
      subjectAvg[sub] = c ? Math.round(t * 10 / c) / 10 : null;
    });
    return {
      gid: g.gid, branch: g.branch, group: g.group, subjects: g.subjects, rows: rows,
      stats: {
        count: rows.length, complete: done.length, passed: passed.length,
        failed: done.filter(function (r) { return r.result === 'অকৃতকার্য'; }).length,
        absent: done.filter(function (r) { return r.result === 'অনুপস্থিত'; }).length,
        highest: ranked.length ? ranked[0].total : null,
        average: done.length ? Math.round(done.reduce(function (a, r) { return a + r.total; }, 0) * 10 / done.length) / 10 : null,
        passRate: done.length ? Math.round(passed.length * 100 / done.length) : null,
        grades: dist, subjectAvg: subjectAvg
      }
    };
  }

  function cleanValue(v, settings) {
    v = str(v).trim().replace(/[০-৯]/g, function (d) { return '০১২৩৪৫৬৭৮৯'.indexOf(d); });
    if (v === '') return '';
    if (/^(a|A|অ|অনু|অনুপস্থিত)$/.test(v)) return 'A';
    var n = Number(v);
    if (isNaN(n)) fail('ভুল নম্বর: ' + v);
    if (n < 0 || n > settings.fullMark) fail('নম্বর ০ থেকে ' + bn(settings.fullMark) + ' এর মধ্যে হতে হবে');
    if (Math.round(n * 2) !== n * 2) fail('নম্বর পূর্ণসংখ্যা বা .৫ হতে পারে');
    return String(n);
  }

  // ---------- actions ----------
  var actions = {
    ping: function () { return { pong: true, time: nowIso() }; },

    login: function (req) {
      var uname = str(req.username).trim().toLowerCase();
      var u = readUsers().filter(function (x) { return x.username === uname; })[0];
      if (!u || !u.active || hashPw(u.salt, req.password) !== u.hash) {
        log(uname, 'লগইন ব্যর্থ', '');
        fail('ইউজারনেম বা পাসওয়ার্ড ভুল');
      }
      var token = store.uuid();
      store.cachePut('s_' + token, u.username, SESSION_SECONDS);
      log(u.username, 'লগইন', '');
      return { token: token, user: publicUser(u) };
    },

    logout: function (req) {
      if (req.token) store.cacheRemove('s_' + str(req.token));
      return {};
    },

    bootstrap: function (req, u) {
      var settings = getSettings(), students = readStudents(), marks = readMarks(), status = readStatus(), users = readUsers();
      var groups = groupList(students).filter(function (g) { return canAccess(u, g.gid); })
        .map(function (g) { return groupSummary(g, marks, status, users); });
      return { user: publicUser(u), settings: publicSettings(settings, u), groups: groups };
    },

    getGroup: function (req, u) {
      if (!canAccess(u, req.gid)) fail('এই গ্রুপে আপনার প্রবেশাধিকার নেই');
      var g = groupList(readStudents()).filter(function (x) { return x.gid === req.gid; })[0];
      if (!g) fail('গ্রুপ পাওয়া যায়নি');
      var marks = readMarks(), status = readStatus(), users = readUsers();
      var out = {};
      g.students.forEach(function (s) { var m = marks[s.reg] || {}; out[s.reg] = {}; g.subjects.forEach(function (sub) { out[s.reg][sub] = m[sub] ? m[sub].value : ''; }); });
      return { summary: groupSummary(g, marks, status, users), students: g.students, marks: out, owners: ownersOf(g.students, marks, users), me: u.username };
    },

    saveMarks: function (req, u) {
      var settings = getSettings();
      if (!canAccess(u, req.gid)) fail('এই গ্রুপে আপনার প্রবেশাধিকার নেই');
      var st = readStatus()[req.gid] || { state: 'open' };
      if (u.role !== 'admin') {
        if (!settings.entryOpen) fail('নম্বর দেওয়ার সময় বন্ধ করা হয়েছে');
        if (st.state === 'submitted') fail('এই গ্রুপের নম্বর জমা হয়ে গেছে, পরিবর্তন করতে এডমিনের সাথে যোগাযোগ করুন');
      }
      var g = groupList(readStudents()).filter(function (x) { return x.gid === req.gid; })[0];
      if (!g) fail('গ্রুপ পাওয়া যায়নি');
      var regs = {}; g.students.forEach(function (s) { regs[s.reg] = 1; });
      var subs = {}; g.subjects.forEach(function (s) { subs[s] = 1; });
      var marks = readMarks(), at = nowIso(), n = 0, conflicts = {};
      var owners = u.role === 'admin' ? {} : ownersOf(g.students, marks, readUsers());
      (req.entries || []).forEach(function (e) {
        if (!regs[e.reg] || !subs[e.subject]) return;
        if (owners[e.reg] && owners[e.reg].user !== u.username) { conflicts[e.reg] = owners[e.reg].name; return; }
        var v = cleanValue(e.value, settings);
        if (!marks[e.reg]) marks[e.reg] = {};
        var old = marks[e.reg][e.subject] ? marks[e.reg][e.subject].value : '';
        if (old === v) return;
        marks[e.reg][e.subject] = { value: v, by: u.username, at: at };
        n++;
      });
      if (n) { writeMarks(marks); log(u.username, 'নম্বর সংরক্ষণ', g.group + ' (' + g.branch + ') — ' + n + 'টি ঘর'); }
      return { saved: n, progress: progressOf(g, marks), conflicts: conflicts, owners: ownersOf(g.students, marks, readUsers()) };
    },

    submitGroup: function (req, u) {
      if (!canAccess(u, req.gid)) fail('এই গ্রুপে আপনার প্রবেশাধিকার নেই');
      var g = groupList(readStudents()).filter(function (x) { return x.gid === req.gid; })[0];
      if (!g) fail('গ্রুপ পাওয়া যায়নি');
      var p = progressOf(g, readMarks());
      if (p.filled < p.total && u.role !== 'admin') fail('সব ঘর পূরণ হয়নি (' + bn(p.filled) + '/' + bn(p.total) + ')। অনুপস্থিত হলে "অ" লিখুন।');
      setStatus(req.gid, 'submitted', u.username);
      log(u.username, 'নম্বর জমা', g.group + ' (' + g.branch + ')');
      return {};
    },

    setGroupState: function (req, u) {
      requireAdmin(u);
      setStatus(req.gid, req.state === 'submitted' ? 'submitted' : 'open', u.username);
      log(u.username, req.state === 'submitted' ? 'গ্রুপ লক' : 'গ্রুপ আনলক', req.gid);
      return {};
    },

    results: function (req, u) {
      var settings = getSettings(), marks = readMarks();
      var gs = groupList(readStudents()).filter(function (g) { return (req.gid === '*' || g.gid === req.gid) && canAccess(u, g.gid); });
      if (!gs.length) fail('গ্রুপ পাওয়া যায়নি');
      return { settings: publicSettings(settings, u), groups: gs.map(function (g) { return computeGroup(g, marks, settings); }) };
    },

    dashboard: function (req, u) {
      requireAdmin(u);
      var students = readStudents(), marks = readMarks(), status = readStatus(), users = readUsers();
      var groups = groupList(students).map(function (g) { return groupSummary(g, marks, status, users); });
      var branches = {};
      groups.forEach(function (g) {
        var b = branches[g.branch] || (branches[g.branch] = { branch: g.branch, groups: 0, students: 0, filled: 0, total: 0, submitted: 0 });
        b.groups++; b.students += g.count; b.filled += g.progress.filled; b.total += g.progress.total;
        if (g.state === 'submitted') b.submitted++;
      });
      var logs = store.read('Logs').slice(-12).reverse();
      var filled = 0, total = 0;
      groups.forEach(function (g) { filled += g.progress.filled; total += g.progress.total; });
      return {
        totals: { students: students.length, groups: groups.length,
          examiners: users.filter(function (x) { return x.role !== 'admin'; }).length,
          submitted: groups.filter(function (g) { return g.state === 'submitted'; }).length,
          pct: total ? Math.round(filled * 100 / total) : 0, filled: filled, cells: total },
        branches: BRANCH_ORDER.map(function (b) { return branches[b]; }).filter(Boolean),
        groups: groups, logs: logs
      };
    },

    // ----- users -----
    listUsers: function (req, u) { requireAdmin(u); return { users: readUsers().map(publicUser) }; },
    saveUser: function (req, u) {
      requireAdmin(u);
      var d = req.user || {};
      var uname = str(d.username).trim().toLowerCase();
      if (!/^[a-z0-9_.]{3,30}$/.test(uname)) fail('ইউজারনেম ৩-৩০ অক্ষরের, ইংরেজি ছোট হাতের অক্ষর/সংখ্যা হতে হবে');
      if (!str(d.name).trim()) fail('নাম দিন');
      var users = readUsers(), orig = str(d.original || '').toLowerCase();
      var ex = users.filter(function (x) { return x.username === (orig || uname); })[0];
      if (!orig && ex) fail('এই ইউজারনেম আগে থেকেই আছে');
      if (orig && uname !== orig && users.some(function (x) { return x.username === uname; })) fail('এই ইউজারনেম আগে থেকেই আছে');
      if (!ex) {
        if (str(d.password).length < 4) fail('পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের দিন');
        ex = { salt: store.uuid() }; users.push(ex);
      }
      if (ex.username === u.username && d.role !== 'admin') fail('নিজের এডমিন ক্ষমতা সরানো যাবে না');
      ex.username = uname; ex.name = str(d.name).trim(); ex.role = d.role === 'admin' ? 'admin' : 'examiner';
      ex.groups = d.groups || []; ex.active = d.active !== false; ex.phone = str(d.phone).trim();
      if (str(d.password)) { if (str(d.password).length < 4) fail('পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের দিন'); ex.salt = store.uuid(); ex.hash = hashPw(ex.salt, d.password); }
      writeUsers(users);
      log(u.username, orig ? 'পরীক্ষক হালনাগাদ' : 'নতুন পরীক্ষক', ex.name + ' (' + uname + ')');
      return { user: publicUser(ex) };
    },
    deleteUser: function (req, u) {
      requireAdmin(u);
      var uname = str(req.username).toLowerCase();
      if (uname === u.username) fail('নিজেকে মুছে ফেলা যাবে না');
      writeUsers(readUsers().filter(function (x) { return x.username !== uname; }));
      log(u.username, 'পরীক্ষক মুছে ফেলা', uname);
      return {};
    },
    changePassword: function (req, u) {
      if (hashPw(u.salt, req.oldPassword) !== u.hash) fail('পুরনো পাসওয়ার্ড ভুল');
      if (str(req.newPassword).length < 4) fail('নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের দিন');
      var users = readUsers();
      users.forEach(function (x) { if (x.username === u.username) { x.salt = store.uuid(); x.hash = hashPw(x.salt, req.newPassword); } });
      writeUsers(users);
      log(u.username, 'পাসওয়ার্ড পরিবর্তন', '');
      return {};
    },

    // ----- students -----
    listStudents: function (req, u) { requireAdmin(u); return { students: readStudents() }; },
    saveStudent: function (req, u) {
      requireAdmin(u);
      var d = req.student || {}, list = readStudents();
      var reg = str(d.reg).trim(), orig = str(d.original || '');
      if (!reg || !str(d.name).trim() || !str(d.group).trim() || !str(d.branch).trim()) fail('রেজি নম্বর, নাম, শাখা ও গ্রুপ দিতে হবে');
      if ((!orig || orig !== reg) && list.some(function (s) { return s.reg === reg; })) fail('এই রেজি নম্বর আগে থেকেই আছে');
      var ex = orig ? list.filter(function (s) { return s.reg === orig; })[0] : null;
      if (!ex) {
        var same = list.filter(function (s) { return s.branch === d.branch && s.group === d.group; });
        ex = { roll: same.reduce(function (a, s) { return Math.max(a, s.roll); }, 0) + 1 };
        list.push(ex);
      } else if (ex.group !== str(d.group).trim() || ex.branch !== str(d.branch).trim()) {
        var same2 = list.filter(function (s) { return s.branch === d.branch && s.group === d.group; });
        ex.roll = same2.reduce(function (a, s) { return Math.max(a, s.roll); }, 0) + 1;
      }
      ex.reg = reg; ex.name = str(d.name).trim(); ex.father = str(d.father).trim();
      ex.branch = str(d.branch).trim(); ex.group = str(d.group).trim(); ex.year = str(d.year).trim();
      var ph = normPhone(d.phone); if (ph && !validPhone(ph)) fail('মোবাইল নম্বর সঠিক নয় (01XXXXXXXXX)'); ex.phone = ph;
      W('Students', list);
      if (orig && orig !== reg) {
        var m = readMarks(); if (m[orig]) { m[reg] = m[orig]; delete m[orig]; writeMarks(m); }
      }
      log(u.username, orig ? 'শিক্ষার্থী হালনাগাদ' : 'নতুন শিক্ষার্থী', reg + ' ' + ex.name);
      return {};
    },
    deleteStudent: function (req, u) {
      requireAdmin(u);
      var reg = str(req.reg);
      W('Students', readStudents().filter(function (s) { return s.reg !== reg; }));
      var m = readMarks(); if (m[reg]) { delete m[reg]; writeMarks(m); }
      log(u.username, 'শিক্ষার্থী মুছে ফেলা', reg);
      return {};
    },

    // ----- guardians / messages -----
    savePhones: function (req, u) {
      requireAdmin(u);
      var list = readStudents(), map = {}, bad = [], n = 0;
      list.forEach(function (s) { map[s.reg] = s; });
      (req.entries || []).forEach(function (e) {
        var s = map[str(e.reg).trim()]; if (!s) return;
        var p = normPhone(e.phone);
        if (p && !validPhone(p)) { bad.push(s.reg); return; }
        if (s.phone !== p) { s.phone = p; n++; }
      });
      if (n) { W('Students', list); log(u.username, 'অভিভাবকের মোবাইল নম্বর', bn(n) + 'টি'); }
      return { saved: n, bad: bad };
    },
    messageData: function (req, u) {
      requireAdmin(u);
      var settings = getSettings(), marks = readMarks(), sec = linkSecret(), msgs = readMessages();
      var gs = groupList(readStudents()).filter(function (g) { return req.gid === '*' || g.gid === req.gid; });
      return { settings: publicSettings(settings, u), groups: gs.map(function (g) {
        var R = computeGroup(g, marks, settings), byReg = {};
        g.students.forEach(function (s) { byReg[s.reg] = s; });
        R.rows.forEach(function (r) { r.phone = byReg[r.reg].phone; r.code = linkCode(sec, r.reg); r.sent = msgs[r.reg] || {}; });
        return R;
      }) };
    },
    logMessage: function (req, u) {
      requireAdmin(u);
      (req.items || []).forEach(function (it) {
        store.append('Messages', { at: nowIso(), reg: str(it.reg), channel: str(it.channel), status: str(it.status || 'sent'), by: u.username, detail: str(it.detail).slice(0, 200) });
      });
      return {};
    },
    sendSms: function (req, u) {
      requireAdmin(u);
      var settings = getSettings();
      if (!settings.smsUrl || settings.smsUrl.indexOf('{number}') < 0 && settings.smsUrl.indexOf('{number11}') < 0 || settings.smsUrl.indexOf('{message}') < 0)
        fail('সেটিংসে SMS API লিংক ঠিকমতো দেওয়া হয়নি ({number} ও {message} থাকতে হবে)');
      var out = [];
      (req.items || []).slice(0, 30).forEach(function (it) {
        var p = normPhone(it.phone), res;
        if (!validPhone(p)) { out.push({ reg: it.reg, ok: false, detail: 'নম্বর সঠিক নয়' }); return; }
        var url = settings.smsUrl.split('{number11}').join(encodeURIComponent(p)).split('{number}').join(encodeURIComponent('88' + p))
          .split('{message}').join(encodeURIComponent(str(it.message)));
        try { res = store.httpGet(url); } catch (e) { res = { code: 0, body: String(e && e.message || e) }; }
        var body = str(res.body).slice(0, 160);
        var ok = smsOk(res);
        if (!it.test) store.append('Messages', { at: nowIso(), reg: str(it.reg), channel: 'sms', status: ok ? 'sent' : 'failed', by: u.username, detail: body });
        out.push({ reg: it.reg, ok: ok, detail: body });
      });
      log(u.username, 'SMS পাঠানো', bn(out.filter(function (x) { return x.ok; }).length) + '/' + bn(out.length));
      return { results: out };
    },
    publicMarksheet: function (req) {
      var settings = getSettings();
      if (!settings.published) fail('ফলাফল এখনো প্রকাশিত হয়নি। প্রকাশের পর আবার দেখুন।');
      var reg = str(req.reg);
      if (!reg || linkCode(linkSecret(), reg) !== str(req.code)) fail('লিংকটি সঠিক নয়');
      var g = groupList(readStudents()).filter(function (x) { return x.students.some(function (s) { return s.reg === reg; }); })[0];
      if (!g) fail('শিক্ষার্থী পাওয়া যায়নি');
      var R = computeGroup(g, readMarks(), settings);
      var row = R.rows.filter(function (r) { return r.reg === reg; })[0];
      return { settings: { institution: settings.institution, address: settings.address, examTitle: settings.examTitle, fullMark: settings.fullMark, passMark: settings.passMark },
        group: R.group, branch: R.branch, subjects: R.subjects, row: row, count: R.stats.count, passed: R.stats.passed };
    },
    rev: function () { return { rev: store.cacheGet('rev') || '0' }; },

    // ----- settings / logs / backup -----
    saveSettings: function (req, u) {
      requireAdmin(u);
      var s = req.settings || {}, cur = getSettings(), rows = [];
      Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
        var v = s.hasOwnProperty(k) ? s[k] : cur[k];
        rows.push({ key: k, value: k === 'grades' ? JSON.stringify(v) : String(v) });
      });
      store.read('Settings').forEach(function (r) { if (str(r.key) && !DEFAULT_SETTINGS.hasOwnProperty(str(r.key))) rows.push({ key: str(r.key), value: str(r.value) }); });
      W('Settings', rows);
      log(u.username, 'সেটিংস পরিবর্তন', s.hasOwnProperty('published') && s.published !== cur.published ? (s.published ? 'ফলাফল প্রকাশ' : 'ফলাফল প্রকাশ বন্ধ') : '');
      return { settings: publicSettings(getSettings(), u) };
    },
    logs: function (req, u) {
      requireAdmin(u);
      return { logs: store.read('Logs').slice(-(req.limit || 300)).reverse() };
    },
    backup: function (req, u) {
      requireAdmin(u);
      var out = {};
      Object.keys(TABLES).forEach(function (t) { out[t] = store.read(t); });
      return { backup: out, at: nowIso() };
    },
    restore: function (req, u) {
      requireAdmin(u);
      var b = req.backup || {};
      if (!b.Students || !b.Users) fail('ব্যাকআপ ফাইল সঠিক নয়');
      Object.keys(TABLES).forEach(function (t) { if (b[t]) W(t, b[t]); });
      log(u.username, 'ব্যাকআপ থেকে পুনরুদ্ধার', '');
      return {};
    }
  };

  function setup(seed, opts) {
    opts = opts || {};
    if (!readUsers().length) {
      var salt = store.uuid();
      var users = [{ username: 'admin', name: 'এডমিন', role: 'admin', salt: salt, hash: hashPw(salt, 'admin123'), groups: [], active: true, phone: '' }];
      (opts.extraUsers || []).forEach(function (x) {
        var s2 = store.uuid();
        users.push({ username: x.username, name: x.name, role: 'examiner', salt: s2, hash: hashPw(s2, x.password), groups: x.groups, active: true, phone: '' });
      });
      writeUsers(users);
    }
    if (!readStudents().length && seed) {
      W('Students', seed.map(function (r) {
        return { reg: r[0], name: r[1], father: r[2], branch: r[3], group: r[4], year: r[5], roll: r[6] };
      }));
    }
    if (!store.read('Settings').length) {
      W('Settings', Object.keys(DEFAULT_SETTINGS).map(function (k) {
        return { key: k, value: k === 'grades' ? JSON.stringify(DEFAULT_SETTINGS[k]) : String(DEFAULT_SETTINGS[k]) };
      }));
    }
    ['Marks', 'Status', 'Logs', 'Messages'].forEach(function (t) { store.write(t, store.read(t)); });
    return 'ok';
  }

  function handle(req) {
    try {
      req = req || {};
      var a = actions[req.action];
      if (!a) fail('অজানা অনুরোধ');
      var open = { ping: 1, login: 1, logout: 1, rev: 1, publicMarksheet: 1 };
      var nolock = { rev: 1, ping: 1, sendSms: 1 };
      var run = function () { return a(req, open[req.action] ? null : auth(req)); };
      var data = nolock[req.action] ? run() : store.lock(run);
      return { ok: true, data: data };
    } catch (e) {
      var msg = (e && e.message) || String(e);
      return { ok: false, error: msg === 'AUTH' ? 'সেশন শেষ হয়ে গেছে, আবার লগইন করুন' : msg, auth: msg === 'AUTH' };
    }
  }

  return { handle: handle, setup: setup, gidOf: gidOf, subjectsFor: subjectsFor };
}
