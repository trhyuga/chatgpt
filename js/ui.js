/* =========================================================
   共通 UI（全ページ）
   - JS 有効フラグ
   - スキップリンク / 現在地ナビ / モバイルメニュー
   - トップへ戻る / フッター著作権
   ========================================================= */
(function () {
  document.documentElement.classList.add("has-js");

  document.addEventListener("DOMContentLoaded", () => {
    insertSkipLink();
    insertSampleNotice();
    markActiveNav();
    setupMobileNav();
    setupBackToTop();
    insertCopyright();
    updateNavCounts();
  });

  /** サンプルデータ告知バー（実訪問者の誤認防止・閉じると記憶）。 */
  function insertSampleNotice() {
    const KEY = "asistia_sample_notice_dismissed";
    try {
      if (localStorage.getItem(KEY) === "1") return;
    } catch (e) {}
    const bar = document.createElement("div");
    bar.className = "sample-bar";
    const msg = document.createElement("span");
    msg.textContent =
      "ご注意：掲載中の企業情報は現在、表示確認用のサンプル（ダミー）です。実在企業の掲載は順次対応します。";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "sample-bar-close";
    close.setAttribute("aria-label", "この告知を閉じる");
    close.innerHTML = "&times;";
    close.addEventListener("click", () => {
      bar.remove();
      try {
        localStorage.setItem(KEY, "1");
      } catch (e) {}
    });
    bar.appendChild(msg);
    bar.appendChild(close);
    document.body.insertBefore(bar, document.body.firstChild);
  }

  // 保存・比較の件数が変わったらナビのバッジを更新
  document.addEventListener("fav:change", updateNavCounts);
  document.addEventListener("compare:change", updateNavCounts);

  /** ナビの「気になる」「比較する」に件数バッジを表示。 */
  function updateNavCounts() {
    const counters = {
      "saved.html": typeof getFavIds === "function" ? getFavIds : null,
      "compare.html": typeof getCompareIds === "function" ? getCompareIds : null
    };
    document.querySelectorAll(".nav a").forEach((a) => {
      const href = (a.getAttribute("href") || "").split("?")[0];
      const fn = counters[href];
      if (!fn) return;
      const n = fn().length;
      let badge = a.querySelector(".nav-count");
      if (n > 0) {
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "nav-count";
          a.appendChild(badge);
        }
        badge.textContent = String(n);
      } else if (badge) {
        badge.remove();
      }
    });
  }

  function insertSkipLink() {
    if (document.querySelector(".skip-link")) return;
    const main = document.querySelector("main") || document.querySelector(".container");
    if (main && !main.id) main.id = "main";
    const link = document.createElement("a");
    link.className = "skip-link";
    link.href = "#" + (main ? main.id : "main");
    link.textContent = "本文へスキップ";
    document.body.insertBefore(link, document.body.firstChild);
  }

  /** 現在ページのナビに aria-current を付与。 */
  function markActiveNav() {
    const path = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav a").forEach((a) => {
      const href = (a.getAttribute("href") || "").split("?")[0];
      if (!href || href.startsWith("http")) return;
      const isHome = (href === "index.html" || href === "") && (path === "" || path === "index.html");
      if (href === path || isHome) a.setAttribute("aria-current", "page");
    });
  }

  /** モバイル：ハンバーガーメニュー。 */
  function setupMobileNav() {
    const header = document.querySelector(".site-header");
    const nav = header && header.querySelector(".nav");
    if (!header || !nav) return;

    const btn = document.createElement("button");
    btn.className = "nav-toggle";
    btn.setAttribute("aria-label", "メニューを開閉");
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = "&#9776;";
    nav.parentNode.insertBefore(btn, nav);

    btn.addEventListener("click", () => {
      const open = header.classList.toggle("nav-open");
      btn.setAttribute("aria-expanded", String(open));
      btn.innerHTML = open ? "&times;" : "&#9776;";
    });
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a")) {
        header.classList.remove("nav-open");
        btn.setAttribute("aria-expanded", "false");
        btn.innerHTML = "&#9776;";
      }
    });
  }

  /** トップへ戻るボタン。 */
  function setupBackToTop() {
    const btn = document.createElement("button");
    btn.className = "back-to-top";
    btn.setAttribute("aria-label", "ページ上部へ戻る");
    btn.innerHTML = "&#8593;";
    document.body.appendChild(btn);
    btn.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: "smooth" })
    );
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        btn.classList.toggle("is-visible", window.scrollY > 500);
        ticking = false;
      });
    });
  }

  /** フッターに著作権表示（現在年）を追加。 */
  function insertCopyright() {
    const slot = document.querySelector(".footer-bottom .copyright");
    if (slot) slot.textContent = "© " + new Date().getFullYear() + " Asistia";
  }
})();
