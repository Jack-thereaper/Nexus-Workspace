/* Nexus Workspace: Dashboard (NEWLY IMPLEMENTED). Reads from every collection. */
(function () {
  "use strict";
  const NX = window.NX, U = NX.util, S = NX.store, esc = U.esc;

  NX.register({
    id: "dashboard", title: "Dashboard", icon: "▦",
    render(root) {
      const draw = () => {
        const today = U.today(), prof = S.get("profile"), settings = S.get("settings");
        const tasks = S.list("tasks"), open = tasks.filter((t) => !t.done);
        const overdue = open.filter((t) => t.due && t.due < today);
        const dueToday = open.filter((t) => t.due === today);
        const focusMins = S.list("focus").filter((f) => f.date === today).reduce((a, f) => a + f.minutes, 0);
        const gpa = NX.calcGpa ? NX.calcGpa(S.list("courses"), settings.gpaScale) : { gpa: null };
        const events = S.list("events").filter((e) => e.date >= today).sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1)).slice(0, 5);
        const goals = S.list("goals").slice(0, 4);
        const hour = new Date().getHours();
        const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
        const upcoming = open.filter((t) => t.due >= today || !t.due).sort((a, b) => (!a.due ? 1 : !b.due ? -1 : a.due < b.due ? -1 : 1)).slice(0, 5);

        root.innerHTML =
          '<div class="page-head"><div><h1>' + greet + ", " + esc(prof.name) + '</h1><p>' + esc(U.parse(today).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })) + "</p></div></div>" +
          '<div class="stats">' +
          '<div class="stat accent"><b>' + dueToday.length + "</b><span>Due today</span></div>" +
          '<div class="stat ' + (overdue.length ? "bad" : "good") + '"><b>' + overdue.length + "</b><span>Overdue</span></div>" +
          '<div class="stat"><b>' + open.length + "</b><span>Open tasks</span></div>" +
          '<div class="stat"><b>' + U.mins(focusMins) + "</b><span>Focused today</span></div>" +
          '<div class="stat"><b>' + (gpa.gpa === null ? "-" : gpa.gpa.toFixed(2)) + "</b><span>GPA</span></div></div>" +
          '<div class="grid g2">' +
          '<div class="card"><h2>Quick add task</h2><form id="quick" class="toolbar" style="margin:0"><input type="text" id="qt" maxlength="200" placeholder="What needs doing?" aria-label="Task title" style="flex:1 1 200px;width:auto">' +
          '<button class="btn primary" type="submit">Add</button></form>' +
          '<h3 style="margin:16px 0 8px">Next up</h3><div class="list">' + (upcoming.length ? upcoming.map((t) =>
            '<div class="row"><div class="grow"><div class="title">' + esc(t.title) + '</div><div class="meta">' + (t.due ? "Due " + esc(U.fmtDate(t.due)) : "No due date") + '</div></div><span class="badge ' + esc(t.priority) + '">' + esc(t.priority) + "</span></div>").join("") :
            '<p class="empty">Nothing waiting. Nice.</p>') + "</div></div>" +
          '<div class="card"><h2>Upcoming events</h2><div class="list">' + (events.length ? events.map((e) =>
            '<div class="row"><div class="grow"><div class="title">' + esc(e.title) + '</div><div class="meta">' + esc(U.fmtDate(e.date)) + (e.time ? " at " + esc(e.time) : "") + "</div></div></div>").join("") :
            '<p class="empty">No upcoming events. <a href="#/calendar">Open calendar</a></p>') + "</div></div>" +
          '<div class="card"><h2>Goals</h2>' + (goals.length ? goals.map((g) => {
            const p = NX.goalPct ? NX.goalPct(g) : 0;
            return '<div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;font-size:.9rem;margin-bottom:5px"><span>' + esc(g.title) + '</span><span class="muted">' + Math.round(p) + '%</span></div><div class="progress' + (p >= 100 ? " full" : "") + '"><i style="width:' + p + '%"></i></div></div>';
          }).join("") : '<p class="empty">No goals yet. <a href="#/goals">Set one</a></p>') + "</div>" +
          '<div class="card"><h2>Jump to</h2><div class="chips">' +
          [["tasks", "Tasks"], ["focus", "Focus Timer"], ["notes", "Notes"], ["lab", "Engineering Lab"], ["backup", "Backup"]].map((l) => '<a class="chip" href="#/' + l[0] + '">' + l[1] + "</a>").join("") + "</div>" +
          (settings.lastBackup ? '<p class="muted" style="margin-top:14px;font-size:.85rem">Last backup: ' + esc(new Date(settings.lastBackup).toLocaleString("en-GB")) + "</p>" :
            '<p class="muted" style="margin-top:14px;font-size:.85rem">No backup yet. <a href="#/backup">Export one</a> so a reset cannot cost you your data.</p>') + "</div></div>";

        root.querySelector("#quick").addEventListener("submit", (e) => {
          e.preventDefault();
          const v = root.querySelector("#qt").value.trim();
          if (!v) return;
          S.add("tasks", { title: v.slice(0, 200), due: "", priority: "medium", done: false, doneOn: "", course: "", created: U.today() });
          NX.ui.toast("Task added"); draw();
        });
      };
      draw();
    }
  });
})();
