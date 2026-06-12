/* 掲載・修正・削除の依頼フォーム用スクリプト。
   現フェーズは送信先（バックエンド）未実装のため、入力検証＋デモ表示のみ。
   Phase 2 で送信処理を実装する。 */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("request-form");
  const result = document.getElementById("request-result");
  if (!form) return;

  // クエリから会社名・依頼種別を初期入力
  const company = getQueryParam("company");
  if (company) {
    const input = document.getElementById("company");
    if (input) input.value = company;
  }
  const type = getQueryParam("type");
  if (type) {
    const select = document.getElementById("type");
    if (select && Array.from(select.options).some((o) => o.value === type)) {
      select.value = type;
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearErrors(form);

    const companyInput = document.getElementById("company");
    const emailInput = document.getElementById("email");
    let ok = true;

    if (!companyInput.value.trim()) {
      showFieldError(companyInput, "会社名を入力してください。");
      ok = false;
    }
    if (!isValidEmail(emailInput.value)) {
      showFieldError(emailInput, "正しいメールアドレスを入力してください。");
      ok = false;
    }

    if (!ok) {
      if (result) result.style.display = "none";
      return;
    }

    // 送信処理は未実装（Phase 2 で実装）
    if (result) {
      result.style.display = "block";
      result.className = "notice notice-success";
      result.textContent =
        "ご依頼ありがとうございます。※現在は試作版のため送信機能は準備中です。" +
        "正式公開後、入力内容をもとに速やかに対応します。";
    }
    form.reset();
  });
});

/** 簡易メールアドレス検証。 */
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim());
}

/** 入力欄の下にエラーメッセージを表示する。 */
function showFieldError(input, message) {
  if (!input) return;
  input.classList.add("input-error");
  const msg = document.createElement("p");
  msg.className = "field-error";
  msg.textContent = message;
  input.insertAdjacentElement("afterend", msg);
}

/** 既存のエラー表示をすべて消す。 */
function clearErrors(form) {
  form.querySelectorAll(".field-error").forEach((e) => e.remove());
  form.querySelectorAll(".input-error").forEach((e) => e.classList.remove("input-error"));
}
