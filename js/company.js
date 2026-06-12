/* 企業詳細ページ用スクリプト：?id= の企業を表示する。 */

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("detail");
  if (!container) return;

  const id = getQueryParam("id");
  if (!id) {
    container.appendChild(el("p", { class: "empty", text: "企業が指定されていません。" }));
    return;
  }

  let company;
  try {
    const companies = await loadCompanies();
    company = companies.find((c) => c.id === id);
  } catch (err) {
    container.appendChild(el("p", { class: "empty", text: err.message }));
    return;
  }

  if (!company) {
    container.appendChild(
      el("p", { class: "empty", text: "指定された企業が見つかりませんでした。" })
    );
    return;
  }

  renderDetail(container, company);
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
  detail.appendChild(el("h1", { text: c.name }));

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
  appendRow(dl, "所在地", [c.prefecture, c.city].filter(Boolean).join(" ") || "—");
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
        "下記の依頼フォームよりお知らせください。速やかに対応します。"
    })
  );

  detail.appendChild(
    el("p", {}, [
      el("a", {
        class: "btn btn-secondary",
        href: "request.html?company=" + encodeURIComponent(c.name),
        text: "この情報の削除・修正を依頼する"
      })
    ])
  );

  container.appendChild(detail);
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
