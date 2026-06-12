/* =========================================================
   企業一覧（companies.html）
   - サイドバー絞り込み（地域/都道府県/カテゴリ/雇用形態/機能/キーワード）
   - 並び替え / 絞り込みチップ / 比較選択・固定比較バー
   ========================================================= */
(function () {
  let ALL = [];
  const state = {
    keyword: "",
    region: "",
    prefecture: "",
    categories: new Set(),
    employment: new Set(),
    sameDay: false,
    spot: false,
    sort: "updated"
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    readUrl();
    try {
      ALL = await loadCompanies();
    } catch (e) {
      results().innerHTML = "";
      results().appendChild(el("div", { class: "empty", text: "データの読み込みに失敗しました。" }));
      return;
    }
    buildFilterPanel();
    buildCompareBar();
    bindToolbar();
    document.addEventListener("compare:change", renderCompareBar);
    render();
  }

  function results() {
    return document.getElementById("results");
  }

  function readUrl() {
    const p = new URLSearchParams(location.search);
    state.keyword = p.get("keyword") || "";
    state.region = p.get("region") || "";
    state.prefecture = p.get("prefecture") || "";
    if (p.get("category")) state.categories.add(p.get("category"));
    if (p.get("employment")) state.employment.add(p.get("employment"));
    if (p.get("sameDay") === "1") state.sameDay = true;
    if (p.get("spot") === "1") state.spot = true;
  }

  function syncUrl() {
    const p = new URLSearchParams();
    if (state.keyword) p.set("keyword", state.keyword);
    if (state.region) p.set("region", state.region);
    if (state.prefecture) p.set("prefecture", state.prefecture);
    if (state.categories.size === 1) p.set("category", [...state.categories][0]);
    const qs = p.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
  }

  /* ---------- 絞り込みパネル ---------- */
  function buildFilterPanel() {
    const panel = document.getElementById("filter-panel");
    if (!panel) return;
    panel.innerHTML = "";

    const reset = el("button", { class: "btn btn-ghost btn-sm", type: "button", text: "リセット" });
    reset.addEventListener("click", resetFilters);
    panel.appendChild(el("h2", {}, [el("span", { text: "絞り込み" }), reset]));

    // キーワード
    const kw = el("input", { type: "search", placeholder: "会社名・作業・地域", value: state.keyword, "aria-label": "キーワード" });
    kw.addEventListener("input", debounce(() => {
      state.keyword = kw.value.trim();
      render();
    }, 250));
    panel.appendChild(group("キーワード", [kw]));

    // 地域（ラジオ）
    const counts = countByRegion(ALL);
    const regionRows = [radioRow("すべての地域", state.region === "", ALL.length, () => onRegion(""))];
    Object.keys(REGIONS).forEach((r) =>
      regionRows.push(radioRow(r, state.region === r, counts[r] || 0, () => onRegion(r)))
    );
    panel.appendChild(group("地域", regionRows));

    // 都道府県（select：地域に連動）
    const prefSel = el("select", { "aria-label": "都道府県" });
    state._prefSel = prefSel;
    rebuildPref(prefSel);
    prefSel.addEventListener("change", () => {
      state.prefecture = prefSel.value;
      render();
    });
    panel.appendChild(group("都道府県", [prefSel]));

    // カテゴリ（チェック）
    const catCounts = countByCategory(ALL);
    const catRows = CATEGORIES.map((cat) =>
      checkRow(cat.label, state.categories.has(cat.key), catCounts[cat.key] || 0, (on) => {
        on ? state.categories.add(cat.key) : state.categories.delete(cat.key);
        render();
      })
    );
    panel.appendChild(group("業務カテゴリ", catRows));

    // 雇用形態
    const empRows = EMPLOYMENT_TYPES.map((t) =>
      checkRow(t, state.employment.has(t), null, (on) => {
        on ? state.employment.add(t) : state.employment.delete(t);
        render();
      })
    );
    panel.appendChild(group("雇用・契約形態", empRows));

    // こだわり条件
    const featRows = [
      checkRow("即日対応あり", state.sameDay, null, (on) => {
        state.sameDay = on;
        render();
      }),
      checkRow("単発・短期OK", state.spot, null, (on) => {
        state.spot = on;
        render();
      })
    ];
    panel.appendChild(group("こだわり条件", featRows));
  }

  function rebuildPref(sel) {
    sel.innerHTML = "";
    sel.appendChild(new Option("すべて", ""));
    const prefs = state.region ? REGIONS[state.region] : Object.values(REGIONS).flat();
    prefs.forEach((p) => sel.appendChild(new Option(p, p)));
    sel.value = state.prefecture && prefs.includes(state.prefecture) ? state.prefecture : "";
    if (sel.value === "") state.prefecture = "";
  }

  function onRegion(value) {
    state.region = value;
    state.prefecture = "";
    if (state._prefSel) rebuildPref(state._prefSel);
    render();
  }

  function group(label, children) {
    return el("div", { class: "filter-group" }, [el("div", { class: "fg-label", text: label }), ...children]);
  }

  function radioRow(label, checked, count, onChange) {
    const input = el("input", { type: "radio", name: "region-filter" });
    input.checked = checked;
    input.addEventListener("change", onChange);
    const row = el("label", { class: "opt-row" }, [input, el("span", { text: label })]);
    if (count != null) row.appendChild(el("span", { class: "cnt", text: String(count) }));
    return row;
  }

  function checkRow(label, checked, count, onChange) {
    const input = el("input", { type: "checkbox" });
    input.checked = checked;
    input.addEventListener("change", () => onChange(input.checked));
    const row = el("label", { class: "opt-row" }, [input, el("span", { text: label })]);
    if (count != null) row.appendChild(el("span", { class: "cnt", text: String(count) }));
    return row;
  }

  /* ---------- ツールバー ---------- */
  function bindToolbar() {
    const sortSel = document.getElementById("sort-select");
    if (sortSel) {
      sortSel.value = state.sort;
      sortSel.addEventListener("change", () => {
        state.sort = sortSel.value;
        render();
      });
    }
    const mtoggle = document.getElementById("filter-mobile-toggle");
    if (mtoggle) {
      mtoggle.addEventListener("click", () =>
        document.getElementById("filter-panel").classList.toggle("open")
      );
    }
  }

  /* ---------- 絞り込み実行 ---------- */
  function apply() {
    const filtered = filterCompanies(ALL, {
      keyword: state.keyword,
      region: state.region,
      prefecture: state.prefecture,
      employment: [...state.employment],
      sameDay: state.sameDay,
      spot: state.spot
    }).filter((c) => {
      if (state.categories.size === 0) return true;
      return (c.categories || []).some((k) => state.categories.has(k));
    });
    return sortCompanies(filtered, state.sort);
  }

  function render() {
    syncUrl();
    renderActiveChips();
    const list = apply();
    const box = results();
    const countEl = document.getElementById("result-count");
    if (countEl) {
      countEl.innerHTML = "";
      countEl.appendChild(el("strong", { text: String(list.length) }));
      countEl.appendChild(document.createTextNode(" 社が見つかりました"));
    }
    box.className = "card-grid";
    box.innerHTML = "";
    if (!list.length) {
      box.className = "";
      const resetBtn = el("button", { class: "btn btn-secondary btn-sm", type: "button", text: "条件をリセット" });
      resetBtn.addEventListener("click", resetFilters);
      box.appendChild(
        el("div", { class: "empty" }, [
          el("div", { class: "empty-ic" }, [svgIcon("empty", 56)]),
          el("p", { class: "mt-0", text: "条件に合う企業が見つかりませんでした。" }),
          resetBtn
        ])
      );
      return;
    }
    list.forEach((c) => box.appendChild(createCompanyCard(c, { keyword: state.keyword, compare: true })));
  }

  function renderActiveChips() {
    const box = document.getElementById("active-filters");
    if (!box) return;
    box.innerHTML = "";
    const chips = [];
    if (state.keyword) chips.push(["キーワード: " + state.keyword, () => { state.keyword = ""; syncInputs(); }]);
    if (state.region) chips.push(["地域: " + state.region, () => onRegion("")]);
    if (state.prefecture) chips.push([state.prefecture, () => { state.prefecture = ""; if (state._prefSel) state._prefSel.value = ""; render(); }]);
    state.categories.forEach((k) => chips.push(["分類: " + k, () => { state.categories.delete(k); buildFilterPanel(); render(); }]));
    state.employment.forEach((t) => chips.push(["形態: " + t, () => { state.employment.delete(t); buildFilterPanel(); render(); }]));
    if (state.sameDay) chips.push(["即日対応", () => { state.sameDay = false; buildFilterPanel(); render(); }]);
    if (state.spot) chips.push(["単発OK", () => { state.spot = false; buildFilterPanel(); render(); }]);

    chips.forEach(([label, onRemove]) => {
      const chip = el("button", { class: "chip-remove", type: "button" }, [
        el("span", { text: label }),
        el("b", { text: "×", "aria-hidden": "true" })
      ]);
      chip.addEventListener("click", onRemove);
      box.appendChild(chip);
    });
  }

  function syncInputs() {
    buildFilterPanel();
    render();
  }

  function resetFilters() {
    state.keyword = "";
    state.region = "";
    state.prefecture = "";
    state.categories.clear();
    state.employment.clear();
    state.sameDay = false;
    state.spot = false;
    buildFilterPanel();
    render();
  }

  /* ---------- 比較バー ---------- */
  function buildCompareBar() {
    const bar = el("div", { class: "compare-bar" });
    const container = el("div", { class: "container" });
    container.appendChild(el("div", { class: "compare-slots", id: "compare-slots" }));

    const actions = el("div", { class: "compare-actions" });
    actions.style.display = "flex";
    actions.style.gap = "8px";
    actions.style.alignItems = "center";

    const clearBtn = el("button", { class: "btn btn-ghost btn-sm", type: "button", text: "クリア" });
    clearBtn.style.color = "#fff";
    clearBtn.style.borderColor = "rgba(255,255,255,.3)";
    clearBtn.addEventListener("click", () => {
      clearCompare();
      render();
      renderCompareBar();
    });

    const go = el("a", { class: "btn btn-accent btn-sm", id: "compare-go", href: "compare.html" });
    actions.appendChild(clearBtn);
    actions.appendChild(go);
    container.appendChild(actions);
    bar.appendChild(container);
    document.body.appendChild(bar);
    renderCompareBar();
  }

  function renderCompareBar() {
    const bar = document.querySelector(".compare-bar");
    const slots = document.getElementById("compare-slots");
    const go = document.getElementById("compare-go");
    if (!bar || !slots) return;
    const ids = getCompareIds();
    slots.innerHTML = "";
    if (!ids.length) {
      bar.classList.remove("show");
      document.body.style.paddingBottom = "";
      return;
    }
    bar.classList.add("show");
    document.body.style.paddingBottom = "88px"; // 固定バーで最終行が隠れないように
    ids.forEach((id) => {
      const c = findCompany(ALL, id);
      if (!c) return;
      const rm = el("button", { type: "button", "aria-label": "比較から外す", text: "×" });
      rm.addEventListener("click", () => {
        removeCompare(id);
        render();
        renderCompareBar();
      });
      slots.appendChild(el("div", { class: "compare-slot" }, [el("span", { text: c.name }), rm]));
    });
    if (go) {
      go.textContent = ids.length < 2 ? "あと1社で比較" : "比較する（" + ids.length + "）";
      go.classList.toggle("disabled", ids.length < 2);
      if (ids.length < 2) {
        go.setAttribute("aria-disabled", "true");
        go.style.pointerEvents = "none";
        go.style.opacity = "0.6";
      } else {
        go.removeAttribute("aria-disabled");
        go.style.pointerEvents = "";
        go.style.opacity = "";
      }
    }
  }

  function debounce(fn, ms) {
    let t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }
})();
