/* =========================================================
   掲載の新規登録 / 編集（register.html, edit.html 共用）
   - フォームを動的生成し、バリデーション・下書き保存・送信を行う
   - 送信先は SUBMIT_ENDPOINT（Google Apps Script Web App）。未設定なら
     内容確認＋下書き保存までを行う（秘密情報はクライアントに置かない設計）
   ========================================================= */
(function () {
  const DRAFT_KEY = "asistia_register_draft";
  const EMPLOYEE_OPTIONS = ["", "1〜10名", "10〜50名", "50〜100名", "100〜300名", "300名以上"];

  let editing = null; // 編集対象の企業（あれば）

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    const form = document.getElementById("company-form");
    if (!form) return;

    const id = getQueryParam("id");
    if (id) {
      try {
        const companies = await loadCompanies();
        editing = findCompany(companies, id);
      } catch (e) {
        editing = null;
      }
      const title = document.getElementById("form-title");
      if (editing && title) title.textContent = "掲載内容の編集";
    }

    buildForm(form);
    const initial = editing || loadDraft();
    if (initial) fill(form, initial);

    form.addEventListener("submit", onSubmit);

    const saveBtn = document.getElementById("save-draft");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        saveDraft(collect(form));
        toast("下書きを保存しました（この端末のブラウザに保存されます）");
      });
    }
  }

  /* ---------- フォーム生成 ---------- */
  function buildForm(form) {
    form.innerHTML = "";

    form.appendChild(fieldset("基本情報", [
      textField("name", "会社名", { required: true, placeholder: "例：サンプル軽作業サービス株式会社" }),
      textField("nameKana", "ふりがな", { placeholder: "例：サンプルケイサギョウサービス" }),
      row([
        selectField("region", "地域", ["", ...Object.keys(REGIONS)], { required: true }),
        selectField("prefecture", "都道府県", [""], { required: true })
      ]),
      textField("city", "市区町村", { required: true, placeholder: "例：新宿区" })
    ]));

    form.appendChild(fieldset("対応業務", [
      checkGridField("categories", "業務カテゴリ", CATEGORIES.map((c) => c.key), { required: true, hint: "1つ以上選択してください" }),
      textField("services", "対応作業（カンマ区切り）", { placeholder: "例：イベント設営, 搬入出, 会場撤去", hint: "「,」で区切って複数入力できます" }),
      checkGridField("employmentTypes", "雇用・契約形態", EMPLOYMENT_TYPES, {})
    ]));

    form.appendChild(fieldset("対応条件", [
      textField("coverage", "対応エリア（記述）", { placeholder: "例：東京・神奈川・埼玉・千葉" }),
      row([
        toggleField("sameDay", "即日対応あり"),
        toggleField("spot", "単発・短期OK")
      ]),
      row([
        numberField("minWorkers", "最低手配人数（名）", { min: 1, placeholder: "1" }),
        numberField("founded", "設立年（西暦）", { min: 1900, max: 2100, placeholder: "2015" })
      ]),
      row([
        selectField("employees", "従業員規模", EMPLOYEE_OPTIONS, {}),
        textField("businessHours", "営業時間", { placeholder: "例：9:00〜18:00（平日）" })
      ]),
      textField("priceNote", "料金目安（公開可能な範囲）", { placeholder: "例：応相談" }),
      textField("license", "派遣業/職業紹介の許可番号", { placeholder: "例：（般）13-000000", hint: "公開情報として任意で記載できます" })
    ]));

    form.appendChild(fieldset("紹介文・強み", [
      textareaField("description", "事業の概要", { required: true, placeholder: "提供しているサービスや得意分野を記載してください。" }),
      textareaField("strengths", "強み（1行に1つ）", { placeholder: "例：\n即日のスタッフ手配に対応\n1名から相談可能\n品質管理に注力", hint: "改行で区切ると箇条書きとして表示されます" })
    ]));

    form.appendChild(fieldset("公開・連絡先", [
      textField("website", "公式サイト URL", { type: "url", placeholder: "https://example.com" }),
      textField("publicContact", "問い合わせ先（URL/電話）", { placeholder: "https://example.com/contact" }),
      textField("sourceUrl", "出典 URL", { type: "url", required: true, placeholder: "https://example.com/about", hint: "掲載の根拠となる公開ページ（自社サイト等）。掲載ポリシー上、出典の明記が必要です" })
    ]));

    // 同意
    const agree = el("label", { class: "check" }, [
      Object.assign(el("input", { type: "checkbox", id: "f-agree" })),
      el("span", { text: "掲載内容は公開可能な法人情報であり、個人情報を含まないことを確認しました。" })
    ]);
    const agreeErr = el("p", { class: "field-error hidden", id: "err-agree", text: "確認のうえチェックしてください。" });
    form.appendChild(el("div", { class: "field" }, [agree, agreeErr]));

    // 地域→都道府県 連動
    const regionSel = form.querySelector("#f-region");
    const prefSel = form.querySelector("#f-prefecture");
    if (regionSel && prefSel) {
      const fillPref = () => {
        const cur = prefSel.value;
        prefSel.innerHTML = "";
        prefSel.appendChild(new Option("選択してください", ""));
        const prefs = regionSel.value ? REGIONS[regionSel.value] : Object.values(REGIONS).flat();
        prefs.forEach((p) => prefSel.appendChild(new Option(p, p)));
        if (prefs.includes(cur)) prefSel.value = cur;
      };
      regionSel.addEventListener("change", fillPref);
      fillPref();
    }

    // ボタン
    const submit = el("button", { class: "btn btn-accent btn-lg", type: "submit", text: editing ? "この内容で更新を申請する" : "この内容で掲載を申請する" });
    const draft = el("button", { class: "btn btn-ghost", type: "button", id: "save-draft", text: "下書き保存" });
    form.appendChild(el("div", { class: "detail-actions", style: "margin-top:8px" }, [submit, draft]));
  }

  /* ---------- フィールド部品 ---------- */
  function fieldset(legend, children) {
    return el("section", { class: "panel" }, [el("h2", { text: legend }), ...children]);
  }
  function row(children) {
    const r = el("div", {});
    r.style.display = "grid";
    r.style.gridTemplateColumns = "repeat(auto-fit, minmax(180px, 1fr))";
    r.style.gap = "14px";
    children.forEach((c) => r.appendChild(c));
    return r;
  }
  function labelEl(forId, text, required, hint) {
    const l = el("label", { for: forId, text: text });
    if (required) l.appendChild(el("span", { class: "req", text: "必須" }));
    else l.appendChild(el("span", { class: "opt", text: "任意" }));
    return l;
  }
  function wrap(id, label, input, opts) {
    const field = el("div", { class: "field" }, [labelEl(id, label, opts.required, opts.hint), input]);
    if (opts.hint) field.appendChild(el("p", { class: "hint", text: opts.hint }));
    field.appendChild(el("p", { class: "field-error hidden", id: "err-" + id.replace("f-", "") }));
    return field;
  }
  function textField(name, label, opts = {}) {
    const id = "f-" + name;
    const input = el("input", { type: opts.type || "text", id, name, placeholder: opts.placeholder || "" });
    if (opts.required) input.required = true;
    return wrap(id, label, input, opts);
  }
  function numberField(name, label, opts = {}) {
    const id = "f-" + name;
    const input = el("input", { type: "number", id, name, placeholder: opts.placeholder || "" });
    if (opts.min != null) input.min = opts.min;
    if (opts.max != null) input.max = opts.max;
    return wrap(id, label, input, opts);
  }
  function selectField(name, label, options, opts = {}) {
    const id = "f-" + name;
    const sel = el("select", { id, name });
    options.forEach((o) => sel.appendChild(new Option(o === "" ? "選択してください" : o, o)));
    if (opts.required) sel.required = true;
    return wrap(id, label, sel, opts);
  }
  function textareaField(name, label, opts = {}) {
    const id = "f-" + name;
    const ta = el("textarea", { id, name, placeholder: opts.placeholder || "" });
    if (opts.required) ta.required = true;
    return wrap(id, label, ta, opts);
  }
  function toggleField(name, label) {
    const id = "f-" + name;
    const input = el("input", { type: "checkbox", id, name });
    return el("label", { class: "check" }, [input, el("span", { text: label })]);
  }
  function checkGridField(name, label, options, opts = {}) {
    const grid = el("div", { class: "check-grid", "data-group": name });
    options.forEach((o) => {
      const input = el("input", { type: "checkbox", name: name, value: o });
      grid.appendChild(el("label", { class: "check" }, [input, el("span", { text: o })]));
    });
    const field = el("div", { class: "field" }, [
      labelEl("", label, opts.required, opts.hint),
      grid
    ]);
    if (opts.hint) field.appendChild(el("p", { class: "hint", text: opts.hint }));
    field.appendChild(el("p", { class: "field-error hidden", id: "err-" + name }));
    return field;
  }

  /* ---------- 値の収集 / 反映 ---------- */
  function collect(form) {
    const get = (n) => {
      const e = form.querySelector("[name='" + n + "']");
      return e ? e.value.trim() : "";
    };
    const checks = (n) =>
      Array.from(form.querySelectorAll("[name='" + n + "']:checked")).map((c) => c.value);
    const bool = (n) => {
      const e = form.querySelector("#f-" + n);
      return !!(e && e.checked);
    };
    return {
      id: editing ? editing.id : null,
      name: get("name"),
      nameKana: get("nameKana"),
      region: get("region"),
      prefecture: get("prefecture"),
      city: get("city"),
      categories: checks("categories"),
      services: get("services").split(/[,、]/).map((s) => s.trim()).filter(Boolean),
      employmentTypes: checks("employmentTypes"),
      coverage: get("coverage"),
      sameDay: bool("sameDay"),
      spot: bool("spot"),
      minWorkers: Number(get("minWorkers")) || 1,
      founded: Number(get("founded")) || null,
      employees: get("employees"),
      businessHours: get("businessHours"),
      priceNote: get("priceNote"),
      license: get("license"),
      description: get("description"),
      strengths: get("strengths").split("\n").map((s) => s.trim()).filter(Boolean),
      website: get("website"),
      publicContact: get("publicContact"),
      sourceUrl: get("sourceUrl")
    };
  }

  function fill(form, data) {
    const set = (n, v) => {
      const e = form.querySelector("[name='" + n + "']");
      if (e && v != null) e.value = v;
    };
    set("name", data.name);
    set("nameKana", data.nameKana);
    set("region", data.region);
    // 都道府県は地域連動後に設定
    const regionSel = form.querySelector("#f-region");
    if (regionSel) regionSel.dispatchEvent(new Event("change"));
    set("prefecture", data.prefecture);
    set("city", data.city);
    set("services", (data.services || []).join(", "));
    set("coverage", data.coverage);
    set("minWorkers", data.minWorkers);
    set("founded", data.founded);
    set("employees", data.employees);
    set("businessHours", data.businessHours);
    set("priceNote", data.priceNote);
    set("license", data.license);
    set("description", data.description);
    set("strengths", (data.strengths || []).join("\n"));
    set("website", data.website);
    set("publicContact", data.publicContact);
    set("sourceUrl", data.sourceUrl);
    (data.categories || []).forEach((v) => check(form, "categories", v));
    (data.employmentTypes || []).forEach((v) => check(form, "employmentTypes", v));
    if (data.sameDay) toggleOn(form, "sameDay");
    if (data.spot) toggleOn(form, "spot");
  }
  function check(form, name, value) {
    const e = form.querySelector("[name='" + name + "'][value='" + value + "']");
    if (e) e.checked = true;
  }
  function toggleOn(form, name) {
    const e = form.querySelector("#f-" + name);
    if (e) e.checked = true;
  }

  /* ---------- バリデーション / 送信 ---------- */
  function onSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    clearErrors(form);
    const data = collect(form);
    const errors = validate(form, data);
    if (errors.length) {
      errors[0].el && errors[0].el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    submit(data, form);
  }

  function validate(form, data) {
    const errors = [];
    const need = (name, cond, msg) => {
      if (!cond) {
        showError(form, name, msg);
        errors.push({ name, el: form.querySelector("#f-" + name) || form.querySelector("[name='" + name + "']") });
      }
    };
    need("name", data.name, "会社名を入力してください。");
    need("region", data.region, "地域を選択してください。");
    need("prefecture", data.prefecture, "都道府県を選択してください。");
    need("city", data.city, "市区町村を入力してください。");
    need("categories", data.categories.length > 0, "業務カテゴリを1つ以上選択してください。");
    need("description", data.description, "事業の概要を入力してください。");
    if (!data.sourceUrl || !/^https?:\/\//.test(data.sourceUrl)) {
      showError(form, "sourceUrl", "出典 URL を http(s) から正しく入力してください。");
      errors.push({ name: "sourceUrl", el: form.querySelector("#f-sourceUrl") });
    }
    if (data.website && !/^https?:\/\//.test(data.website)) {
      showError(form, "website", "URL は http(s) から入力してください。");
      errors.push({ name: "website", el: form.querySelector("#f-website") });
    }
    const agree = form.querySelector("#f-agree");
    if (!agree || !agree.checked) {
      const err = document.getElementById("err-agree");
      if (err) err.classList.remove("hidden");
      errors.push({ name: "agree", el: agree });
    }
    return errors;
  }

  function showError(form, name, msg) {
    const input = form.querySelector("#f-" + name) || form.querySelector("[name='" + name + "']");
    if (input) input.classList.add("input-error");
    const err = document.getElementById("err-" + name);
    if (err) {
      err.textContent = msg;
      err.classList.remove("hidden");
    }
  }
  function clearErrors(form) {
    form.querySelectorAll(".input-error").forEach((e) => e.classList.remove("input-error"));
    form.querySelectorAll(".field-error").forEach((e) => e.classList.add("hidden"));
  }

  async function submit(data, form) {
    saveDraft(data);
    const result = document.getElementById("form-result");
    const submitBtn = form.querySelector("button[type='submit']");
    if (submitBtn) submitBtn.disabled = true;

    let sent = false;
    if (SUBMIT_ENDPOINT) {
      try {
        await fetch(SUBMIT_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ type: editing ? "update" : "create", payload: data })
        });
        sent = true;
      } catch (err) {
        sent = false;
      }
    }

    if (result) {
      result.innerHTML = "";
      result.appendChild(renderSuccess(data, sent));
      result.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (submitBtn) submitBtn.disabled = false;
  }

  function renderSuccess(data, sent) {
    const msg = sent
      ? "申請を送信しました。担当者が公開情報を確認のうえ掲載・更新します。"
      : "申請内容を受け付けました（現在はベータ運用のため、内容確認後に手動で反映します）。下記の内容をコピーしてお送りいただくこともできます。";

    const pre = el("pre", { text: JSON.stringify(data, null, 2) });
    pre.style.cssText = "background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:14px;overflow:auto;font-size:.82rem;max-height:280px";

    const copyBtn = el("button", { class: "btn btn-secondary btn-sm", type: "button", text: "内容をコピー" });
    copyBtn.addEventListener("click", () => {
      navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      copyBtn.textContent = "コピーしました";
      setTimeout(() => (copyBtn.textContent = "内容をコピー"), 1500);
    });

    return el("section", { class: "panel notice-success", style: "border-width:1px" }, [
      el("h2", { text: editing ? "更新申請を受け付けました" : "掲載申請を受け付けました", style: "border:none;padding:0" }),
      el("p", { text: msg }),
      pre,
      el("div", { class: "detail-actions" }, [copyBtn, el("a", { class: "btn btn-sm", href: "companies.html", text: "企業一覧へ" })])
    ]);
  }

  /* ---------- 下書き ---------- */
  function saveDraft(data) {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    } catch (e) {}
  }
  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function toast(text) {
    const t = el("div", { text });
    t.style.cssText =
      "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:var(--navy);color:#fff;padding:12px 20px;border-radius:999px;box-shadow:var(--sh-3);z-index:60;font-size:.9rem";
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }
})();
