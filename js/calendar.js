/* Nexus Workspace: Calendar (NEWLY IMPLEMENTED). Collection: "events". Also shows task due dates. */
(function () {
  "use strict";
  const NX = window.NX, U = NX.util, S = NX.store, esc = U.esc;

  function eventForm(ev, date, after) {
    NX.ui.form({
      title: ev ? "Edit event" : "Add event",
      values: ev || { date: date || U.today() },
      fields: [
        { name: "title", label: "Event", required: true, maxlength: 200, placeholder: "Lab practical" },
        { name: "date", label: "Date", type: "date", required: true },
        { name: "time", label: "Time (optional)", type: "time" },
        { name: "note", label: "Note (optional)", type: "textarea", rows: 3, maxlength: 500 }
      ],
      onSubmit(v) {
        try {
          const rec = { title: v.title, date: v.date, time: v.time, note: v.note };
          if (ev) S.update("events", ev.id, rec); else S.add("events", rec);
        } catch (e) { return "Could not save: " + e.message; }
        NX.ui.toast(ev ? "Event updated" : "Event added"); after();
      },
      onDelete: ev ? () => { S.remove("events", ev.id); NX.ui.toast("Event deleted"); after(); } : null
    });
  }
  NX.eventForm = eventForm;

  NX.register({
    id: "calendar", title: "Calendar", icon: "▤",
    render(root) {
      const now = new Date();
      let year = now.getFullYear(), month = now.getMonth();
      const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

      const draw = () => {
        const events = S.list("events"), tasks = S.list("tasks").filter((t) => !t.done && t.due);
        const first = new Date(year, month, 1), lead = (first.getDay() + 6) % 7;
        const days = new Date(year, month + 1, 0).getDate();
        const total = Math.ceil((lead + days) / 7) * 7, today = U.today();
        let cells = DOW.map((d) => '<div class="dow">' + d + "</div>").join("");
        for (let i = 0; i < total; i++) {
          const d = new Date(year, month, 1 - lead + i), key = U.ymd(d);
          const evs = events.filter((e) => e.date === key).sort((a, b) => (a.time < b.time ? -1 : 1));
          const tks = tasks.filter((t) => t.due === key);
          const items = evs.map((e) => '<span class="ev" role="button" tabindex="0" data-event="' + esc(e.id) + '" title="' + esc(e.title) + '">' + (e.time ? esc(e.time) + " " : "") + esc(e.title) + "</span>")
            .concat(tks.map((t) => '<a class="ev task" href="#/tasks" title="Task due: ' + esc(t.title) + '">✔ ' + esc(t.title) + "</a>"));
          cells += '<div class="day' + (d.getMonth() !== month ? " other" : "") + (key === today ? " today" : "") + '" data-day="' + key + '" role="button" tabindex="0" aria-label="Add event on ' + key + '">' +
            '<span class="n">' + d.getDate() + "</span>" + items.slice(0, 3).join("") + (items.length > 3 ? '<span class="ev more">+' + (items.length - 3) + " more</span>" : "") + "</div>";
        }
        root.innerHTML =
          '<div class="page-head"><div><h1>Calendar</h1><p>Click a day to add an event. Tasks with due dates appear in yellow.</p></div>' +
          '<div class="head-actions"><button class="btn primary" data-add>+ Add event</button></div></div>' +
          '<div class="cal-head"><button class="btn ghost small" data-nav="-1" aria-label="Previous month">&lsaquo;</button><h2>' +
          esc(first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })) + '</h2>' +
          '<button class="btn ghost small" data-nav="today">Today</button><button class="btn ghost small" data-nav="1" aria-label="Next month">&rsaquo;</button></div>' +
          '<div class="cal">' + cells + "</div>";
      };

      const activate = (t) => {
        if (!t) return false;
        if (t.hasAttribute("data-nav")) {
          const v = t.getAttribute("data-nav");
          if (v === "today") { year = now.getFullYear(); month = now.getMonth(); }
          else { month += Number(v); if (month < 0) { month = 11; year--; } if (month > 11) { month = 0; year++; } }
          draw();
        } else if (t.hasAttribute("data-add")) eventForm(null, U.today(), draw);
        else if (t.hasAttribute("data-event")) eventForm(S.find("events", t.getAttribute("data-event")), null, draw);
        else if (t.hasAttribute("data-day")) eventForm(null, t.getAttribute("data-day"), draw);
        return true;
      };
      root.addEventListener("click", (e) => {
        if (e.target.closest("a.task")) return;
        activate(e.target.closest("[data-nav],[data-add],[data-event],[data-day]"));
      });
      root.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        const t = e.target.closest("[data-event],[data-day]");
        if (t && e.target === t) { e.preventDefault(); activate(t); }
      });
      draw();
    }
  });
})();
