/**
 * আফটার স্কুল মাকতাব — পরীক্ষার নম্বর ব্যবস্থাপনা (সার্ভার অংশ)
 *
 * এই প্রজেক্টে তিনটা ফাইল থাকবে: Code.gs (এটা), Core.gs, Seed.gs
 * প্রথমবার: উপরের মেনু থেকে setup ফাংশন বেছে Run চাপুন।
 * তারপর Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone)
 */

// Sheet-এর সাথে যুক্ত (bound) স্ক্রিপ্ট হলে খালি রাখুন। আলাদা স্ক্রিপ্ট হলে Sheet-এর ID দিন।
var SPREADSHEET_ID = '';

function ss_() {
  return SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function sheet_(name) {
  var ss = ss_();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, TABLES[name].length).setValues([TABLES[name]]).setFontWeight('bold').setBackground('#1B5E3A').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

var GsStore = {
  read: function (name) {
    var sh = ss_().getSheetByName(name);
    if (!sh) return [];
    var last = sh.getLastRow();
    if (last < 2) return [];
    var cols = TABLES[name];
    var v = sh.getRange(1, 1, last, cols.length).getDisplayValues();
    var head = v[0];
    var out = [];
    for (var i = 1; i < v.length; i++) {
      if (v[i].join('') === '') continue;
      var o = {};
      for (var c = 0; c < head.length; c++) o[head[c]] = v[i][c];
      out.push(o);
    }
    return out;
  },
  write: function (name, rows) {
    var sh = sheet_(name), cols = TABLES[name];
    var data = [cols].concat(rows.map(function (r) {
      return cols.map(function (c) { return r[c] === undefined || r[c] === null ? '' : String(r[c]); });
    }));
    var last = sh.getLastRow();
    if (last > data.length) sh.getRange(data.length + 1, 1, last - data.length, cols.length).clearContent();
    var rng = sh.getRange(1, 1, data.length, cols.length);
    rng.setNumberFormat('@');
    rng.setValues(data);
  },
  append: function (name, row) {
    var sh = sheet_(name);
    sh.appendRow(TABLES[name].map(function (c) { return row[c] === undefined ? '' : String(row[c]); }));
  },
  cacheGet: function (k) { return CacheService.getScriptCache().get(k); },
  cachePut: function (k, v, sec) { CacheService.getScriptCache().put(k, v, Math.min(sec, 21600)); },
  cacheRemove: function (k) { CacheService.getScriptCache().remove(k); },
  hash: function (s) {
    var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
    return raw.map(function (b) { var h = (b < 0 ? b + 256 : b).toString(16); return h.length === 1 ? '0' + h : h; }).join('');
  },
  uuid: function () { return Utilities.getUuid(); },
  lock: function (fn) {
    var lock = LockService.getScriptLock();
    lock.waitLock(25000);
    try { return fn(); } finally { lock.releaseLock(); }
  }
};

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var req = {};
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'ভুল অনুরোধ' }); }
  return json_(createCore(GsStore).handle(req));
}

function doGet() {
  return json_({ ok: true, data: { pong: true, message: 'সার্ভার চালু আছে' } });
}

/** প্রথমবার একবার Run করুন: শীট তৈরি, ২৫১ জন শিক্ষার্থী ও এডমিন (admin / admin123) যুক্ত হবে */
function setup() {
  Object.keys(TABLES).forEach(function (t) { sheet_(t); });
  var r = createCore(GsStore).setup(SEED_STUDENTS);
  var def = ss_().getSheetByName('Sheet1') || ss_().getSheetByName('শীট1');
  if (def && ss_().getSheets().length > 1 && def.getLastRow() === 0) ss_().deleteSheet(def);
  Logger.log('সেটআপ সম্পন্ন: ' + r);
}
