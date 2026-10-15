/* Nexus Workspace: Goals page (NEWLY IMPLEMENTED). Collection: "goals" (localStorage key nexus.v1.goals). */
(function () {
  "use strict";
  const NX = window.NX, U = NX.util, S = NX.store, esc = U.esc;

  const fields = () => [
    { name: "title", label: "Goal", required: true, maxlength: 200, placeholder: "Read 12 engineering books" },
    { name: "current", label: "Progress so far", type: "number", required: true, min: 0, max: 1e9, step: "any" },
    { name: "target", label: "Target", type: "number", required: true, min: 0.0001, max: 1e9, step: "any" },
    { name: "unit", label: "Unit (optional)", maxlength: 30, placeholder: "books, hours, projects" },
    { name: "due", label: "Deadline (optional)", type: "date" }
  ];

  function goalForm(goal, after) {
    NX.ui.form({
      title: goal ? "Edit goal" : "New goal",
      values: goal || { current: 0, target: 10 },
      fields: fields(),
      onSubmit(v) {
        try {
          const rec = { title: v.title, current: v.current, target: v.target, unit: v.unit, due: v.due };
          if (goal) S.update("goals", goal.id, rec); else S.add("goals", rec);
        } catch (e) { return "Could not save: " + e.message; }
        NX.ui.toast(goal ? "Goal updated" : "Goal added");
        after();
      },
      onDelete: goal ? () => { S.remove("goals", goal.id); NX.ui.toast("Goal deleted"); after(); } : null
    });
  }

  NX.goalPct = (g) => Math.max(0, Math.min(100, (g.current / g.target) * 100));

  NX.register({
    id: "goals", title: "Goals", icon: "◎",
    render(root) {
      const draw = () => {
        const goals = S.list("goals");
        root.innerHTML =
          '<div class="page-head"><div><h1>Goals</h1><p>' + goals.filter((g) => g.current >= g.target).length + " of " + goals.length + " completed</p></div>" +
          '<div class="head-actions"><button class="btn primary" data-add>+ New goal</button></div></div>' +
          (goals.length ? '<div class="grid g2">' + goals.map((g) => {
            const pct = NX.goalPct(g), full = g.current >= g.target;
            return '<div class="card"><h3>' + esc(g.title) + "</h3>" +
              '<p class="muted" style="margin-bottom:10px">' + U.num(g.current) + " / " + U.num(g.target) + " " + esc(g.unit) + " (" + Math.round(pct) + "%)" +
              (g.due ? " &middot; by " + esc(U.fmtDate(g.due)) : "") + "</p>" +
              '<div class="progress' + (full ? " full" : "") + '" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(pct) + '"><i style="width:' + pct + '%"></i></div>' +
              '<div class="toolbar" style="margin:14px 0 0"><button class="btn ghost small" data-step="-1" data-id="' + esc(g.id) + '">-1</button>' +
              '<button class="btn ghost small" data-step="1" data-id="' + esc(g.id) + '">+1</button>' +
              '<span class="spacer"></span><button class="btn ghost small" data-edit="' + esc(g.id) + '">Edit</button></div></div>';
          }).join("") + "</div>" : '<p class="empty">No goals yet. Set one and track it here.</p>');
      };
      root.addEventListener("click", (e) => {
        const t = e.target.closest("[data-add],[data-edit],[data-step]");
        if (!t) return;
        if (t.hasAttribute("data-step")) {
          const g = S.find("goals", t.getAttribute("data-id"));
          S.update("goals", g.id, { current: Math.max(0, g.current + Number(t.getAttribute("data-step"))) });
          draw();
        } else goalForm(t.hasAttribute("data-edit") ? S.find("goals", t.getAttribute("data-edit")) : null, draw);
      });
      draw();
    }
  });
})();
