/* =========================================================
   共通データ・ユーティリティ
   - サンプル JSON の読み込み
   - 地域/都道府県の定義
   - 検索・フィルタ
   - 安全な DOM 生成ヘルパー（XSS 対策: textContent を使用）
   ========================================================= */

// データファイルのパス（Phase 2 でスプレッドシート連携に差し替え予定）
const DATA_URL = "data/companies.sample.json";

// 地域 → 都道府県（地域フィルタ用。地図の差し替えにも流用できるよう都道府県名で統一）
const REGIONS = {
  "北海道・東北": ["北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"],
  関東: ["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県"],
  中部: [
    "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
    "岐阜県", "静岡県", "愛知県"
  ],
  近畿: ["三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県"],
  "中国・四国": [
    "鳥取県", "島根県", "岡山県", "広島県", "山口県",
    "徳島県", "香川県", "愛媛県", "高知県"
  ],
  "九州・沖縄": [
    "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
  ]
};

/**
 * サンプル企業データを取得する。
 * @returns {Promise<Array>} 企業オブジェクトの配列
 */
async function loadCompanies() {
  const res = await fetch(DATA_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("データの読み込みに失敗しました (" + res.status + ")");
  }
  const json = await res.json();
  return Array.isArray(json.companies) ? json.companies : [];
}

/**
 * 企業配列を条件で絞り込む。
 * @param {Array} companies
 * @param {{keyword?: string, region?: string, prefecture?: string, service?: string}} opts
 * @returns {Array}
 */
function filterCompanies(companies, opts) {
  const keyword = (opts.keyword || "").trim().toLowerCase();
  const region = (opts.region || "").trim();
  const prefecture = (opts.prefecture || "").trim();
  const service = (opts.service || "").trim();

  return companies.filter((c) => {
    if (region && c.region !== region) return false;
    if (prefecture && c.prefecture !== prefecture) return false;
    if (service && !(c.services || []).includes(service)) return false;
    if (keyword) {
      const haystack = [
        c.name,
        c.description,
        c.prefecture,
        c.city,
        (c.services || []).join(" ")
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    return true;
  });
}

/** 全企業から、対応作業（service）の一覧を重複なしで取り出す。 */
function collectServices(companies) {
  const set = new Set();
  companies.forEach((c) => (c.services || []).forEach((s) => set.add(s)));
  return Array.from(set).sort();
}

/**
 * 安全に要素を生成するヘルパー。
 * テキストは textContent で挿入するため XSS の心配がない。
 * @param {string} tag
 * @param {Object} [attrs] - { class, href, text, ... }
 * @param {Array<Node>} [children]
 */
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value == null) return;
    if (key === "text") {
      node.textContent = value;
    } else if (key === "class") {
      node.className = value;
    } else {
      node.setAttribute(key, value);
    }
  });
  children.forEach((child) => child && node.appendChild(child));
  return node;
}

/** URL のクエリ文字列から値を取得する。 */
function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/** 企業カード（リンク付き）を生成する。 */
function createCompanyCard(c) {
  const tags = el(
    "div",
    { class: "tags" },
    (c.services || []).map((s) => el("span", { class: "tag", text: s }))
  );

  return el("article", { class: "company-card" }, [
    el("h3", {}, [
      el("a", { href: "company.html?id=" + encodeURIComponent(c.id), text: c.name })
    ]),
    el("div", { class: "location", text: [c.prefecture, c.city].filter(Boolean).join(" ") }),
    el("p", { class: "desc", text: c.description || "" }),
    tags
  ]);
}
