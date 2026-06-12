/* =========================================================
   トップページ（index.html）
   - 統計 / カテゴリ / 地域 / 注目企業 / 人気の作業チップ
   ========================================================= */
(function () {
  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    bindSearch();
    let companies;
    try {
      companies = await loadCompanies();
    } catch (e) {
      const f = document.getElementById("featured");
      if (f) {
        f.innerHTML = "";
        f.appendChild(el("div", { class: "empty", text: "データの読み込みに失敗しました。時間をおいて再度お試しください。" }));
      }
      return;
    }
    renderStats(companies);
    renderCategories(companies);
    renderRegions(companies);
    renderFeatured(companies);
    renderChips(companies);
  }

  function bindSearch() {
    const form = document.getElementById("home-search");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const kw = (document.getElementById("home-keyword").value || "").trim();
      location.href = "companies.html" + (kw ? "?keyword=" + encodeURIComponent(kw) : "");
    });
  }

  function renderStats(companies) {
    const box = document.getElementById("stats");
    if (!box) return;
    const prefs = new Set(companies.map((c) => c.prefecture));
    const sameDay = companies.filter((c) => c.sameDay).length;
    const items = [
      { num: companies.length, unit: "社", label: "掲載企業数" },
      { num: prefs.size, unit: "都道府県", label: "対応エリア" },
      { num: CATEGORIES.length, unit: "分野", label: "業務カテゴリ" },
      { num: sameDay, unit: "社", label: "即日対応あり" }
    ];
    box.innerHTML = "";
    items.forEach((it) => {
      box.appendChild(
        el("div", { class: "stat" }, [
          el("div", { class: "stat-num" }, [
            document.createTextNode(String(it.num)),
            el("span", { class: "unit", text: it.unit })
          ]),
          el("div", { class: "stat-label", text: it.label })
        ])
      );
    });
  }

  function renderCategories(companies) {
    const box = document.getElementById("cat-grid");
    if (!box) return;
    const counts = countByCategory(companies);
    box.innerHTML = "";
    CATEGORIES.forEach((cat) => {
      const ic = el("div", { class: "cat-ic" }, [svgIcon(cat.icon, 26)]);
      box.appendChild(
        el(
          "a",
          { class: "cat-card", href: "companies.html?category=" + encodeURIComponent(cat.key) },
          [
            ic,
            el("div", { class: "cat-name", text: cat.label }),
            el("div", { class: "cat-sub", text: cat.sub }),
            el("div", { class: "cat-sub", text: (counts[cat.key] || 0) + " 社" })
          ]
        )
      );
    });
  }

  function renderRegions(companies) {
    const box = document.getElementById("region-grid");
    if (!box) return;
    const counts = countByRegion(companies);
    box.innerHTML = "";
    Object.keys(REGIONS).forEach((region) => {
      box.appendChild(
        el("a", { class: "region-card", href: "companies.html?region=" + encodeURIComponent(region) }, [
          el("span", { text: region }),
          el("span", { class: "region-count", text: (counts[region] || 0) + "社" })
        ])
      );
    });
  }

  function renderFeatured(companies) {
    const box = document.getElementById("featured");
    if (!box) return;
    const featured = companies.filter((c) => c.featured).slice(0, 3);
    const list = featured.length ? featured : companies.slice(0, 3);
    box.className = "card-grid";
    box.innerHTML = "";
    list.forEach((c) => box.appendChild(createCompanyCard(c)));
  }

  function renderChips(companies) {
    const box = document.getElementById("hero-chips");
    if (!box) return;
    const services = collectServices(companies).slice(0, 6);
    services.forEach((s) => {
      box.appendChild(
        el("a", { class: "chip", href: "companies.html?keyword=" + encodeURIComponent(s), text: s })
      );
    });
  }
})();
