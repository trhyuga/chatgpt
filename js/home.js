/* トップページ用スクリプト：地域グリッドと注目企業を描画する。 */

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const companies = await loadCompanies();
    renderStats(companies);
    renderRegions(countByRegion(companies));
    renderPopularServices(companies);
    renderFeatured(companies);
  } catch (err) {
    renderRegions(countByRegion([]));
    const target = document.getElementById("featured");
    if (target) {
      target.appendChild(el("p", { class: "empty", text: err.message }));
    }
  }
});

/** 「数字で見る」掲載状況のサマリーを描画する。 */
function renderStats(companies) {
  const target = document.getElementById("stats");
  if (!target) return;
  const regionsWithCompanies = Object.values(countByRegion(companies)).filter(
    (n) => n > 0
  ).length;
  const items = [
    { num: companies.length, label: "掲載企業数" },
    { num: regionsWithCompanies, label: "対応エリア（地域）" },
    { num: collectServices(companies).length, label: "対応作業の種類" }
  ];
  items.forEach((item) => {
    target.appendChild(
      el("div", { class: "stat" }, [
        el("span", { class: "stat-num", text: String(item.num) }),
        el("span", { class: "stat-label", text: item.label })
      ])
    );
  });
}

/** 地域リンク（地域から探す）を、掲載件数つきで描画する。 */
function renderRegions(counts) {
  const grid = document.getElementById("region-grid");
  if (!grid) return;
  grid.replaceChildren();
  Object.keys(REGIONS).forEach((region) => {
    const count = counts[region] || 0;
    grid.appendChild(
      el(
        "a",
        { href: "companies.html?region=" + encodeURIComponent(region) },
        [
          el("span", { class: "region-name", text: region }),
          el("span", { class: "region-count", text: count + " 社" })
        ]
      )
    );
  });
}

/** ヒーロー下に「よく探される作業」チップ（出現頻度の高い作業）を描画する。 */
function renderPopularServices(companies) {
  const target = document.getElementById("hero-chips");
  if (!target) return;

  // 作業ごとの出現回数を数え、多い順に上位を表示
  const counts = {};
  companies.forEach((c) =>
    (c.services || []).forEach((s) => (counts[s] = (counts[s] || 0) + 1))
  );
  const top = Object.keys(counts)
    .sort((a, b) => counts[b] - counts[a])
    .slice(0, 5);

  top.forEach((service) => {
    target.appendChild(
      el("a", {
        class: "chip",
        href: "companies.html?service=" + encodeURIComponent(service),
        text: service
      })
    );
  });
}

/** 注目の掲載企業（featured 優先、不足分は先頭から補完）を描画する。 */
function renderFeatured(companies) {
  const target = document.getElementById("featured");
  if (!target) return;

  const LIMIT = 3;
  const featuredFirst = companies
    .filter((c) => c.featured)
    .concat(companies.filter((c) => !c.featured));
  const featured = featuredFirst.slice(0, LIMIT);

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
