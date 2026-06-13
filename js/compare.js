/* =========================================================
   比較（compare.html）
   - 比較リスト（localStorage）の企業を横並び表示
   ========================================================= */
(function () {
  let ALL = [];
  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    const root = document.getElementById("compare-root");
    if (!root) return;
    // 共有リンク（?ids=a,b,c）があれば比較リストに取り込む
    const idsParam = getQueryParam("ids");
    if (idsParam) {
      const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, MAX_COMPARE);
      if (ids.length) setCompareIds(ids);
    }
    try {
      ALL = await loadCompanies();
    } catch (e) {
      root.innerHTML = "";
      root.appendChild(el("div", { class: "empty", text: "データの読み込みに失敗しました。" }));
      return;
    }
    render(root);
  }

  // 比較する行（属性）の定義
  const ROWS = [
    ["所在地", (c) => [c.prefecture, c.city].filter(Boolean).join(" ")],
    ["対応エリア", (c) => c.coverage || (c.areas || []).join("・") || "—"],
    ["業務カテゴリ", (c) => (c.categories || []).join("・") || "—"],
    ["対応作業", (c) => (c.services || []).join("・") || "—"],
    ["雇用・契約形態", (c) => (c.employmentTypes || []).join("・") || "—"],
    ["即日対応", (c) => (c.sameDay ? "○ 可" : "要相談"), true],
    ["単発・短期", (c) => (c.spot ? "○ 可" : "要相談"), true],
    ["最低手配人数", (c) => (c.minWorkers || 1) + " 名〜"],
    ["料金目安", (c) => c.priceNote || "—"],
    ["設立", (c) => (c.founded ? c.founded + " 年" : "—")],
    ["従業員規模", (c) => c.employees || "—"],
    ["営業時間", (c) => c.businessHours || "—"],
    ["許可番号", (c) => c.license || "—"]
  ];

  function render(root) {
    const ids = getCompareIds();
    const list = ids.map((id) => findCompany(ALL, id)).filter(Boolean);
    root.innerHTML = "";

    if (list.length < 1) {
      root.appendChild(
        el("div", { class: "empty" }, [
          el("div", { class: "empty-ic" }, [svgIcon("compare", 56)]),
          el("p", { class: "mt-0", text: "比較リストが空です。企業一覧で「比較」にチェックを入れてください（最大 " + MAX_COMPARE + " 社）。" }),
          el("a", { class: "btn", href: "companies.html", text: "企業一覧へ" })
        ])
      );
      return;
    }

    const table = el("table", { class: "compare-table" });

    // ヘッダ：会社
    const thead = el("thead");
    const hr = el("tr");
    hr.appendChild(el("th", { text: "項目" }));
    list.forEach((c) => {
      const link = el("a", { href: "company.html?id=" + encodeURIComponent(c.id) }, [document.createTextNode(c.name)]);
      const rm = el("button", { class: "ct-remove", type: "button", text: "× 比較から外す" });
      rm.addEventListener("click", () => {
        removeCompare(c.id);
        render(root);
      });
      hr.appendChild(
        el("th", { class: "ct-company" }, [
          createAvatar(c),
          el("div", {}, [link]),
          el("div", { class: "cc-loc", text: c.prefecture }),
          rm
        ])
      );
    });
    thead.appendChild(hr);
    table.appendChild(thead);

    // ボディ：属性行（2社以上のとき、値が異なる行を強調）
    const tbody = el("tbody");
    ROWS.forEach(([label, fn]) => {
      const vals = list.map((c) => fn(c));
      const isDiff = list.length >= 2 && new Set(vals).size > 1;
      const tr = el("tr", isDiff ? { class: "ct-diff" } : {});
      tr.appendChild(el("th", { scope: "row", text: label }));
      vals.forEach((v) => tr.appendChild(el("td", { text: v })));
      tbody.appendChild(tr);
    });

    // アクション行（公式サイト / 詳細）
    const trAction = el("tr", { class: "ct-action" });
    trAction.appendChild(el("th", { scope: "row", text: "リンク" }));
    list.forEach((c) => {
      const cell = el("td", { class: "stack-sm" }, [
        el("a", { class: "btn btn-sm btn-block", href: "company.html?id=" + encodeURIComponent(c.id), text: "詳細を見る" })
      ]);
      if (c.website) {
        cell.appendChild(el("a", { class: "btn btn-secondary btn-sm btn-block", href: c.website, target: "_blank", rel: "noopener nofollow", text: "公式サイト" }));
      }
      trAction.appendChild(cell);
    });
    tbody.appendChild(trAction);
    table.appendChild(tbody);

    // 「違いだけ表示」トグル（2社以上のとき）
    if (list.length >= 2) {
      const cb = el("input", { type: "checkbox", id: "only-diff" });
      cb.addEventListener("change", () => table.classList.toggle("only-diff", cb.checked));
      root.appendChild(
        el("div", { class: "compare-toolbar" }, [
          el("label", { class: "check" }, [cb, el("span", { text: "違いのある項目だけ表示する" })]),
          el("span", { class: "hint", text: "色付きの行は各社で内容が異なる項目です" })
        ])
      );
    }

    root.appendChild(el("div", { class: "compare-wrap" }, [table]));

    // 下部アクション
    const clear = el("button", { class: "btn btn-ghost", type: "button", text: "比較リストをクリア" });
    clear.addEventListener("click", () => {
      clearCompare();
      render(root);
    });

    // 共有リンクをコピー
    const shareUrl =
      location.origin + location.pathname + "?ids=" + list.map((c) => c.id).join(",");
    const share = el("button", { class: "btn btn-secondary", type: "button", text: "この比較リンクをコピー" });
    share.addEventListener("click", () => {
      const done = () => {
        share.textContent = "コピーしました";
        setTimeout(() => (share.textContent = "この比較リンクをコピー"), 1600);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(shareUrl).then(done, done);
      else done();
    });

    root.appendChild(
      el("div", { class: "list-toolbar", style: "margin-top:18px" }, [
        el("div", { class: "detail-actions", style: "margin:0" }, [
          el("a", { class: "btn btn-secondary", href: "companies.html", text: "企業一覧に戻って追加" }),
          share
        ]),
        clear
      ])
    );
  }
})();
