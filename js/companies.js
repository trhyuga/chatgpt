/* 企業一覧ページ用スクリプト：検索・地域/作業フィルタと一覧描画。 */

let ALL_COMPANIES = [];

document.addEventListener("DOMContentLoaded", async () => {
  const keywordInput = document.getElementById("f-keyword");
  const areaSelect = document.getElementById("f-area");
  const serviceSelect = document.getElementById("f-service");

  try {
    ALL_COMPANIES = await loadCompanies();
  } catch (err) {
    showError(err.message);
    return;
  }

  buildAreaOptions(areaSelect);
  buildServiceOptions(serviceSelect, ALL_COMPANIES);
  applyInitialQuery(keywordInput, areaSelect, serviceSelect);

  [keywordInput, areaSelect, serviceSelect].forEach((elm) => {
    if (!elm) return;
    elm.addEventListener("input", render);
    elm.addEventListener("change", render);
  });

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

/** URL クエリ（keyword / region / prefecture / service）を初期値に反映する。 */
function applyInitialQuery(keywordInput, areaSelect, serviceSelect) {
  const keyword = getQueryParam("keyword");
  const region = getQueryParam("region");
  const prefecture = getQueryParam("prefecture");
  const service = getQueryParam("service");

  if (keyword && keywordInput) keywordInput.value = keyword;
  if (areaSelect) {
    if (prefecture) areaSelect.value = "pref:" + prefecture;
    else if (region) areaSelect.value = "region:" + region;
  }
  if (service && serviceSelect) serviceSelect.value = service;
}

/** 現在のフィルタ状態を読み取って一覧を再描画する。 */
function render() {
  const keyword = valueOf("f-keyword");
  const area = valueOf("f-area");
  const service = valueOf("f-service");

  const opts = { keyword, service };
  if (area.startsWith("region:")) opts.region = area.slice("region:".length);
  else if (area.startsWith("pref:")) opts.prefecture = area.slice("pref:".length);

  const results = filterCompanies(ALL_COMPANIES, opts);

  const count = document.getElementById("result-count");
  if (count) count.textContent = results.length + " 件の企業が見つかりました";

  const list = document.getElementById("company-list");
  if (!list) return;
  list.replaceChildren();

  if (results.length === 0) {
    list.appendChild(
      el("p", { class: "empty", text: "条件に一致する企業が見つかりませんでした。" })
    );
    return;
  }
  const grid = el("div", { class: "card-grid" }, results.map(createCompanyCard));
  list.appendChild(grid);
}

function valueOf(id) {
  const elm = document.getElementById(id);
  return elm ? elm.value : "";
}

function showError(message) {
  const list = document.getElementById("company-list");
  if (list) list.appendChild(el("p", { class: "empty", text: message }));
}
