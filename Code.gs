/**
 * เช็คชื่อคลาส Clude AI — Google Apps Script (ฝั่ง Google Sheet)
 * ---------------------------------------------------------------
 * วิธีใช้ (ดูรายละเอียดใน README.md):
 *   1. เปิด Google Sheet ใหม่ → ส่วนขยาย (Extensions) → Apps Script
 *   2. วางโค้ดไฟล์นี้ทั้งหมดแทนโค้ดเดิม แล้วกดบันทึก
 *   3. เลือกฟังก์ชัน setup แล้วกด "เรียกใช้" (Run) หนึ่งครั้ง เพื่อสร้างชีตและอนุญาตสิทธิ์
 *   4. ทำให้ใช้งานได้ (Deploy) → การทำให้ใช้งานได้รายการใหม่ → ประเภท "เว็บแอป"
 *      - เรียกใช้ในฐานะ: ฉัน (Me)
 *      - ผู้ที่มีสิทธิ์เข้าถึง: ทุกคน (Anyone)
 *   5. คัดลอก URL ที่ลงท้ายด้วย /exec ไปใส่ใน config.js ของหน้าเว็บ
 */

const APP_VERSION = '1.5.0';                   // ให้ตรงกับเวอร์ชันของหน้าเว็บ
const TZ = 'Asia/Bangkok';
const SHEET_ROSTER = 'รายชื่อ';
const SHEET_ATT = 'บันทึกเวลา';
const SHEET_LOG = 'Data';                       // บันทึกเหตุการณ์แบบง่าย (timestamp, name, note) ทุกครั้งที่มีคนเช็คอิน/เช็คเอาท์
const SAVE_SIGNATURE_TO_DRIVE = true;           // เก็บรูปลายเซ็นเป็นไฟล์ PNG ใน Google Drive ด้วย
const SIGNATURE_FOLDER_NAME = 'ลายเซ็น - เช็คชื่อคลาส Clude AI';
const MAX_CELL_CHARS = 49000;                   // ขีดจำกัดตัวอักษรต่อช่องของ Google Sheets คือ 50,000

// คอลัมน์ชีต "รายชื่อ"
const R_HEAD = ['id', 'ชื่อ-นามสกุล', 'รหัส', 'บริษัท/หน่วยงาน', 'ตำแหน่ง', 'ลำดับ'];
const R = { id: 0, name: 1, code: 2, group: 3, position: 4, order: 5 };

// คอลัมน์ชีต "บันทึกเวลา" (คอลัมน์ K–N เป็นข้อมูลระบบ จะถูกซ่อน)
const A_HEAD = ['วันที่', 'ชื่อ-นามสกุล', 'รหัส', 'บริษัท/หน่วยงาน', 'ตำแหน่ง', 'เวลาเข้า', 'เวลาออก', 'รวมเวลา', 'สถานะ', 'ลายเซ็น',
                'id', 'checkInMs', 'checkOutMs', 'signatureData', 'อัปเดตล่าสุด'];
const A = { date: 0, name: 1, code: 2, group: 3, position: 4, timeIn: 5, timeOut: 6, dur: 7, status: 8, sigLink: 9,
            id: 10, inMs: 11, outMs: 12, sigData: 13, updated: 14 };

/* ======================= Web app entry points ======================= */

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    const action = p.action || 'getAll';
    if (action === 'ping') return out_({ ok: true, version: APP_VERSION, time: Date.now() });
    if (action === 'getAll') return out_(getAll_(p.date));
    if (action === 'getSig') return out_(getSig_(p.date, p.id));
    return out_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return out_({ ok: false, error: String((err && err.message) || err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    let res;
    switch (b.action) {
      case 'saveRecord':   res = saveRecord_(b); break;
      case 'clearRecord':  res = clearRecord_(b.date, b.id); break;
      case 'upsertPerson': res = upsertPeople_([b.person], false); break;
      case 'deletePerson': res = deletePerson_(b.id); break;
      case 'bulkRoster':   res = upsertPeople_(b.people || [], !!b.replace); break;
      default: res = { ok: false, error: 'unknown action' };
    }
    return out_(res);
  } catch (err) {
    return out_({ ok: false, error: String((err && err.message) || err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

/* ======================= Setup ======================= */

/** เรียกครั้งแรกจากหน้า Apps Script เพื่อสร้างชีตและขอสิทธิ์ */
function setup() {
  ensureSheets_(true);
  if (SAVE_SIGNATURE_TO_DRIVE) getSigFolder_();
  return 'พร้อมใช้งาน';
}

function ensureSheets_(format) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let r = ss.getSheetByName(SHEET_ROSTER);
  let a = ss.getSheetByName(SHEET_ATT);
  const created = !r || !a;
  if (!r) r = ss.insertSheet(SHEET_ROSTER);
  if (!a) a = ss.insertSheet(SHEET_ATT);
  if (r.getLastRow() === 0) r.getRange(1, 1, 1, R_HEAD.length).setValues([R_HEAD]);
  if (a.getLastRow() === 0) a.getRange(1, 1, 1, A_HEAD.length).setValues([A_HEAD]);
  if (format || created) {
    styleHeader_(r, R_HEAD.length);
    styleHeader_(a, A_HEAD.length);
    r.getRange('A:C').setNumberFormat('@');
    a.getRange('A:A').setNumberFormat('@');
    a.getRange('C:C').setNumberFormat('@');
    a.getRange('F:H').setNumberFormat('@');
    r.hideColumns(R.id + 1);
    a.hideColumns(A.id + 1, 4);
    r.setColumnWidth(2, 240); r.setColumnWidth(4, 240); r.setColumnWidth(5, 200);
    a.setColumnWidth(2, 220); a.setColumnWidth(4, 220); a.setColumnWidth(5, 180); a.setColumnWidth(10, 110);
    // ลบชีตว่างที่ Google สร้างไว้ให้ (Sheet1 / แผ่น1)
    ss.getSheets().forEach(function (sh) {
      const n = sh.getName();
      if (n !== SHEET_ROSTER && n !== SHEET_ATT && sh.getLastRow() === 0 && ss.getSheets().length > 2) ss.deleteSheet(sh);
    });
  }
  return { roster: r, att: a };
}

function styleHeader_(sh, n) {
  sh.getRange(1, 1, 1, n).setFontWeight('bold').setFontColor('#ffffff').setBackground('#2563eb');
  sh.setFrozenRows(1);
}

/* ======================= Roster ======================= */

function readRoster_() {
  const sh = ensureSheets_(false).roster;
  const last = sh.getLastRow();
  if (last < 2) return [];
  const vals = sh.getRange(2, 1, last - 1, R_HEAD.length).getValues();
  const people = [];
  let wroteIds = false;
  vals.forEach(function (row, i) {
    const name = String(row[R.name] || '').trim();
    if (!name) return;
    let id = String(row[R.id] || '').trim();
    if (!id) { id = newId_(); row[R.id] = id; wroteIds = true; }   // แถวที่พิมพ์เพิ่มเองในชีต จะได้ id อัตโนมัติ
    people.push({
      id: id, name: name,
      code: String(row[R.code] || '').trim(),
      group: String(row[R.group] || '').trim(),
      position: String(row[R.position] || '').trim(),
      order: Number(row[R.order]) || (i + 1)
    });
  });
  if (wroteIds) sh.getRange(2, 1, vals.length, 1).setValues(vals.map(function (r) { return [r[R.id]]; }));
  return people;
}

function upsertPeople_(list, replace) {
  const sh = ensureSheets_(false).roster;
  const clean = (list || []).filter(function (p) { return p && validId_(p.id) && String(p.name || '').trim(); });
  const last = sh.getLastRow();
  let rows = last >= 2 ? sh.getRange(2, 1, last - 1, R_HEAD.length).getValues() : [];
  if (replace) rows = [];
  const index = {};
  rows.forEach(function (r, i) { if (r[R.id]) index[String(r[R.id])] = i; });
  clean.forEach(function (p) {
    const row = [p.id, String(p.name).trim(), String(p.code || ''), String(p.group || ''), String(p.position || ''), Number(p.order) || ''];
    if (index[p.id] !== undefined) rows[index[p.id]] = row;
    else { index[p.id] = rows.length; rows.push(row); }
  });
  if (last >= 2) sh.getRange(2, 1, last - 1, R_HEAD.length).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, R_HEAD.length).setValues(rows);
  return { ok: true, count: clean.length };
}

function deletePerson_(id) {
  if (!validId_(id)) return { ok: false, error: 'bad id' };
  const sh = ensureSheets_(false).roster;
  const last = sh.getLastRow();
  if (last < 2) return { ok: true };
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]) === id) sh.deleteRow(i + 2);
  return { ok: true };
}

/* ======================= Attendance ======================= */

function getAll_(date) {
  if (!validDate_(date)) return { ok: false, error: 'bad date' };
  const roster = readRoster_();
  const sh = ensureSheets_(false).att;
  const records = {};
  const last = sh.getLastRow();
  if (last >= 2) {
    const vals = sh.getRange(2, 1, last - 1, A_HEAD.length).getValues();
    vals.forEach(function (r) {
      if (normDate_(r[A.date]) !== date || !r[A.id]) return;
      records[String(r[A.id])] = {
        checkIn: Number(r[A.inMs]) || null,
        checkOut: Number(r[A.outMs]) || null,
        hasSig: !!(r[A.sigData] || r[A.sigLink])
      };
    });
  }
  return { ok: true, version: APP_VERSION, date: date, roster: roster, records: records, serverTime: Date.now() };
}

function getSig_(date, id) {
  if (!validDate_(date) || !validId_(id)) return { ok: false, error: 'bad request' };
  const found = findAtt_(date, id);
  if (!found) return { ok: true, signature: null };
  const data = String(found.row[A.sigData] || '');
  return { ok: true, signature: data.indexOf('data:image/') === 0 ? data : null };
}

function saveRecord_(b) {
  if (!validDate_(b.date) || !validId_(b.id)) return { ok: false, error: 'bad request' };
  if (!b.checkIn) return clearRecord_(b.date, b.id);
  const sh = ensureSheets_(false).att;
  const person = readRoster_().filter(function (p) { return p.id === b.id; })[0] || { name: '(ไม่พบในรายชื่อ)', code: '', group: '', position: '' };
  const found = findAtt_(b.date, b.id);
  const prev = found ? found.row : null;

  let sigLink = prev ? prev[A.sigLink] : '';
  let sigData = prev ? prev[A.sigData] : '';
  if (prev && sigLink && String(sigLink).indexOf('http') === 0) sigLink = '=HYPERLINK("' + sigLink + '","ดูลายเซ็น")';
  if (prev && found.formula) sigLink = found.formula;

  if (b.signature && String(b.signature).indexOf('data:image/png;base64,') === 0) {
    const sig = String(b.signature);
    sigData = sig.length <= MAX_CELL_CHARS ? sig : '';
    sigLink = 'เซ็นแล้ว';
    if (SAVE_SIGNATURE_TO_DRIVE) {
      try {
        const bytes = Utilities.base64Decode(sig.split(',')[1]);
        const blob = Utilities.newBlob(bytes, 'image/png', b.date + '_' + person.name + '.png');
        const file = getSigFolder_().createFile(blob);
        sigLink = '=HYPERLINK("' + file.getUrl() + '","ดูลายเซ็น")';
      } catch (err) { /* ถ้าบันทึกลง Drive ไม่ได้ ยังเก็บลายเซ็นไว้ในชีตตามเดิม */ }
    }
  }

  const inMs = Number(b.checkIn), outMs = Number(b.checkOut) || '';
  const row = [
    b.date, person.name, person.code, person.group, person.position,
    fmtTime_(inMs), outMs ? fmtTime_(outMs) : '', outMs ? fmtDur_(outMs - inMs) : '',
    outMs ? 'เช็คเอาท์แล้ว' : 'กำลังเรียน', sigLink,
    b.id, inMs, outMs, sigData, Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss')
  ];
  if (found) sh.getRange(found.rowNum, 1, 1, A_HEAD.length).setValues([row]);
  else sh.getRange(sh.getLastRow() + 1, 1, 1, A_HEAD.length).setValues([row]);

  // บันทึกลงชีต Data (timestamp, name, note)
  const prevIn = prev ? Number(prev[A.inMs]) || 0 : 0;
  const prevOut = prev ? Number(prev[A.outMs]) || 0 : 0;
  if (inMs !== prevIn) appendLog_(inMs, person.name, 'เช็คอิน');
  if (outMs && outMs !== prevOut) appendLog_(outMs, person.name, 'เช็คเอาท์ (' + fmtDur_(outMs - inMs) + ')');
  return { ok: true };
}

function clearRecord_(date, id) {
  if (!validDate_(date) || !validId_(id)) return { ok: false, error: 'bad request' };
  const found = findAtt_(date, id);
  if (found) ensureSheets_(false).att.deleteRow(found.rowNum);
  return { ok: true };
}

function findAtt_(date, id) {
  const sh = ensureSheets_(false).att;
  const last = sh.getLastRow();
  if (last < 2) return null;
  const range = sh.getRange(2, 1, last - 1, A_HEAD.length);
  const vals = range.getValues();
  for (let i = vals.length - 1; i >= 0; i--) {
    if (String(vals[i][A.id]) === id && normDate_(vals[i][A.date]) === date) {
      const f = sh.getRange(i + 2, A.sigLink + 1).getFormula();
      return { rowNum: i + 2, row: vals[i], formula: f || '' };
    }
  }
  return null;
}

/* ======================= Helpers ======================= */

function appendLog_(ms, name, note) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let log = ss.getSheetByName(SHEET_LOG);
  if (!log) { log = ss.insertSheet(SHEET_LOG, 0); log.getRange(1, 1, 1, 3).setValues([['timestamp', 'name', 'note']]); styleHeader_(log, 3); }
  log.getRange(log.getLastRow() + 1, 1, 1, 3).setValues([[Utilities.formatDate(new Date(ms), TZ, 'dd/MM/yyyy HH:mm'), name, note]]);
}

function getSigFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SIG_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const folder = DriveApp.createFolder(SIGNATURE_FOLDER_NAME);
  props.setProperty('SIG_FOLDER_ID', folder.getId());
  return folder;
}
function out_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function newId_() { return 'p' + Utilities.getUuid().replace(/-/g, '').slice(0, 10); }
function validId_(id) { return typeof id === 'string' && /^[A-Za-z0-9_.\-:]{1,80}$/.test(id); }
function validDate_(d) { return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d); }
function normDate_(v) { return v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : String(v || '').trim(); }
function fmtTime_(ms) { return Utilities.formatDate(new Date(ms), TZ, 'HH:mm:ss'); }
function fmtDur_(ms) {
  if (!(ms > 0)) return '';
  const m = Math.round(ms / 60000), h = Math.floor(m / 60);
  return h ? (h + ' ชม. ' + (m % 60) + ' นาที') : (m + ' นาที');
}
