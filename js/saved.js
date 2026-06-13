/* =========================================================
   気になる企業（saved.html）
   - localStorage に保存した「気になる」企業を一覧表示
   - 保存はこの端末のブラウザにのみ記録（PII やサーバ送信なし）
   ========================================================= */
(function () {
  let ALL = [];

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    const root = document.getElementById("saved-root");
    if (!root) return;
    try {
      ALL = await loadCompanies();
    } catch (e) {
      root.innerHTML = "";
      root.appendChild(el("div", { class: "empty", text: "データの読み込みに失敗しました。" }));
      return;
    }
    document.addEventListener("fav:change", () => render(root));
    render(root);
  }

  function render(root) {
    const ids = getFavIds();
    const list = ids.map((id) => findCompany(ALL, id)).filter(Boolean);

    // 既に存在しない ID は掃除しておく
    if (list.length !== ids.length) setFavIds(list.map((c) => c.id));

    const countEl = document.getElementById("saved-count");
    if (countEl) {
      countEl.innerHTML = "";
      if (list.length) {
        countEl.appendChild(el("strong", { text: String(list.length) }));
        countEl.appendChild(document.createTextNode(" 社を保存中です。あとからまとめて確認・比較できます。"));
      } else {
        countEl.appendChild(document.createTextNode("保存した企業を、あとからまとめて確認・比較できます。"));
      }
    }

    root.innerHTML = "";

    if (!list.length) {
      root.appendChild(
        el("div", { class: "empty" }, [
          el("div", { class: "empty-ic" }, [svgIcon("heart", 56)]),
          el("p", { class: "mt-0", text: "保存した企業はまだありません。" }),
          el("p", { class: "hint", text: "企業一覧やトップで♡を押すと、ここに保存されます（この端末のブラウザに記録）。" }),
          el("a", { class: "btn btn-secondary btn-sm", href: "companies.html", text: "企業を探す" })
        ])
      );
      return;
    }

    const clear = el("button", { class: "btn btn-ghost btn-sm", type: "button", text: "保存をすべて消去" });
    clear.addEventListener("click", () => {
      setFavIds([]);
      render(root);
    });
    root.appendChild(
      el("div", { class: "list-toolbar", style: "margin-bottom:14px" }, [
        el("span", { class: "hint", text: "保存はこの端末のブラウザに記録されます" }),
        clear
      ])
    );

    const grid = el("div", { class: "card-grid" });
    list.forEach((c) => grid.appendChild(createCompanyCard(c, { compare: true })));
    root.appendChild(grid);
  }
})();
