/*
 * Nexus Workspace: UI helpers (NEWLY IMPLEMENTED).
 * One modal root that stays hidden until a form or confirm is opened.
 */
(function () {
  "use strict";
  const NX = (window.NX = window.NX || {});

  const esc = (s) => String(s === undefined || s === null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => (n < 10 ? "0" : "") + n;
  const ymd = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const util = {
    esc: esc,
    pad: pad,
    ymd: ymd,
    today: () => ymd(new Date()),
    parse: (s) => { const p = String(s).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); },
    fmtDate: (s) => {
      if (!s) return "";
      const d = util.parse(s);
      return isNaN(d) ? s : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    },
    addDays: (s, n) => { const d = util.parse(s); d.setDate(d.getDate() + n); return ymd(d); },
    mins: (m) => (m >= 60 ? Math.floor(m / 60) + "h " + (m % 60) + "m" : m + "m"),
    num: (n) => Number(n).toLocaleString("en-GB", { maximumFractionDigits: 2 })
  };

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
  }

  /* ---------- modal ---------- */
  let lastFocus = null;
  const root = () => document.getElementById("modal");

  function openModal(html) {
    lastFocus = document.activeElement;
    const r = root();
    r.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + "</div>";
    r.hidden = false;
    const first = r.querySelector("input:not([type=checkbox]),select,textarea,button.primary");
    if (first) first.focus();
    return r;
  }
  function closeModal() {
    const r = root();
    r.hidden = true;
    r.innerHTML = "";
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* ignore */ } }
    lastFocus = null;
  }

  function fieldHTML(f, val) {
    const id = "f_" + f.name;
    const v = val === undefined || val === null ? "" : val;
    const req = f.required ? " required" : "";
    const label = esc(f.label) + (f.required ? ' <span class="req">*</span>' : "");
    let input;
    if (f.type === "textarea") {
      input = '<textarea id="' + id + '" rows="' + (f.rows || 4) + '" maxlength="' + (f.maxlength || 2000) + '" placeholder="' + esc(f.placeholder || "") + '">' + esc(v) + "</textarea>";
    } else if (f.type === "select") {
      input = '<select id="' + id + '">' + f.options.map((o) =>
        '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(v) ? " selected" : "") + ">" + esc(o[1]) + "</option>").join("") + "</select>";
    } else if (f.type === "checkbox") {
      return '<label class="check"><input type="checkbox" id="' + id + '"' + (v ? " checked" : "") + "> " + esc(f.label) + "</label>";
    } else {
      const type = f.type === "url" ? "url" : f.type || "text";
      input = '<input id="' + id + '" type="' + type + '" value="' + esc(v) + '"' +
        (f.min !== undefined ? ' min="' + f.min + '"' : "") + (f.max !== undefined ? ' max="' + f.max + '"' : "") +
        (f.step !== undefined ? ' step="' + f.step + '"' : "") +
        ' maxlength="' + (f.maxlength || 300) + '" placeholder="' + esc(f.placeholder || "") + '" autocomplete="off">';
    }
    return '<label class="field">' + label + input + (f.hint ? "<small>" + esc(f.hint) + "</small>" : "") + "</label>";
  }

  /*
   * opts: { title, fields:[{name,label,type,required,options,min,max,step,...}],
   *         values:{}, submitLabel, onSubmit(values) -> error string | falsy, onDelete() }
   */
  function form(opts) {
    const vals = opts.values || {};
    const html = '<div class="modal-head"><h2>' + esc(opts.title) + '</h2><button type="button" class="icon-btn" data-close aria-label="Close">&times;</button></div>' +
      '<form novalidate>' + opts.fields.map((f) => fieldHTML(f, vals[f.name])).join("") +
      '<p class="form-error" role="alert"></p>' +
      '<div class="modal-foot">' +
      (opts.onDelete ? '<button type="button" class="btn danger-ghost" data-delete>Delete</button>' : "") +
      '<span class="spacer"></span><button type="button" class="btn ghost" data-close>Cancel</button>' +
      '<button type="submit" class="btn primary">' + esc(opts.submitLabel || "Save") + "</button></div></form>";
    const r = openModal(html);
    const f = r.querySelector("form"), err = r.querySelector(".form-error");

    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const out = {};
      for (let i = 0; i < opts.fields.length; i++) {
        const fd = opts.fields[i], el = document.getElementById("f_" + fd.name);
        if (fd.type === "checkbox") { out[fd.name] = el.checked; continue; }
        let v = el.value;
        if (fd.type !== "textarea") v = v.trim();
        if (fd.required && v === "") { err.textContent = fd.label + " is required."; el.focus(); return; }
        if (fd.type === "number") {
          if (v === "") { out[fd.name] = ""; continue; }
          const n = Number(v);
          if (!isFinite(n) || (fd.min !== undefined && n < fd.min) || (fd.max !== undefined && n > fd.max)) {
            err.textContent = fd.label + " must be a number" + (fd.min !== undefined ? " from " + fd.min : "") + (fd.max !== undefined ? " to " + fd.max : "") + ".";
            el.focus(); return;
          }
          v = n;
        }
        if (fd.type === "url" && v !== "" && !/^https?:\/\/\S+$/i.test(v)) {
          err.textContent = fd.label + " must start with http:// or https://"; el.focus(); return;
        }
        out[fd.name] = v;
      }
      const finish = (problem) => { if (problem) err.textContent = problem; else closeModal(); };
      const result = opts.onSubmit(out);
      if (result && typeof result.then === "function") {
        const btn = f.querySelector("button[type=submit]");
        btn.disabled = true;
        result.then((p) => { btn.disabled = false; finish(p); },
          (e2) => { btn.disabled = false; err.textContent = (e2 && e2.message) || "Something went wrong."; });
      } else finish(result);
    });
    const del = r.querySelector("[data-delete]");
    if (del) del.addEventListener("click", () => {
      confirmBox({ title: "Delete this item?", message: "This cannot be undone.", okLabel: "Delete", danger: true, onOk: opts.onDelete });
    });
  }

  /* opts: { title, message, okLabel, danger, onOk } */
  function confirmBox(opts) {
    const html = '<div class="modal-head"><h2>' + esc(opts.title) + '</h2></div><p class="confirm-text">' + esc(opts.message) + "</p>" +
      '<div class="modal-foot"><span class="spacer"></span><button type="button" class="btn ghost" data-close>Cancel</button>' +
      '<button type="button" class="btn ' + (opts.danger ? "danger" : "primary") + '" data-ok>' + esc(opts.okLabel || "OK") + "</button></div>";
    const r = openModal(html);
    r.querySelector("[data-ok]").addEventListener("click", () => { closeModal(); opts.onOk(); });
    r.querySelector("[data-close]").focus();
  }

  document.addEventListener("click", (e) => {
    if (e.target instanceof Element && e.target.closest("[data-close]")) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !root().hidden) closeModal();
  });

  NX.util = util;
  NX.ui = { toast: toast, form: form, confirm: confirmBox, openModal: openModal, closeModal: closeModal };
})();
