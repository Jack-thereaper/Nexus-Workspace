/*
 * Nexus Workspace: Dashboard with an editable HUD (NEWLY IMPLEMENTED).
 * The HUD is the greeting plus the stat tiles. Each user can change the greeting text,
 * accent colour, compact layout, which tiles and panels show, and their order.
 * Choices are saved per user in the "hud" collection.
 */
(function () {
  "use strict";
  const NX = window.NX, U = NX.util, S = NX.store, esc = U.esc;

  const TILE_LABEL = { due: "Due today", overdue: "Overdue", open: "Open tasks", focus: "Focused today", gpa: "GPA" };
  const WIDGET_LABEL = { tasks: "Quick add and next up", events: "Upcoming events", goals: "Goals", jump: "Jump to" };
  const ACCENT_NAME = { "#4f8cff": "Blue", "#22d3ee": "Cyan", "#34d399": "Green", "#a78bfa": "Violet", "#fb923c": "Orange", "#f472b6": "Pink" };
  const DEFAULT_GREETING = "{greeting}, {name}";

  function greetingText(tpl, name, dateLong) {
    const hour = new Date().getHours();
    const word = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    let t = (tpl && tpl.trim()) || DEFAULT_GREETING;
    // With no name set, drop the placeholder together with the comma before it.
    t = name ? t.replace(/\{name\}/g, name) : t.replace(/[,\s]*\{name\}/g, "");
    return t.replace(/\{greeting\}/g, word).replace(/\{date\}/g, dateLong).trim();
  }

  /* ---------- HUD editor ---------- */
  function editHud(after) {
    const cur = S.get("hud");
    const lists = {
      tiles: { all: NX.HUD.TILES, label: TILE_LABEL },
      widgets: { all: NX.HUD.WIDGETS, label: WIDGET_LABEL }
    };
    const state = {};
    Object.keys(lists).forEach((k) => {
      const all = lists[k].all, chosen = cur[k];
      state[k] = { order: chosen.concat(all.filter((x) => chosen.indexOf(x) === -1)), on: {} };
      all.forEach((x) => { state[k].on[x] = chosen.indexOf(x) !== -1; });
    });
    let accent = cur.accent;

    const swatches = NX.HUD.ACCENTS.map((c) =>
      '<button type="button" class="swatch-btn" data-accent="' + c + '" style="background:' + c + '" aria-label="' + ACCENT_NAME[c] + '" title="' + ACCENT_NAME[c] + '"></button>').join("");
    const r = NX.ui.openModal(
      '<div class="modal-head"><h2>Edit HUD</h2><button type="button" class="icon-btn" data-close aria-label="Close">&times;</button></div>' +
      '<label class="field">Greeting<input type="text" id="hGreet" maxlength="80" value="' + esc(cur.greeting) + '" placeholder="' + esc(DEFAULT_GREETING) + '">' +
      "<small>Use {name}, {greeting} (Good morning...) and {date}. Leave empty for the default.</small></label>" +
      '<div class="field">Accent colour<div class="swatches" role="group" aria-label="Accent colour">' + swatches + "</div></div>" +
      '<label class="check"><input type="checkbox" id="hCompact"' + (cur.compact ? " checked" : "") + "> Compact layout</label>" +
      '<div class="field">Stat tiles (tick to show, arrows to reorder)<div class="list" id="hTiles"></div></div>' +
      '<div class="field">Dashboard panels<div class="list" id="hWidgets"></div></div>' +
      '<p class="form-error" id="hErr" role="alert"></p>' +
      '<div class="modal-foot"><button type="button" class="btn ghost" id="hReset">Reset to default</button><span class="spacer"></span>' +
      '<button type="button" class="btn ghost" data-close>Cancel</button><button type="button" class="btn primary" id="hSave">Save HUD</button></div>');
    const box = r.querySelector(".modal"); // recreated for every modal, so listeners do not pile up

    const paint = () => {
      Object.keys(lists).forEach((k) => {
        const st = state[k], target = box.querySelector(k === "tiles" ? "#hTiles" : "#hWidgets");
        target.innerHTML = st.order.map((x, i) =>
          '<div class="row"><label class="check" style="margin:0;flex:1"><input type="checkbox" data-list="' + k + '" data-item="' + x + '"' + (st.on[x] ? " checked" : "") + "> " + esc(lists[k].label[x]) + "</label>" +
          '<button type="button" class="btn ghost small" data-move="-1" data-list="' + k + '" data-i="' + i + '"' + (i === 0 ? " disabled" : "") + ' aria-label="Move up">&uarr;</button>' +
          '<button type="button" class="btn ghost small" data-move="1" data-list="' + k + '" data-i="' + i + '"' + (i === st.order.length - 1 ? " disabled" : "") + ' aria-label="Move down">&darr;</button></div>').join("");
      });
      box.querySelectorAll("[data-accent]").forEach((b) => {
        const on = b.getAttribute("data-accent") === accent;
        b.classList.toggle("sel", on); b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    };

    box.addEventListener("click", (e) => {
      const t = e.target.closest("[data-accent],[data-move],#hSave,#hReset");
      if (!t) return;
      if (t.hasAttribute("data-accent")) { accent = t.getAttribute("data-accent"); paint(); }
      else if (t.hasAttribute("data-move")) {
        const st = state[t.getAttribute("data-list")], i = Number(t.getAttribute("data-i")), j = i + Number(t.getAttribute("data-move"));
        if (j >= 0 && j < st.order.length) { const tmp = st.order[i]; st.order[i] = st.order[j]; st.order[j] = tmp; paint(); }
      } else if (t.id === "hReset") {
        S.setObject("hud", { greeting: "", accent: NX.HUD.ACCENTS[0], compact: false, widgets: NX.HUD.WIDGETS.slice(), tiles: NX.HUD.TILES.slice() });
        NX.applyHud(); NX.ui.closeModal(); NX.ui.toast("HUD reset"); after();
      } else if (t.id === "hSave") {
        try {
          S.setObject("hud", {
            greeting: box.querySelector("#hGreet").value.trim(), accent: accent, compact: box.querySelector("#hCompact").checked,
            tiles: state.tiles.order.filter((x) => state.tiles.on[x]), widgets: state.widgets.order.filter((x) => state.widgets.on[x])
          });
        } catch (err) { box.querySelector("#hErr").textContent = "Could not save: " + err.message; return; }
        NX.applyHud(); NX.ui.closeModal(); NX.ui.toast("HUD saved"); after();
      }
    });
    box.addEventListener("change", (e) => {
      const t = e.target;
      if (t.hasAttribute && t.hasAttribute("data-list")) state[t.getAttribute("data-list")].on[t.getAttribute("data-item")] = t.checked;
    });
    paint();
    box.querySelector("#hGreet").focus();
  }

  NX.register({
    id: "dashboard", title: "Dashboard", icon: "▦",
    render(root) {
      let clock = null;
      const draw = () => {
        const today = U.today(), prof = S.get("profile"), settings = S.get("settings"), hud = S.get("hud");
        const tasks = S.list("tasks"), open = tasks.filter((t) => !t.done);
        const overdue = open.filter((t) => t.due && t.due < today);
        const dueToday = open.filter((t) => t.due === today);
        const focusMins = S.list("focus").filter((f) => f.date === today).reduce((a, f) => a + f.minutes, 0);
        const gpa = NX.calcGpa ? NX.calcGpa(S.list("courses"), settings.gpaScale) : { gpa: null };
        const events = S.list("events").filter((e) => e.date >= today).sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1)).slice(0, 5);
        const goals = S.list("goals").slice(0, 4);
        const upcoming = open.filter((t) => t.due >= today || !t.due).sort((a, b) => (!a.due ? 1 : !b.due ? -1 : a.due < b.due ? -1 : 1)).slice(0, 5);
        const dateLong = U.parse(today).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        const name = prof.name.trim();

        const tiles = {
          due: ["accent", dueToday.length], overdue: [overdue.length ? "bad" : "good", overdue.length], open: ["", open.length],
          focus: ["", U.mins(focusMins)], gpa: ["", gpa.gpa === null ? "-" : gpa.gpa.toFixed(2)]
        };
        const panels = {
          tasks: () => '<div class="card"><h2>Quick add task</h2><form id="quick" class="toolbar" style="margin:0"><input type="text" id="qt" maxlength="200" placeholder="What needs doing?" aria-label="Task title" style="flex:1 1 200px;width:auto">' +
            '<button class="btn primary" type="submit">Add</button></form><h3 style="margin:16px 0 8px">Next up</h3><div class="list">' + (upcoming.length ? upcoming.map((t) =>
            '<div class="row"><div class="grow"><div class="title">' + esc(t.title) + '</div><div class="meta">' + (t.due ? "Due " + esc(U.fmtDate(t.due)) : "No due date") + '</div></div><span class="badge ' + esc(t.priority) + '">' + esc(t.priority) + "</span></div>").join("") :
            '<p class="empty">Nothing waiting. Nice.</p>') + "</div></div>",
          events: () => '<div class="card"><h2>Upcoming events</h2><div class="list">' + (events.length ? events.map((e) =>
            '<div class="row"><div class="grow"><div class="title">' + esc(e.title) + '</div><div class="meta">' + esc(U.fmtDate(e.date)) + (e.time ? " at " + esc(e.time) : "") + "</div></div></div>").join("") :
            '<p class="empty">No upcoming events. <a href="#/calendar">Open calendar</a></p>') + "</div></div>",
          goals: () => '<div class="card"><h2>Goals</h2>' + (goals.length ? goals.map((g) => {
            const p = NX.goalPct ? NX.goalPct(g) : 0;
            return '<div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;font-size:.9rem;margin-bottom:5px"><span>' + esc(g.title) + '</span><span class="muted">' + Math.round(p) + '%</span></div><div class="progress' + (p >= 100 ? " full" : "") + '"><i style="width:' + p + '%"></i></div></div>';
          }).join("") : '<p class="empty">No goals yet. <a href="#/goals">Set one</a></p>') + "</div>",
          jump: () => '<div class="card"><h2>Jump to</h2><div class="chips">' +
            [["tasks", "Tasks"], ["academics", "Academics"], ["focus", "Focus Timer"], ["notes", "Notes"], ["lab", "Engineering Lab"], ["backup", "Backup"]].map((l) => '<a class="chip" href="#/' + l[0] + '">' + l[1] + "</a>").join("") + "</div>" +
            (settings.lastBackup ? '<p class="muted" style="margin-top:14px;font-size:.85rem">Last backup: ' + esc(new Date(settings.lastBackup).toLocaleString("en-GB")) + "</p>" :
              '<p class="muted" style="margin-top:14px;font-size:.85rem">No backup yet. <a href="#/backup">Export one</a> so a reset cannot cost you your data.</p>') + "</div>"
        };

        root.innerHTML =
          '<section class="hud" aria-label="HUD"><div class="page-head" style="margin-bottom:14px"><div><h1>' + esc(greetingText(hud.greeting, name, dateLong)) + "</h1><p>" + esc(dateLong) +
          (name ? "" : ' &middot; <a href="#/profile">Set your name</a>') + '</p></div><div class="head-actions"><button class="btn ghost small" id="editHud">Edit HUD</button></div></div>' +
          (hud.tiles.length ? '<div class="stats">' + hud.tiles.map((k) => '<div class="stat ' + tiles[k][0] + '"><b>' + tiles[k][1] + "</b><span>" + TILE_LABEL[k] + "</span></div>").join("") + "</div>" :
            '<p class="muted">No stat tiles selected. Use Edit HUD to add some.</p>') + "</section>" +
          (hud.widgets.length ? '<div class="grid g2">' + hud.widgets.map((k) => panels[k]()).join("") + "</div>" : "");

        const quick = root.querySelector("#quick");
        if (quick) quick.addEventListener("submit", (e) => {
          e.preventDefault();
          const v = root.querySelector("#qt").value.trim();
          if (!v) return;
          S.add("tasks", { title: v.slice(0, 200), due: "", priority: "medium", done: false, doneOn: "", course: "", created: U.today() });
          NX.ui.toast("Task added"); draw();
        });
      };
      root.addEventListener("click", (e) => { if (e.target.closest("#editHud")) editHud(draw); });
      draw();
      return () => { if (clock) clearInterval(clock); };
    }
  });
})();
