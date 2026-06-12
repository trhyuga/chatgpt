/* 企業一覧ページ用スクリプト：検索・地域/作業フィルタ・並び替え・一覧描画。 */

let ALL_COMPANIES = [];

document.addEventListener("DOMContentLoaded", async () => {
  const keywordInput = document.getElementById("f-keyword");
  const areaSelect = document.getElementById("f-area");
  const serviceSelect = document.getElementById("f-service");
  const sortSelect = document.getElementById("f-sort");
  const clearBtn = document.getElementById("clear-filters");

  try {
    ALL_COMPANIES = await loadCompanies();
  } catch (err) {
    showError(err.message);
    return;
  }

  buildAreaOptions(areaSelect);
  buildServiceOptions(serviceSelect, ALL_COMPANIES);
  applyInitialQuery(keywordInput, areaSelect, serviceSelect, sortSelect);

  [keywordInput, areaSelect, serviceSelect, sortSelect].forEach((elm) => {
    if (!elm) return;
    elm.addEventListener("input", render);
    elm.addEventListener("change", render);
  });

  if (clearBtn) clearBtn.addEventListener("click", clearFilters);

  render();
});

/** 地域・都道府県の選択肢を optgroup で構築する。 */
function buildAreaOptions(select) {
  if (!select) return;
  select.appendChild(el("option", { value: "", text: "すべての地域" }));
  Object.entries(REGIONS).forEach(([region, prefs]) => {
    const group = el("optgroup", { label: region });
    group.appendChild(el("option", { value: "region:" + region, text: region + "（全体）" }));
    prefs.forEach((p) => group.appendChild(el("option", { value: "pref:" + p, text: "　" + p })));
    select.appendChild(group);
  });
}

/** 対応作業（業種）の選択肢を構築する。 */
function buildServiceOptions(select, companies) {
  if (!select) return;
  select.appendChild(el("option", { value: "", text: "すべての作業" }));
  collectServices(companies).forEach((s) =>
    select.appendChild(el("option", { value: s, text: s }))
  );
}

/** URL クエリ（keyword / region / prefecture / service / sort）を初期値に反映する。 */
function applyInitialQuery(keywordInput, areaSelect, serviceSelect, sortSelect) {
  const keyword = getQueryParam("keyword");
  const region = getQueryParam("region");
  const prefecture = getQueryParam("prefecture");
  const service = getQueryParam("service");
  const sort = getQueryParam("sort");

  if (keyword && keywordInput) keywordInput.value = keyword;
  if (areaSelect) {
    if (prefecture) areaSelect.value = "pref:" + prefecture;
    else if (region) areaSelect.value = "region:" + region;
  }
  if (service && serviceSelect) serviceSelect.value = service;
  if (sort && sortSelect) sortSelect.value = sort;
}

/** 現在のフィルタ状態を読み取って一覧を再描画し、URL にも反映する。 */
function render() {
  const keyword = valueOf("f-keyword");
  const area = valueOf("f-area");
  const service = valueOf("f-service");
  const sort = valueOf("f-sort") || "updated";

  const opts = { keyword, service };
  if (area.startsWith("region:")) opts.region = area.slice("region:".length);
  else if (area.startsWith("pref:")) opts.prefecture = area.slice("pref:".length);

  let results = filterCompanies(ALL_COMPANIES, opts);
  results = sortCompanies(results, sort);

  syncUrl({ keyword, area, service, sort });

  const count = document.getElementById("result-count");
  if (count) {
    count.replaceChildren(
      el("strong", { text: String(results.length) }),
      document.createTextNode(" 件の企業が見つかりました")
    );
  }

  const list = document.getElementById("company-list");
  if (!list) return;
  list.replaceChildren();

  if (results.length === 0) {
    list.appendChild(
      el("p", { class: "empty", text: "条件に一致する企業が見つかりませんでした。条件を変えてお試しください。" })
    );
    return;
  }
  const grid = el(
    "div",
    { class: "card-grid" },
    results.map((c) => createCompanyCard(c, keyword))
  );
  list.appendChild(grid);
}

/** 現在のフィルタ状態を URL クエリへ反映する（共有・戻る操作に対応）。 */
function syncUrl({ keyword, area, service, sort }) {
  const params = new URLSearchParams();
  if (keyword) params.set("keyword", keyword);
  if (area.startsWith("region:")) params.set("region", area.slice("region:".length));
  else if (area.startsWith("pref:")) params.set("prefecture", area.slice("pref:".length));
  if (service) params.set("service", service);
  if (sort && sort !== "updated") params.set("sort", sort);

  const query = params.toString();
  const url = query ? "?" + query : location.pathname;
  history.replaceState(null, "", url);
}

/** すべてのフィルタを初期化する。 */
function clearFilters() {
  ["f-keyword", "f-area", "f-service"].forEach((id) => {
    const elm = document.getElementById(id);
    if (elm) elm.value = "";
  });
  const sort = document.getElementById("f-sort");
  if (sort) sort.value = "updated";
  render();
}

function valueOf(id) {
  const elm = document.getElementById(id);
  return elm ? elm.value : "";
}

function showError(message) {
  const list = document.getElementById("company-list");
  if (list) list.replaceChildren(el("p", { class: "empty", text: message }));
}
