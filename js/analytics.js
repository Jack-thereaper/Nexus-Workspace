/* Nexus Workspace: Analytics (NEWLY IMPLEMENTED). Plain SVG bar charts, no libraries. */
(function () {
  "use strict";
  const NX = window.NX, U = NX.util, S = NX.store, esc = U.esc;

  function bars(values, labels, color, unit, name) {
    const W = 560, H = 220, padL = 10, padB = 28, padT = 22, n = values.length;
    const max = Math.max.apply(null, values.concat([1]));
    const bw = (W - padL * 2) / n, inner = bw * 0.6;
    let g = "";
    values.forEach((v, i) => {
      const h = (v / max) * (H - padB - padT), x = padL + i * bw + (bw - inner) / 2, y = H - padB - h;
      g += '<rect x="' + x + '" y="' + y + '" width="' + inner + '" height="' + Math.max(h, 0) + '" rx="4" fill="' + color + '"><title>' + esc(labels[i]) + ": " + v + " " + unit + "</title></rect>" +
        '<text class="val" x="' + (x + inner / 2) + '" y="' + (y - 6) + '" text-anchor="middle">' + (v || "") + "</text>" +
        '<text x="' + (x + inner / 2) + '" y="' + (H - 9) + '" text-anchor="middle">' + esc(labels[i]) + "</text>";
    });
    return '<div class="chart-wrap"><svg class="chart" viewBox="0 0 ' + W + " " + H + '" width="100%" role="img" aria-label="' + esc(name) + '" style="min-width:420px">' +
      '<line x1="' + padL + '" x2="' + (W - padL) + '" y1="' + (H - padB) + '" y2="' + (H - padB) + '" stroke="#1f2736"/>' + g + "</svg></div>";
  }

  NX.register({
    id: "analytics", title: "Analytics", icon: "▥",
    render(root) {
      const today = U.today(), days = [];
      for (let i = 6; i >= 0; i--) days.push(U.addDays(today, -i));
      const labels = days.map((d) => U.parse(d).toLocaleDateString("en-GB", { weekday: "short" }));
      const tasks = S.list("tasks"), focus = S.list("focus"), courses = S.list("courses");
      const doneByDay = days.map((d) => tasks.filter((t) => t.done && t.doneOn === d).length);
      const focusByDay = days.map((d) => focus.filter((f) => f.date === d).reduce((a, f) => a + f.minutes, 0));
      const done = tasks.filter((t) => t.done).length, rate = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
      const totalFocus = focus.reduce((a, f) => a + f.minutes, 0);
      const gp = NX.calcGpa(courses, S.get("settings").gpaScale);
      const dist = ["A", "B", "C", "D", "E", "F"].map((g) => courses.filter((c) => c.grade === g).length);

      root.innerHTML =
        '<div class="page-head"><div><h1>Analytics</h1><p>Your last 7 days and overall progress.</p></div></div>' +
        '<div class="stats">' +
        '<div class="stat good"><b>' + rate + "%</b><span>Tasks completed (" + done + "/" + tasks.length + ")</span></div>" +
        '<div class="stat accent"><b>' + U.mins(totalFocus) + "</b><span>Total focus time</span></div>" +
        '<div class="stat"><b>' + focus.length + "</b><span>Focus sessions</span></div>" +
        '<div class="stat"><b>' + (gp.gpa === null ? "-" : gp.gpa.toFixed(2)) + "</b><span>GPA</span></div></div>" +
        '<div class="grid g2"><div class="card"><h2>Tasks completed per day</h2>' + bars(doneByDay, labels, "#34d399", "tasks", "Tasks completed in the last 7 days") + "</div>" +
        '<div class="card"><h2>Focus minutes per day</h2>' + bars(focusByDay, labels, "#4f8cff", "min", "Focus minutes in the last 7 days") + "</div>" +
        '<div class="card"><h2>Grade distribution</h2>' + (courses.some((c) => c.grade) ?
          bars(dist, ["A", "B", "C", "D", "E", "F"], "#22d3ee", "courses", "Number of courses per grade") : '<p class="empty">Add graded courses in Academics to see this.</p>') + "</div></div>";
    }
  });
})();
