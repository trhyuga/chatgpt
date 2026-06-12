/* 企業詳細ページ用スクリプト：?id= の企業を表示する。 */

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("detail");
  if (!container) return;

  const id = getQueryParam("id");
  if (!id) {
    container.appendChild(el("p", { class: "empty", text: "企業が指定されていません。" }));
    return;
  }

  let companies = [];
  let company;
  try {
    companies = await loadCompanies();
    company = companies.find((c) => c.id === id);
  } catch (err) {
    container.appendChild(el("p", { class: "empty", text: err.message }));
    return;
  }

  if (!company) {
    container.appendChild(
      el("p", { class: "empty", text: "指定された企業が見つかりませんでした。" })
    );
    container.appendChild(
      el("p", {}, [el("a", { class: "btn btn-secondary", href: "companies.html", text: "企業一覧へ戻る" })])
    );
    return;
  }

  renderDetail(container, company);
  renderRelated(container, relatedCompanies(companies, company, 3));
});

/** 企業詳細を描画する。 */
function renderDetail(container, c) {
  document.title = c.name + " | 軽作業ディレクトリ";

  // パンくず
  container.appendChild(
    el("div", { class: "breadcrumb" }, [
      el("a", { href: "index.html", text: "トップ" }),
      document.createTextNode(" › "),
      el("a", { href: "companies.html", text: "企業一覧" }),
      document.createTextNode(" › " + c.name)
    ])
  );

  const detail = el("div", { class: "detail" });

  // タイトル（新着バッジ付き）
  const titleChildren = [document.createTextNode(c.name)];
  if (isRecentlyUpdated(c.updatedAt)) {
    titleChildren.push(el("span", { class: "badge badge-new", text: "NEW" }));
  }
  detail.appendChild(el("h1", { style: "display:flex;align-items:center;gap:10px;flex-wrap:wrap" }, titleChildren));

  // 対応作業タグ
  detail.appendChild(
    el(
      "div",
      { class: "tags" },
      (c.services || []).map((s) => el("span", { class: "tag", text: s }))
    )
  );

  if (c.description) {
    detail.appendChild(el("p", { text: c.description }));
  }

  // 定義リスト
  const dl = el("dl");
  const location = [c.prefecture, c.city].filter(Boolean).join(" ");
  if (location) {
    dl.appendChild(el("dt", { text: "所在地" }));
    dl.appendChild(
      el("dd", {}, [
        document.createTextNode(location + "　"),
        el("a", {
          class: "map-link",
          href: mapsUrl(c),
          target: "_blank",
          rel: "noopener noreferrer",
          text: "地図で見る"
        })
      ])
    );
  } else {
    appendRow(dl, "所在地", "—");
  }
  appendRow(dl, "対応作業", (c.services || []).join("、") || "—");

  // 公開連絡先（URL ならリンク化）
  if (c.publicContact) {
    dl.appendChild(el("dt", { text: "公開連絡先" }));
    dl.appendChild(el("dd", {}, [contactNode(c.publicContact)]));
  }

  // 掲載元（出典）
  if (c.sourceUrl) {
    dl.appendChild(el("dt", { text: "掲載元（出典）" }));
    dl.appendChild(
      el("dd", {}, [
        el("a", { href: c.sourceUrl, target: "_blank", rel: "noopener noreferrer", text: c.sourceUrl })
      ])
    );
  }

  appendRow(dl, "最終更新日", c.updatedAt || "—");
  detail.appendChild(dl);

  // 掲載元の注意書き
  detail.appendChild(
    el("p", {
      class: "notice",
      text:
        "この情報は公開情報をもとに掲載しています。掲載内容の修正・削除をご希望の企業さまは、" +
        "下記の依頼ボタンよりお知らせください。速やかに対応します。"
    })
  );

  // アクション（依頼・共有）
  const actions = el("div", { class: "detail-actions" });
  actions.appendChild(
    el("a", {
      class: "btn btn-secondary",
      href: "request.html?type=削除&company=" + encodeURIComponent(c.name),
      text: "この情報の削除・修正を依頼する"
    })
  );
  actions.appendChild(createShareButton(c));
  detail.appendChild(actions);

  container.appendChild(detail);
}

/** 関連企業（同じ地域）を描画する。 */
function renderRelated(container, related) {
  if (!related || related.length === 0) return;
  const section = el("section", { class: "related" }, [
    el("h2", { text: "同じ地域の企業" }),
    el("div", { class: "card-grid" }, related.map((c) => createCompanyCard(c)))
  ]);
  container.appendChild(section);
}

/** 共有ボタン（Web Share API、無ければURLコピー）を生成する。 */
function createShareButton(c) {
  const btn = el("button", { class: "btn btn-ghost", type: "button", text: "共有する" });
  btn.addEventListener("click", async () => {
    const shareData = { title: c.name + " | 軽作業ディレクトリ", url: location.href };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(location.href);
        flash(btn, "URLをコピーしました");
      }
    } catch (_) {
      /* 共有キャンセル等は無視 */
    }
  });
  return btn;
}

/** ボタンのラベルを一時的に切り替えて完了を知らせる。 */
function flash(btn, message) {
  const original = btn.textContent;
  btn.textContent = message;
  setTimeout(() => (btn.textContent = original), 1800);
}

function appendRow(dl, label, value) {
  dl.appendChild(el("dt", { text: label }));
  dl.appendChild(el("dd", { text: value }));
}

/** 連絡先が URL ならリンク、そうでなければテキストとして返す。 */
function contactNode(contact) {
  if (/^https?:\/\//i.test(contact)) {
    return el("a", {
      href: contact,
      target: "_blank",
      rel: "noopener noreferrer",
      text: contact
    });
  }
  return document.createTextNode(contact);
}
