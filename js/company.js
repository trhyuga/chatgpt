/* =========================================================
   企業詳細（company.html?id=...）
   - スペック表 / 強み / サイドカード / 関連企業 / 比較追加
   ========================================================= */
(function () {
  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    const root = document.getElementById("company-root");
    if (!root) return;
    const id = getQueryParam("id");
    let companies;
    try {
      companies = await loadCompanies();
    } catch (e) {
      root.innerHTML = "";
      root.appendChild(el("div", { class: "empty", text: "データの読み込みに失敗しました。" }));
      return;
    }
    const c = findCompany(companies, id);
    if (!c) {
      renderNotFound(root);
      return;
    }
    document.title = c.name + " | Asistia";
    setMeta(c);
    injectJsonLd(c);
    render(root, c, companies);
  }

  /** 構造化データ（JSON-LD / Organization）を埋め込む。値は JSON.stringify で安全に出力。 */
  function injectJsonLd(c) {
    const data = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: c.name,
      description: c.description || "",
      areaServed: c.coverage || (c.areas || []).join("、"),
      address: {
        "@type": "PostalAddress",
        addressRegion: c.prefecture || "",
        addressLocality: c.city || "",
        addressCountry: "JP"
      },
      url: c.website || undefined,
      foundingDate: c.founded ? String(c.founded) : undefined
    };
    const head =
      document.head ||
      (typeof document.getElementsByTagName === "function" && document.getElementsByTagName("head")[0]);
    if (!head) return;
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.textContent = JSON.stringify(data);
    head.appendChild(s);
  }

  function setMeta(c) {
    const d = document.querySelector('meta[name="description"]');
    if (d) d.setAttribute("content", c.name + "（" + [c.prefecture, c.city].filter(Boolean).join("") + "）の対応業務・エリア・雇用形態・即日/単発対応などの掲載情報。" + (c.description || ""));
  }

  function render(root, c, companies) {
    root.innerHTML = "";

    // パンくず
    root.appendChild(
      el("nav", { class: "breadcrumb", "aria-label": "パンくず" }, [
        el("a", { href: "index.html", text: "ホーム" }),
        el("span", { class: "sep", text: "›" }),
        el("a", { href: "companies.html", text: "企業一覧" }),
        el("span", { class: "sep", text: "›" }),
        el("a", { href: "companies.html?region=" + encodeURIComponent(c.region), text: c.region }),
        el("span", { class: "sep", text: "›" }),
        el("span", { text: c.name })
      ])
    );

    // ヒーロー
    const nameEl = el("h1", {}, [document.createTextNode(c.name)]);
    if (c.featured) nameEl.appendChild(el("span", { class: "badge badge-featured", text: " 注目" }));
    if (isRecentlyUpdated(c.updatedAt)) nameEl.appendChild(el("span", { class: "badge badge-new", text: "NEW" }));

    const feats = el("div", { class: "cc-feats" }, [
      featPill("即日対応", c.sameDay),
      featPill("単発・短期OK", c.spot),
      el("span", { class: "feat-pill", text: "最低 " + (c.minWorkers || 1) + " 名〜" }),
      el("span", { class: "feat-pill", text: (c.employmentTypes || []).join(" / ") })
    ]);

    const dhMain = el("div", { class: "dh-main" }, [
      nameEl,
      c.nameKana ? el("p", { class: "dh-kana", text: c.nameKana }) : null,
      el("p", { class: "dh-loc", text: "📍 " + [c.prefecture, c.city].filter(Boolean).join(" ") + "（対応エリア：" + (c.coverage || "—") + "）" }),
      feats
    ]);

    root.appendChild(el("div", { class: "detail-hero" }, [createAvatar(c, "lg"), dhMain]));

    // 本文 2 カラム
    const main = el("div", {});

    // 概要
    main.appendChild(
      el("section", { class: "panel" }, [
        el("h2", { text: "事業の概要" }),
        el("p", { class: "mt-0", text: c.description || "" }),
        el("div", { class: "tags" }, (c.services || []).map((s) => el("span", { class: "tag", text: s })))
      ])
    );

    // 強み
    if ((c.strengths || []).length) {
      main.appendChild(
        el("section", { class: "panel" }, [
          el("h2", { text: "この企業の強み" }),
          el("ul", { class: "strength-list" }, c.strengths.map((s) => el("li", { text: s })))
        ])
      );
    }

    // スペック表
    main.appendChild(
      el("section", { class: "panel" }, [
        el("h2", { text: "基本情報・対応条件" }),
        specTable(c)
      ])
    );

    // 出典・注意
    main.appendChild(
      el("div", { class: "notice", text: "本ページは公開情報をもとに作成したサンプル掲載です。内容の修正・削除はいつでも依頼できます（無料）。" })
    );

    // サイド
    const side = el("aside", { class: "side-card" }, [actionCard(c), quickFacts(c)]);

    root.appendChild(el("div", { class: "detail-grid" }, [main, side]));

    // 関連企業
    const related = relatedCompanies(companies, c, 3);
    if (related.length) {
      const grid = el("div", { class: "card-grid" }, related.map((r) => createCompanyCard(r)));
      root.appendChild(
        el("section", { class: "section tight" }, [
          el("div", { class: "section-head" }, [el("h2", { text: "同じ地域の他の企業" })]),
          grid
        ])
      );
    }
  }

  function specTable(c) {
    const rows = [
      ["対応エリア", c.coverage || (c.areas || []).join("・") || "—"],
      ["業務カテゴリ", (c.categories || []).join("・") || "—"],
      ["対応作業", (c.services || []).join("・") || "—"],
      ["雇用・契約形態", (c.employmentTypes || []).join("・") || "—"],
      ["即日対応", c.sameDay ? "可" : "要相談"],
      ["単発・短期", c.spot ? "可" : "要相談"],
      ["最低手配人数", (c.minWorkers || 1) + " 名〜"],
      ["料金目安", c.priceNote || "—"],
      ["設立", c.founded ? c.founded + " 年" : "—"],
      ["従業員規模", c.employees || "—"],
      ["営業時間", c.businessHours || "—"],
      ["許可番号", c.license || "—"],
      ["最終更新", c.updatedAt || "—"]
    ];
    const dl = el("dl", { class: "spec" });
    rows.forEach(([k, v]) => {
      dl.appendChild(el("dt", { text: k }));
      dl.appendChild(el("dd", { text: v }));
    });
    return dl;
  }

  function actionCard(c) {
    const actions = el("div", { class: "stack-sm" });

    if (c.website) {
      actions.appendChild(el("a", { class: "btn btn-block", href: c.website, target: "_blank", rel: "noopener nofollow", text: "公式サイトを見る" }));
    }
    if (c.publicContact) {
      actions.appendChild(el("a", { class: "btn btn-secondary btn-block", href: c.publicContact, target: "_blank", rel: "noopener nofollow", text: "問い合わせ先（公開情報）" }));
    }
    actions.appendChild(el("a", { class: "btn btn-secondary btn-block", href: mapsUrl(c), target: "_blank", rel: "noopener", text: "地図で見る" }));

    // 比較に追加
    const cmpBtn = el("button", { class: "btn btn-ghost btn-block", type: "button" });
    const refresh = () => {
      const inList = getCompareIds().includes(c.id);
      cmpBtn.textContent = inList ? "比較リストから外す" : "比較リストに追加";
    };
    cmpBtn.addEventListener("click", () => {
      if (getCompareIds().includes(c.id)) removeCompare(c.id);
      else if (!addCompare(c.id)) alert("比較は最大 " + MAX_COMPARE + " 社までです。");
      refresh();
    });
    refresh();
    actions.appendChild(cmpBtn);

    return el("section", { class: "panel" }, [
      el("h2", { text: "この企業について" }),
      actions,
      el("p", { class: "hint", style: "margin-top:12px", text: "出典：" }),
      el("a", { href: c.sourceUrl || "#", target: "_blank", rel: "noopener nofollow", text: c.sourceUrl || "—", style: "font-size:.82rem;word-break:break-all" })
    ]);
  }

  function quickFacts(c) {
    const kv = (k, v) => el("div", { class: "kv" }, [el("span", { class: "k", text: k }), el("span", { class: "v", text: v })]);
    return el("section", { class: "panel" }, [
      el("h2", { text: "クイック情報" }),
      kv("即日対応", c.sameDay ? "○" : "要相談"),
      kv("単発・短期", c.spot ? "○" : "要相談"),
      kv("最低人数", (c.minWorkers || 1) + "名〜"),
      kv("設立", c.founded ? c.founded + "年" : "—"),
      kv("規模", c.employees || "—")
    ]);
  }

  function renderNotFound(root) {
    document.title = "企業が見つかりません | Asistia";
    root.innerHTML = "";
    root.appendChild(
      el("div", { class: "empty" }, [
        el("div", { class: "empty-ic" }, [svgIcon("empty", 56)]),
        el("p", { class: "mt-0", text: "指定された企業が見つかりませんでした。" }),
        el("a", { class: "btn btn-secondary btn-sm", href: "companies.html", text: "企業一覧へ戻る" })
      ])
    );
  }
})();
