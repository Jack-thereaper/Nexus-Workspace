/*
 * Nexus Workspace: shell, login and router (NEWLY IMPLEMENTED).
 * Each page registers itself with NX.register({id, title, icon, render(root) -> cleanup?}).
 *
 * Users: several people can share one browser, each with a separate workspace and an optional PIN.
 * This is NOT account security: data stays unencrypted in this browser and does not sync between devices.
 */
(function () {
  "use strict";
  const NX = window.NX, U = NX.util, S = NX.store, A = S.accounts, esc = U.esc;
  const $ = (id) => document.getElementById(id);
  let cleanup = null, started = false;

  function buildNav() {
    $("nav").innerHTML = NX.pages.map((p) =>
      '<a href="#/' + p.id + '" data-page="' + p.id + '"><span class="ico" aria-hidden="true">' + p.icon + "</span>" + esc(p.title) + "</a>"
    ).join("");
  }

  NX.displayName = () => S.get("profile").name.trim();

  /* Applies this user's HUD choices (accent colour, compact layout) to the whole app. */
  NX.applyHud = function () {
    const h = S.get("hud");
    document.documentElement.style.setProperty("--accent", h.accent);
    document.body.classList.toggle("compact", !!h.compact);
  };

  function renderSide() {
    const prof = S.get("profile"), name = prof.name.trim();
    $("sideName").textContent = name || "Guest";
    $("sideCourse").textContent = prof.course.trim() || "Click for account options";
    $("avatar").textContent = (name ? name.charAt(0) : "N").toUpperCase();
    NX.applyHud();
  }
  NX.renderSide = renderSide;

  /* ---------- name ---------- */
  function nameForm(title, afterSave) {
    NX.ui.form({
      title: title,
      values: { name: NX.displayName() },
      fields: [{ name: "name", label: "What should we call you?", maxlength: 80, placeholder: "Your name",
        hint: "Stored only in this browser. You can change it any time." }],
      submitLabel: "Save",
      onSubmit(v) {
        S.setObject("profile", { name: v.name });
        renderSide();
        if (afterSave) afterSave();
      }
    });
  }

  function firstVisit() {
    const s = S.get("settings");
    if (NX.displayName() || s.welcomed) return;
    S.setObject("settings", { welcomed: true }); // ask once only
    nameForm("Welcome to Nexus Workspace", () => {
      route();
      // Opened on the next tick, because the name form closes itself right after this callback returns.
      if (NX.pickCourses && !S.list("courses").length) setTimeout(() => NX.pickCourses({ firstRun: true, after: route }), 0);
    });
  }

  /* ---------- PIN ---------- */
  function pinForm() {
    const id = A.current(), has = A.hasPin(id);
    if (!A.pinSupported()) { NX.ui.toast("PINs need a secure (https) page."); return; }
    NX.ui.form({
      title: has ? "Change or remove PIN" : "Set a PIN",
      fields: (has ? [{ name: "old", label: "Current PIN", type: "password", required: true, maxlength: 8 }] : []).concat([
        { name: "pin", label: has ? "New PIN (leave empty to remove the PIN)" : "New PIN (4 to 8 digits)", type: "password", required: !has, maxlength: 8 },
        { name: "pin2", label: "Repeat new PIN", type: "password", maxlength: 8 }
      ]),
      submitLabel: "Save",
      async onSubmit(v) {
        if (has && !(await A.checkPin(id, v.old))) return "That is not your current PIN.";
        if (v.pin !== v.pin2) return "The two PINs do not match.";
        if (!v.pin) { await A.setPin(id, null); NX.ui.toast("PIN removed"); return; }
        try { await A.setPin(id, v.pin); } catch (e) { return e.message; }
        NX.ui.toast("PIN saved");
      }
    });
  }

  /* ---------- account menu (sidebar card) ---------- */
  function accountMenu() {
    const id = A.current(), many = A.list().length > 1, has = A.hasPin(id);
    const r = NX.ui.openModal(
      '<div class="modal-head"><h2>' + esc(NX.displayName() || "Guest") + '</h2><button type="button" class="icon-btn" data-close aria-label="Close">&times;</button></div>' +
      '<div class="menu-list">' +
      '<button class="btn ghost" data-act="name">Change name</button>' +
      '<button class="btn ghost" data-act="switch">Switch or add user</button>' +
      '<button class="btn ghost" data-act="pin">' + (has ? "Change or remove PIN" : "Set a PIN") + "</button>" +
      (many ? '<button class="btn danger-ghost" data-act="delete">Delete this user and their data</button>' : "") +
      "</div>" +
      '<p class="muted" style="font-size:.8rem;margin-top:14px">A PIN only keeps casual snoopers out of this browser. It is not encryption, and users and data do not sync between devices. Use Data Backup to move data.</p>');
    r.querySelector(".modal").addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      const act = b.getAttribute("data-act");
      NX.ui.closeModal();
      if (act === "name") nameForm("Change your name", route);
      else if (act === "pin") pinForm();
      else if (act === "switch") { A.logout(); location.reload(); }
      else if (act === "delete") {
        NX.ui.confirm({ title: "Delete this user?", message: "Everything saved for " + (NX.displayName() || "this user") + " on this device will be erased. Download a backup first if you might want it.",
          okLabel: "Delete user", danger: true, onOk: () => { A.remove(id); location.reload(); } });
      }
    });
  }

  /* ---------- login screen ---------- */
  function showLogin() {
    const box = $("login"), body = $("loginBody");
    box.hidden = false;
    const done = () => { box.hidden = true; if (A.sessionOK()) location.reload(); else start(); };

    const pick = () => {
      const users = A.list();
      body.innerHTML = '<p class="muted login-sub">Choose your workspace.</p><div class="user-list">' + users.map((u) =>
        '<button class="user-btn" data-user="' + esc(u.id) + '"><span class="avatar" aria-hidden="true">' + esc((u.name || "G").charAt(0).toUpperCase()) + "</span>" +
        "<span>" + esc(u.name || "Guest") + "</span>" + (u.hasPin ? '<small class="lock">PIN</small>' : "") + "</button>").join("") + "</div>" +
        '<button class="btn ghost" data-new style="margin-top:14px;width:100%">+ New user</button>';
    };
    const askPin = (u) => {
      body.innerHTML = '<p class="muted login-sub">Enter the PIN for <b>' + esc(u.name || "Guest") + '</b>.</p>' +
        '<form id="pinForm"><label class="field">PIN<input type="password" id="lpin" maxlength="8" autocomplete="off" inputmode="numeric"></label>' +
        '<p class="form-error" id="lerr" role="alert"></p><div class="modal-foot"><button type="button" class="btn ghost" data-back>Back</button><span class="spacer"></span>' +
        '<button class="btn primary" type="submit">Unlock</button></div></form>';
      body.querySelector("#lpin").focus();
      body.querySelector("#pinForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const ok = await A.login(u.id, body.querySelector("#lpin").value.trim());
        if (ok) done(); else { body.querySelector("#lerr").textContent = "Wrong PIN. Try again."; body.querySelector("#lpin").select(); }
      });
    };
    const newUser = () => {
      body.innerHTML = '<p class="muted login-sub">Create a separate workspace for someone new.</p>' +
        '<form id="newForm"><label class="field">Name<input type="text" id="lname" maxlength="80" autocomplete="off"></label>' +
        '<p class="form-error" id="lerr" role="alert"></p><div class="modal-foot"><button type="button" class="btn ghost" data-back>Back</button><span class="spacer"></span>' +
        '<button class="btn primary" type="submit">Create and enter</button></div></form>';
      body.querySelector("#lname").focus();
      body.querySelector("#newForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        try { const id = A.create(body.querySelector("#lname").value); await A.login(id); done(); }
        catch (err) { body.querySelector("#lerr").textContent = err.message; }
      });
    };

    body.onclick = async (e) => {
      const t = e.target.closest("[data-user],[data-new],[data-back]");
      if (!t) return;
      if (t.hasAttribute("data-back")) pick();
      else if (t.hasAttribute("data-new")) newUser();
      else {
        const u = A.list().filter((x) => x.id === t.getAttribute("data-user"))[0];
        if (!u) return;
        if (u.hasPin) askPin(u);
        else { await A.login(u.id); done(); }
      }
    };
    pick();
  }

  /* ---------- router ---------- */
  function route() {
    if (!started) return;
    const id = (location.hash.replace(/^#\/?/, "") || "dashboard").split("?")[0];
    const page = NX.pages.filter((p) => p.id === id)[0] || NX.pages[0];

    if (typeof cleanup === "function") { try { cleanup(); } catch (e) { console.error(e); } }
    cleanup = null;

    const view = $("view");
    view.innerHTML = "";
    const root = document.createElement("section");
    root.className = "page page-" + page.id;
    view.appendChild(root);

    document.querySelectorAll("#nav a").forEach((a) => {
      const on = a.getAttribute("data-page") === page.id;
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    document.title = page.title + " | Nexus Workspace";
    $("sidebar").classList.remove("open");
    window.scrollTo(0, 0);

    try { cleanup = page.render(root); }
    catch (e) {
      console.error(e);
      root.innerHTML = '<div class="card"><h2>Something went wrong on this page</h2><p class="muted">' + esc(e.message) + "</p></div>";
    }
    renderSide();
  }

  function start() {
    started = true;
    $("login").hidden = true;
    renderSide();
    route();
    firstVisit();
  }

  function init() {
    buildNav();
    if (!S.isPersistent()) $("storageWarn").hidden = false;
    $("menuBtn").addEventListener("click", () => $("sidebar").classList.toggle("open"));
    // Tapping any nav link closes the mobile menu, even when it points at the current page.
    $("nav").addEventListener("click", (e) => { if (e.target.closest("a")) $("sidebar").classList.remove("open"); });
    window.addEventListener("hashchange", route);
    $("sideCard").addEventListener("click", accountMenu);
    if (A.isLocked()) showLogin(); else start();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
