/**
 * Asistia 掲載申込 受信用 Google Apps Script（テンプレート）
 * --------------------------------------------------------------
 * 役割：掲載/編集フォーム（register.html / edit.html）からの POST を受け取り、
 *       Google スプレッドシートに 1 行追記する。
 *
 * セキュリティ方針（重要）:
 *   - API キー等の秘密情報はクライアント（ブラウザ）に置かない。
 *   - スプレッドシートへの書き込みは、この Apps Script（サーバ側）でのみ行う。
 *   - 受け取るのは「法人の公開情報」のみ。個人情報は扱わない前提。
 *
 * セットアップ手順は docs/spreadsheet-setup.md を参照。
 */

// 追記先シート名（スプレッドシート内のタブ名）
var SHEET_NAME = '掲載申込';

// 列の順序（ヘッダー行と一致させる）
var COLUMNS = [
  'receivedAt', 'type', 'id', 'name', 'nameKana', 'region', 'prefecture', 'city',
  'categories', 'services', 'employmentTypes', 'coverage', 'sameDay', 'spot',
  'minWorkers', 'founded', 'employees', 'businessHours', 'priceNote', 'license',
  'description', 'strengths', 'website', 'publicContact', 'sourceUrl', 'status'
];

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var type = body.type || 'create';
    var p = body.payload || {};

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    ensureHeader(sheet);

    var row = COLUMNS.map(function (key) {
      if (key === 'receivedAt') return new Date();
      if (key === 'type') return type;
      if (key === 'status') return '未確認';
      var v = p[key];
      if (Array.isArray(v)) return v.join(' / ');
      if (typeof v === 'boolean') return v ? '可' : '不可';
      return v == null ? '' : v;
    });
    sheet.appendRow(row);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function ensureHeader(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS);
    sheet.setFrozenRows(1);
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
