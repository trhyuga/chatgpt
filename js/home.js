/* トップページ用スクリプト：地域グリッドと注目企業を描画する。 */

document.addEventListener("DOMContentLoaded", async () => {
  renderRegions();

  try {
    const companies = await loadCompanies();
    renderFeatured(companies);
  } catch (err) {
    const target = document.getElementById("featured");
    if (target) {
      target.appendChild(el("p", { class: "empty", text: err.message }));
    }
  }
});

/** 地域リンク（地域から探す）を描画する。 */
function renderRegions() {
  const grid = document.getElementById("region-grid");
  if (!grid) return;
  Object.keys(REGIONS).forEach((region) => {
    grid.appendChild(
      el("a", {
        href: "companies.html?region=" + encodeURIComponent(region),
        text: region
      })
    );
  });
}

/** 注目の掲載企業（先頭から数件）を描画する。 */
function renderFeatured(companies) {
  const target = document.getElementById("featured");
  if (!target) return;
  const featured = companies.slice(0, 3);
  if (featured.length === 0) {
    target.appendChild(el("p", { class: "empty", text: "掲載企業がまだありません。" }));
    return;
  }
  const grid = el("div", { class: "card-grid" }, featured.map(createCompanyCard));
  target.appendChild(grid);
}

/** トップの検索フォーム送信時に一覧ページへ遷移する。 */
function onHomeSearch(event) {
  event.preventDefault();
  const input = document.getElementById("home-keyword");
  const keyword = input ? input.value.trim() : "";
  const url = keyword
    ? "companies.html?keyword=" + encodeURIComponent(keyword)
    : "companies.html";
  window.location.href = url;
}
