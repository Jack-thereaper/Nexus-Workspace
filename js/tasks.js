/* Nexus Workspace: Tasks page (NEWLY IMPLEMENTED). Collection: "tasks". */
(function () {
  "use strict";
  const NX = window.NX, U = NX.util, S = NX.store, esc = U.esc;
  const ORDER = { high: 0, medium: 1, low: 2 };

  const fields = () => [
    { name: "title", label: "Task", required: true, maxlength: 200, placeholder: "Finish circuit analysis assignment" },
    { name: "course", label: "Course (optional)", maxlength: 100, placeholder: "EEE 201" },
    { name: "due", label: "Due date", type: "date" },
    { name: "priority", label: "Priority", type: "select", options: [["low", "Low"], ["medium", "Medium"], ["high", "High"]] }
  ];

  function taskForm(task, after) {
    NX.ui.form({
      title: task ? "Edit task" : "Create new task",
      values: task || { priority: "medium" },
      fields: fields(),
      submitLabel: task ? "Save changes" : "Add task",
      onSubmit(v) {
        try {
          const rec = { title: v.title, course: v.course, due: v.due, priority: v.priority };
          if (task) S.update("tasks", task.id, rec);
          else S.add("tasks", Object.assign(rec, { done: false, doneOn: "", created: U.today() }));
        } catch (e) { return "Could not save: " + e.message; }
        NX.ui.toast(task ? "Task updated" : "Task added");
        after();
      },
      onDelete: task ? () => { S.remove("tasks", task.id); NX.ui.toast("Task deleted"); after(); } : null
    });
  }

  function sortTasks(list) {
    return list.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.due !== b.due) return !a.due ? 1 : !b.due ? -1 : a.due < b.due ? -1 : 1;
      return ORDER[a.priority] - ORDER[b.priority];
    });
  }

  function row(t) {
    const today = U.today();
    const overdue = !t.done && t.due && t.due < today;
    return '<div class="row' + (t.done ? " done" : "") + '">' +
      '<input type="checkbox" data-toggle="' + esc(t.id) + '"' + (t.done ? " checked" : "") + ' aria-label="Mark done: ' + esc(t.title) + '">' +
      '<div class="grow"><div class="title">' + esc(t.title) + '</div><div class="meta">' +
      (t.due ? "<span>Due " + esc(U.fmtDate(t.due)) + "</span>" : "") +
      (overdue ? '<span class="badge overdue">Overdue</span>' : "") +
      '<span class="badge ' + esc(t.priority) + '">' + esc(t.priority) + "</span>" +
      (t.course ? "<span>" + esc(t.course) + "</span>" : "") + "</div></div>" +
      '<button class="btn ghost small" data-edit="' + esc(t.id) + '">Edit</button></div>';
  }

  NX.taskForm = taskForm;

  NX.register({
    id: "tasks", title: "Tasks", icon: "✔",
    render(root) {
      let filter = "open", q = "";
      const draw = () => {
        const all = S.list("tasks"), today = U.today();
        const view = all.filter((t) =>
          (filter === "all" || (filter === "open" && !t.done) || (filter === "done" && t.done) ||
           (filter === "overdue" && !t.done && t.due && t.due < today)) &&
          (!q || (t.title + " " + t.course).toLowerCase().indexOf(q) !== -1));
        const open = all.filter((t) => !t.done).length;
        root.innerHTML =
          '<div class="page-head"><div><h1>Tasks</h1><p>' + open + " open, " + (all.length - open) + " done</p></div>" +
          '<div class="head-actions"><button class="btn primary" data-add>+ New task</button></div></div>' +
          '<div class="toolbar"><input type="search" id="q" placeholder="Search tasks..." value="' + esc(q) + '" aria-label="Search tasks">' +
          '<div class="chips">' + [["open", "Open"], ["overdue", "Overdue"], ["done", "Done"], ["all", "All"]].map((c) =>
            '<button class="chip' + (filter === c[0] ? " active" : "") + '" data-filter="' + c[0] + '">' + c[1] + "</button>").join("") + "</div></div>" +
          '<div class="list">' + (view.length ? sortTasks(view).map(row).join("") :
            '<p class="empty">' + (all.length ? "No tasks match this view." : "No tasks yet. Add your first one.") + "</p>") + "</div>";
        const qi = root.querySelector("#q");
        qi.addEventListener("input", () => { q = qi.value.trim().toLowerCase(); const pos = qi.selectionStart; draw(); const n = root.querySelector("#q"); n.focus(); n.setSelectionRange(pos, pos); });
      };
      root.addEventListener("click", (e) => {
        const t = e.target.closest("[data-add],[data-edit],[data-filter]");
        if (!t) return;
        if (t.hasAttribute("data-add")) taskForm(null, draw);
        else if (t.hasAttribute("data-edit")) taskForm(S.find("tasks", t.getAttribute("data-edit")), draw);
        else { filter = t.getAttribute("data-filter"); draw(); }
      });
      root.addEventListener("change", (e) => {
        const id = e.target.getAttribute && e.target.getAttribute("data-toggle");
        if (!id) return;
        S.update("tasks", id, { done: e.target.checked, doneOn: e.target.checked ? U.today() : "" });
        draw();
      });
      draw();
    }
  });
})();
