/* =========================================================
   共通データ・ユーティリティ（Asistia）
   - サンプル JSON の読み込み（Phase 2 でスプレッドシート連携に差し替え）
   - 地域 / カテゴリ / 雇用形態の定義
   - 検索・フィルタ・並び替え
   - 安全な DOM 生成ヘルパー（XSS 対策: ユーザ値は textContent）
   - モノグラム・アバター / インライン SVG アイコン
   - 比較リスト（localStorage）
   ========================================================= */

// データファイルのパス（Phase 2 で Apps Script / スプレッドシート連携に差し替え予定）
const DATA_URL = "data/companies.sample.json";

// 地域 → 都道府県
const REGIONS = {
  "北海道・東北": ["北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"],
  関東: ["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県"],
  中部: ["新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県"],
  近畿: ["三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県"],
  "中国・四国": ["鳥取県", "島根県", "岡山県", "広島県", "山口県", "徳島県", "香川県", "愛媛県", "高知県"],
  "九州・沖縄": ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"]
};

// 業務カテゴリ（大分類）。アイコン名は svgIcon() のキー。
const CATEGORIES = [
  { key: "イベント", label: "イベント運営", sub: "設営・受付・運営", icon: "event" },
  { key: "物流・倉庫", label: "物流・倉庫内作業", sub: "ピッキング・検品・梱包", icon: "box" },
  { key: "設営・施工", label: "設営・施工・搬入出", icon: "build", sub: "ブース設営・搬入出" },
  { key: "清掃", label: "清掃・季節作業", sub: "会場清掃・季節作業", icon: "broom" }
];

// 雇用・契約形態
const EMPLOYMENT_TYPES = ["派遣", "請負", "紹介", "スポット"];

// 比較リストの上限・保存キー
const MAX_COMPARE = 4;
const COMPARE_KEY = "asistia_compare_ids";

// 掲載申込フォームの送信先（Phase 2: Google Apps Script Web App の URL を設定）。
// 空の場合は送信せず「内容確認＋下書き保存」までを行う。
// ※ API キー等の秘密情報はクライアントに置かず、Apps Script 側でスプレッドシートに追記する設計。
const SUBMIT_ENDPOINT = "";

/** サンプル企業データを取得する。 */
async function loadCompanies() {
  const res = await fetch(DATA_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("データの読み込みに失敗しました (" + res.status + ")");
  const json = await res.json();
  return Array.isArray(json.companies) ? json.companies : [];
}

/** ID で 1 社取得。 */
function findCompany(companies, id) {
  return companies.find((c) => c.id === id) || null;
}

/**
 * 企業配列を条件で絞り込む。
 * @param {Array} companies
 * @param {{keyword?,region?,prefecture?,category?,services?:string[],employment?:string[],sameDay?:boolean,spot?:boolean}} o
 */
function filterCompanies(companies, o) {
  const kw = (o.keyword || "").trim().toLowerCase();
  const region = (o.region || "").trim();
  const prefecture = (o.prefecture || "").trim();
  const category = (o.category || "").trim();
  const services = o.services || [];
  const employment = o.employment || [];

  return companies.filter((c) => {
    if (region && c.region !== region) return false;
    if (prefecture && c.prefecture !== prefecture) return false;
    if (category && !(c.categories || []).includes(category)) return false;
    if (services.length && !services.every((s) => (c.services || []).includes(s))) return false;
    if (employment.length && !employment.some((e) => (c.employmentTypes || []).includes(e)))
      return false;
    if (o.sameDay && !c.sameDay) return false;
    if (o.spot && !c.spot) return false;
    if (kw) {
      const hay = [
        c.name, c.nameKana, c.description, c.prefecture, c.city, c.coverage,
        (c.services || []).join(" "), (c.areas || []).join(" "),
        (c.categories || []).join(" "), (c.strengths || []).join(" ")
      ].join(" ").toLowerCase();
      if (!hay.includes(kw)) return false;
    }
    return true;
  });
}

/** 全企業から対応作業（service）の一覧を重複なしで取り出す。 */
function collectServices(companies) {
  const set = new Set();
  companies.forEach((c) => (c.services || []).forEach((s) => set.add(s)));
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ja"));
}

/** 地域ごとの掲載件数 { 地域名: 件数 }。 */
function countByRegion(companies) {
  const counts = {};
  Object.keys(REGIONS).forEach((r) => (counts[r] = 0));
  companies.forEach((c) => {
    if (c.region in counts) counts[c.region] += 1;
  });
  return counts;
}

/** カテゴリごとの掲載件数。 */
function countByCategory(companies) {
  const counts = {};
  CATEGORIES.forEach((cat) => (counts[cat.key] = 0));
  companies.forEach((c) =>
    (c.categories || []).forEach((k) => {
      if (k in counts) counts[k] += 1;
    })
  );
  return counts;
}

// 「NEW」とみなす日数。
const NEW_WITHIN_DAYS = 30;

function isRecentlyUpdated(updatedAt) {
  if (!updatedAt) return false;
  const d = new Date(updatedAt);
  if (Number.isNaN(d.getTime())) return false;
  const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= NEW_WITHIN_DAYS;
}

/**
 * 並び替え。
 * @param {"updated"|"name"|"founded"} order
 */
function sortCompanies(companies, order) {
  const list = companies.slice();
  if (order === "name") {
    list.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ja"));
  } else if (order === "founded") {
    list.sort((a, b) => (a.founded || 0) - (b.founded || 0));
  } else {
    list.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  }
  return list;
}

/** 同地域の他社を最大 limit 件返す。 */
function relatedCompanies(companies, current, limit) {
  const same = companies.filter((c) => c.id !== current.id && c.region === current.region);
  return same.slice(0, limit || 3);
}

/** Google マップ検索 URL。 */
function mapsUrl(company) {
  const q = [company.prefecture, company.city, company.name].filter(Boolean).join(" ");
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
}

/* ---------- DOM ヘルパー ---------- */

/** 安全に要素を生成（text は textContent で挿入）。 */
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (v == null) return;
    if (k === "text") node.textContent = v;
    else if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v; // 定数のみで使用（ユーザ値は渡さない）
    else node.setAttribute(k, v);
  });
  children.forEach((ch) => ch && node.appendChild(ch));
  return node;
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/** インライン SVG アイコン（定数のみ。ユーザ入力は渡さない）。 */
const ICONS = {
  search: '<path d="M11 4a7 7 0 1 0 4.2 12.6l4.1 4.1 1.4-1.4-4.1-4.1A7 7 0 0 0 11 4zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10z"/>',
  event: '<path d="M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm12 7v10H5V9h14zM7 11v2h2v-2H7zm4 0v2h2v-2h-2zm4 0v2h2v-2h-2z"/>',
  box: '<path d="M12 2 3 6.5V17l9 5 9-5V6.5L12 2zm0 2.3 6.1 3L12 10.6 5.9 7.3 12 4.3zM5 8.9l6 3.3v6.6l-6-3.3V8.9zm14 0v6.6l-6 3.3v-6.6l6-3.3z"/>',
  build: '<path d="M3 17.2 12.3 8l-1-1a3.5 3.5 0 0 0-4.8-4.4l2.6 2.6-1.4 1.4L5 4A3.5 3.5 0 0 0 9.5 9l1 1L1.3 19.2 3 21l9.2-9.2 1 1L21 4.8V2h-2.8l-8.4 8.4-1-1L17.9 1H21v3.1l-6.8 6.8 1.4 1.4L23 5.5V0h-5.5L8.3 9.2 3 14.5v2.7z"/>',
  broom: '<path d="M14.5 2.3 9.8 7l3.2 3.2 4.7-4.7-3.2-3.2zM8.4 8.4l-1 1c-1 1-1.4 2.5-1 3.9L3 17.7 6.3 21l4.4-3.4c1.4.4 2.9 0 3.9-1l1-1-7.2-7.2zM6 18l-1-1 3-2.3 0 0L6 18z"/>',
  shield: '<path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3zm-1.2 13.4-3.2-3.2 1.4-1.4 1.8 1.8 4-4 1.4 1.4-5.4 5.4z"/>',
  free: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm-.5 2v1.2c-1.4.2-2.5 1.1-2.5 2.6 0 1.7 1.5 2.3 2.8 2.7 1.1.3 1.4.6 1.4 1.1 0 .4-.4.9-1.3.9-1 0-1.6-.4-1.7-1.1H8.4c.1 1.3 1 2.2 2.6 2.4V18h1.5v-1.7c1.5-.2 2.6-1.1 2.6-2.6 0-1.8-1.6-2.4-2.9-2.7-1.1-.3-1.3-.6-1.3-1 0-.4.3-.8 1.1-.8.9 0 1.3.4 1.4 1h1.8c-.1-1.2-.9-2.1-2.3-2.3V6h-1.4z"/>',
  pin: '<path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/>',
  clock: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm-1 3v6l5 3 .8-1.3-4.3-2.5V7H11z"/>',
  check: '<path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>',
  compare: '<path d="M10 3v2H5l4 5-4 5h5v6h2V3h-2zm4 4v10h5l-4-5 4-5h-5z"/>',
  building: '<path d="M3 21V3h12v18H3zm14 0V8h4v13h-4zM6 6v2h2V6H6zm4 0v2h2V6h-2zM6 10v2h2v-2H6zm4 0v2h2v-2h-2zM6 14v2h2v-2H6zm4 0v2h2v-2h-2zm-4 4v3h6v-3H6z"/>',
  edit: '<path d="M3 17.2V21h3.8L18 9.8l-3.8-3.8L3 17.2zM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8L18.9 9 20.7 7z"/>',
  doc: '<path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6zm7 1.5L18.5 9H13V3.5zM8 12h8v2H8v-2zm0 4h8v2H8v-2z"/>',
  empty: '<path d="M4 7h16v13H4V7zm2 2v9h12V9H6zm1-5h10l2 3H5l2-3z"/>'
};

/** 24x24 ベースの SVG アイコン要素を返す。 */
function svgIcon(name, size) {
  const path = ICONS[name] || "";
  const s = size || 24;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", s);
  svg.setAttribute("height", s);
  svg.setAttribute("fill", "currentColor");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = path; // ICONS は定数のみ
  return svg;
}

/** 企業名から表示用の頭文字（モノグラム）を取り出す。 */
function monogramChar(name) {
  const cleaned = String(name || "").replace(/^(株式会社|合同会社|有限会社)/, "").trim();
  return (cleaned || name || "?").charAt(0);
}

/** モノグラム・アバター要素を生成（accent 色のグラデーション）。 */
function createAvatar(company, sizeClass) {
  const color = company.accent || "#2f6bff";
  const node = el("div", { class: "avatar" + (sizeClass ? " " + sizeClass : "") });
  node.style.background =
    "linear-gradient(150deg, " + color + ", " + shade(color, -18) + ")";
  node.textContent = monogramChar(company.name);
  node.setAttribute("aria-hidden", "true");
  return node;
}

/** HEX 色を相対的に明暗調整。 */
function shade(hex, percent) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!m) return hex;
  const adj = (v) => {
    const n = Math.round(parseInt(v, 16) * (1 + percent / 100));
    return Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  };
  return "#" + adj(m[1]) + adj(m[2]) + adj(m[3]);
}

/** 機能可否ピル（即日/単発）。 */
function featPill(label, on) {
  return el("span", { class: "feat-pill " + (on ? "on" : "off"), text: label });
}

/** キーワードをハイライトしながら node に追加（XSS 安全）。 */
function appendHighlighted(node, text, keyword) {
  const value = text || "";
  const kw = (keyword || "").trim();
  if (!kw) {
    node.appendChild(document.createTextNode(value));
    return;
  }
  const lower = value.toLowerCase();
  const target = kw.toLowerCase();
  let i = 0;
  let idx = lower.indexOf(target);
  while (idx !== -1) {
    if (idx > i) node.appendChild(document.createTextNode(value.slice(i, idx)));
    const mark = document.createElement("mark");
    mark.textContent = value.slice(idx, idx + target.length);
    node.appendChild(mark);
    i = idx + target.length;
    idx = lower.indexOf(target, i);
  }
  if (i < value.length) node.appendChild(document.createTextNode(value.slice(i)));
}

/**
 * 企業カード（一覧/トップ共通）。
 * @param {Object} c
 * @param {{keyword?:string, compare?:boolean}} [opts]
 */
function createCompanyCard(c, opts = {}) {
  const href = "company.html?id=" + encodeURIComponent(c.id);

  // ヘッダ：アバター＋会社名＋所在地
  const nameLink = el("a", { href });
  appendHighlighted(nameLink, c.name, opts.keyword);
  const nameEl = el("h3", { class: "cc-name" }, [nameLink]);
  if (c.featured) nameEl.appendChild(el("span", { class: "badge badge-featured", text: "注目" }));
  if (isRecentlyUpdated(c.updatedAt)) nameEl.appendChild(el("span", { class: "badge badge-new", text: "NEW" }));

  const head = el("div", { class: "cc-head" }, [
    nameEl,
    el("div", { class: "cc-loc", text: [c.prefecture, c.city].filter(Boolean).join(" ") })
  ]);
  const top = el("div", { class: "cc-top" }, [createAvatar(c), head]);

  // 説明
  const desc = el("p", { class: "cc-desc" });
  appendHighlighted(desc, c.description || "", opts.keyword);

  // タグ（カテゴリ／作業）
  const tags = el(
    "div",
    { class: "tags" },
    (c.services || []).slice(0, 4).map((s) => el("span", { class: "tag", text: s }))
  );

  // 機能ピル
  const feats = el("div", { class: "cc-feats" }, [
    featPill("即日対応", c.sameDay),
    featPill("単発OK", c.spot),
    el("span", { class: "feat-pill", text: "最低" + (c.minWorkers || 1) + "名〜" })
  ]);

  // フッタ：更新日＋比較チェック
  const updated = el("span", { class: "cc-updated", text: c.updatedAt ? "更新 " + c.updatedAt : "" });
  const foot = el("div", { class: "cc-foot" }, [updated]);
  if (opts.compare) {
    const cb = el("input", { type: "checkbox", "aria-label": "比較に追加" });
    cb.checked = getCompareIds().includes(c.id);
    cb.addEventListener("change", () => {
      if (cb.checked) addCompare(c.id);
      else removeCompare(c.id);
      document.dispatchEvent(new CustomEvent("compare:change"));
      if (cb.checked && !getCompareIds().includes(c.id)) cb.checked = false; // 上限超過時
    });
    const label = el("label", { class: "cc-compare" }, [cb, el("span", { text: "比較" })]);
    foot.appendChild(label);
  }

  return el("article", { class: "company-card" }, [top, desc, tags, feats, foot]);
}

/* ---------- 比較リスト（localStorage） ---------- */

function getCompareIds() {
  try {
    const raw = localStorage.getItem(COMPARE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.slice(0, MAX_COMPARE) : [];
  } catch (e) {
    return [];
  }
}

function setCompareIds(ids) {
  try {
    localStorage.setItem(COMPARE_KEY, JSON.stringify(ids.slice(0, MAX_COMPARE)));
  } catch (e) {
    /* localStorage 無効環境では無視 */
  }
}

function addCompare(id) {
  const ids = getCompareIds();
  if (ids.includes(id)) return true;
  if (ids.length >= MAX_COMPARE) return false;
  ids.push(id);
  setCompareIds(ids);
  return true;
}

function removeCompare(id) {
  setCompareIds(getCompareIds().filter((x) => x !== id));
}

function clearCompare() {
  setCompareIds([]);
}
