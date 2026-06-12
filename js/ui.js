/* =========================================================
   共通UI（全ページ共通）
   - 本文へスキップリンクの挿入
   - 現在ページのナビ強調（aria-current）
   - モバイル用ハンバーガーメニュー
   - 「トップへ戻る」ボタン
   すべて段階的拡張（JS 無効でも素のページとして成立する）。
   ========================================================= */
(function () {
  "use strict";

  document.documentElement.classList.add("has-js");

  document.addEventListener("DOMContentLoaded", () => {
    insertSkipLink();
    markActiveNav();
    setupMobileNav();
    setupBackToTop();
  });

  /** 本文へスキップリンクを先頭に挿入し、main に id を付与する。 */
  function insertSkipLink() {
    const main = document.querySelector("main");
    if (main && !main.id) main.id = "main";

    const link = document.createElement("a");
    link.className = "skip-link";
    link.href = "#main";
    link.textContent = "本文へスキップ";
    document.body.insertBefore(link, document.body.firstChild);
  }

  /** 現在表示中のページに対応するナビリンクを強調する。 */
  function markActiveNav() {
    const current = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav a").forEach((a) => {
      const href = (a.getAttribute("href") || "").split("/").pop();
      if (href && href === current) a.setAttribute("aria-current", "page");
    });
  }

  /** ヘッダーにハンバーガーボタンを挿入し、ナビの開閉を制御する。 */
  function setupMobileNav() {
    const header = document.querySelector(".site-header");
    const nav = header && header.querySelector(".nav");
    if (!header || !nav) return;

    const btn = document.createElement("button");
    btn.className = "nav-toggle";
    btn.type = "button";
    btn.setAttribute("aria-label", "メニューを開閉");
    btn.setAttribute("aria-expanded", "false");
    btn.textContent = "☰";

    btn.addEventListener("click", () => {
      const open = header.classList.toggle("nav-open");
      btn.setAttribute("aria-expanded", String(open));
      btn.textContent = open ? "✕" : "☰";
    });

    // ナビ内リンクを押したら閉じる
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a")) {
        header.classList.remove("nav-open");
        btn.setAttribute("aria-expanded", "false");
        btn.textContent = "☰";
      }
    });

    nav.parentNode.insertBefore(btn, nav);
  }

  /** スクロール時に表示される「トップへ戻る」ボタンを用意する。 */
  function setupBackToTop() {
    const btn = document.createElement("button");
    btn.className = "back-to-top";
    btn.type = "button";
    btn.setAttribute("aria-label", "ページ上部へ戻る");
    btn.textContent = "↑";
    btn.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: "smooth" })
    );
    document.body.appendChild(btn);

    const onScroll = () => {
      btn.classList.toggle("is-visible", window.scrollY > 400);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
})();
