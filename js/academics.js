/* Nexus Workspace: Academics page (NEWLY IMPLEMENTED). Collection: "courses". */
(function () {
  "use strict";
  const NX = window.NX, U = NX.util, S = NX.store, esc = U.esc;

  const SCALES = {
    "5": { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 },
    "4": { A: 4, B: 3, C: 2, D: 1, E: 0, F: 0 }
  };

  /* GPA = sum(points x credits) / sum(credits), counting only graded courses. */
  NX.calcGpa = function (courses, scale) {
    const pts = SCALES[scale] || SCALES["5"];
    let q = 0, c = 0;
    courses.forEach((x) => { if (x.grade && x.grade in pts) { q += pts[x.grade] * x.credits; c += x.credits; } });
    return { gpa: c ? q / c : null, credits: c };
  };

  function standing(gpa, scale) {
    if (gpa === null || scale !== "5") return "";
    if (gpa >= 4.5) return "First Class";
    if (gpa >= 3.5) return "Second Class Upper";
    if (gpa >= 2.4) return "Second Class Lower";
    if (gpa >= 1.5) return "Third Class";
    if (gpa >= 1.0) return "Pass";
    return "Below pass";
  }

  const fields = () => [
    { name: "name", label: "Course name", required: true, maxlength: 120, placeholder: "Circuit Theory" },
    { name: "code", label: "Course code", maxlength: 30, placeholder: "EEE 201" },
    { name: "credits", label: "Credit units", type: "number", required: true, min: 0.5, max: 30, step: 0.5 },
    { name: "grade", label: "Grade (leave blank if not graded yet)", type: "select",
      options: [["", "Not graded"], ["A", "A"], ["B", "B"], ["C", "C"], ["D", "D"], ["E", "E"], ["F", "F"]] },
    { name: "semester", label: "Semester", maxlength: 40, placeholder: "Year 2, First semester" }
  ];

  function courseForm(course, after) {
    NX.ui.form({
      title: course ? "Edit course" : "Add course",
      values: course || { credits: 3, grade: "" },
      fields: fields(),
      onSubmit(v) {
        try {
          const rec = { name: v.name, code: v.code, credits: v.credits, grade: v.grade, semester: v.semester };
          if (course) S.update("courses", course.id, rec); else S.add("courses", rec);
        } catch (e) { return "Could not save: " + e.message; }
        NX.ui.toast(course ? "Course updated" : "Course added");
        after();
      },
      onDelete: course ? () => { S.remove("courses", course.id); NX.ui.toast("Course deleted"); after(); } : null
    });
  }

  /*
   * Course picker: choose a programme and tick the courses you take.
   * Uses NX.catalog (suggested common titles, NOT an official school list).
   * opts: { firstRun, after }
   */
  NX.pickCourses = function (opts) {
    opts = opts || {};
    const cat = NX.catalog;
    if (!cat) { NX.ui.toast("Course suggestions are not available."); return; }
    const have = {};
    S.list("courses").forEach((c) => { have[c.name.trim().toLowerCase()] = true; });
    const picked = {}, customs = [];
    const prof = S.get("profile");
    const startProg = cat.programmes.indexOf(prof.course) !== -1 ? prof.course : "";

    const r = NX.ui.openModal(
      '<div class="modal-head"><h2>' + (opts.firstRun ? "Choose your courses" : "Add courses") + '</h2><button type="button" class="icon-btn" data-close aria-label="Close">&times;</button></div>' +
      '<p class="muted" style="font-size:.85rem;margin-bottom:12px">These are common course titles offered as shortcuts, not an official list from your school. Names, codes and credit units differ between schools, so check each one after adding. Units start at 3.</p>' +
      '<label class="field">Your programme<select id="cpProg"><option value="">Select (optional)</option>' + cat.programmes.map((p) =>
        '<option value="' + esc(p) + '"' + (p === startProg ? " selected" : "") + ">" + esc(p) + "</option>").join("") + "</select></label>" +
      '<label class="field">Semester (optional, applied to everything you add)<input type="text" id="cpSem" maxlength="40" placeholder="Year 2, First semester"></label>' +
      '<input type="search" id="cpQ" placeholder="Filter courses..." aria-label="Filter courses" style="margin-bottom:10px">' +
      '<div class="cp-list" id="cpList"></div>' +
      '<div class="toolbar" style="margin:12px 0 0"><input type="text" id="cpOwn" maxlength="120" placeholder="Not listed? Type a course name" aria-label="Your own course" style="flex:1 1 180px;width:auto"><button type="button" class="btn ghost small" id="cpOwnAdd">Add to list</button></div>' +
      '<p class="form-error" id="cpErr" role="alert"></p>' +
      '<div class="modal-foot"><span class="muted" id="cpCount"></span><span class="spacer"></span><button type="button" class="btn ghost" data-close>' + (opts.firstRun ? "Skip for now" : "Cancel") + '</button><button type="button" class="btn primary" id="cpGo">Add selected</button></div>');
    const box = r.querySelector(".modal"), q = (id) => box.querySelector(id);

    const paint = () => {
      const f = q("#cpQ").value.trim().toLowerCase();
      const groups = (customs.length ? [{ group: "Your own", courses: customs }] : []).concat(cat.groups);
      q("#cpList").innerHTML = groups.map((g) => {
        const items = g.courses.filter((c) => !f || c.toLowerCase().indexOf(f) !== -1);
        if (!items.length) return "";
        return '<div class="cp-group"><h3>' + esc(g.group) + "</h3>" + items.map((c) => {
          const added = have[c.toLowerCase()];
          return '<label class="check cp-item"><input type="checkbox" data-course="' + esc(c) + '"' + (picked[c] || added ? " checked" : "") + (added ? " disabled" : "") + "> " + esc(c) + (added ? ' <small class="muted">(already added)</small>' : "") + "</label>";
        }).join("") + "</div>";
      }).join("") || '<p class="empty">No courses match.</p>';
      q("#cpCount").textContent = Object.keys(picked).filter((k) => picked[k]).length + " selected";
    };

    box.addEventListener("change", (e) => {
      const t = e.target;
      if (t.hasAttribute && t.hasAttribute("data-course")) { picked[t.getAttribute("data-course")] = t.checked; q("#cpCount").textContent = Object.keys(picked).filter((k) => picked[k]).length + " selected"; }
    });
    q("#cpQ").addEventListener("input", paint);
    const addOwn = () => {
      const v = q("#cpOwn").value.trim();
      if (!v) return;
      if (v.length > 120) { q("#cpErr").textContent = "Course names can be up to 120 characters."; return; }
      if (!have[v.toLowerCase()] && customs.indexOf(v) === -1) { customs.push(v); picked[v] = true; }
      q("#cpOwn").value = ""; q("#cpErr").textContent = ""; paint();
    };
    q("#cpOwnAdd").addEventListener("click", addOwn);
    q("#cpOwn").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addOwn(); } });
    q("#cpGo").addEventListener("click", () => {
      const names = Object.keys(picked).filter((k) => picked[k] && !have[k.toLowerCase()]);
      const prog = q("#cpProg").value, sem = q("#cpSem").value.trim().slice(0, 40);
      if (!names.length && (!prog || prog === prof.course)) { q("#cpErr").textContent = "Tick at least one course, or pick a different programme."; return; }
      let added = 0;
      try {
        names.forEach((n) => { S.add("courses", { name: n, code: "", credits: 3, grade: "", semester: sem }); added++; });
        if (prog) S.setObject("profile", { course: prog });
      } catch (err) { q("#cpErr").textContent = "Could not save: " + err.message; return; }
      NX.ui.closeModal();
      if (NX.renderSide) NX.renderSide();
      NX.ui.toast(added ? "Added " + added + " course" + (added === 1 ? "" : "s") + ". Check the credit units." : "Programme saved");
      if (opts.after) opts.after();
    });
    paint();
  };

  NX.register({
    id: "academics", title: "Academics", icon: "🎓",
    render(root) {
      const draw = () => {
        const courses = S.list("courses"), scale = S.get("settings").gpaScale;
        const total = NX.calcGpa(courses, scale);
        const sems = {};
        courses.forEach((c) => { (sems[c.semester || "No semester"] = sems[c.semester || "No semester"] || []).push(c); });
        root.innerHTML =
          '<div class="page-head"><div><h1>Academics</h1><p>Courses and GPA on the ' + esc(scale) + ".0 scale (change in Settings)</p></div>" +
          '<div class="head-actions"><button class="btn ghost" data-pick>Choose courses</button><button class="btn primary" data-add>+ Add course</button></div></div>' +
          '<div class="stats">' +
          '<div class="stat accent"><b>' + (total.gpa === null ? "-" : total.gpa.toFixed(2)) + "</b><span>Cumulative GPA</span></div>" +
          '<div class="stat"><b>' + U.num(total.credits) + "</b><span>Graded credit units</span></div>" +
          '<div class="stat"><b>' + courses.length + "</b><span>Courses</span></div>" +
          '<div class="stat"><b style="font-size:1.2rem">' + esc(standing(total.gpa, scale) || "-") + "</b><span>Standing" + (scale === "5" ? "" : " (5.0 only)") + "</span></div></div>" +
          (courses.length ? Object.keys(sems).sort().map((name) => {
            const g = NX.calcGpa(sems[name], scale);
            return '<h3 style="margin:18px 0 8px">' + esc(name) + ' <span class="muted" style="font-weight:400">GPA ' + (g.gpa === null ? "-" : g.gpa.toFixed(2)) + "</span></h3>" +
              '<div class="table-wrap"><table><thead><tr><th>Course</th><th>Code</th><th>Units</th><th>Grade</th><th></th></tr></thead><tbody>' +
              sems[name].map((c) => "<tr><td>" + esc(c.name) + "</td><td>" + esc(c.code) + "</td><td>" + U.num(c.credits) + "</td><td>" + (esc(c.grade) || '<span class="muted">-</span>') +
                '</td><td class="actions"><button class="btn ghost small" data-edit="' + esc(c.id) + '">Edit</button></td></tr>').join("") + "</tbody></table></div>";
          }).join("") : '<p class="empty">No courses yet. Use <b>Choose courses</b> or add one to start tracking your GPA.</p>');
      };
      root.addEventListener("click", (e) => {
        const t = e.target.closest("[data-add],[data-edit],[data-pick]");
        if (!t) return;
        if (t.hasAttribute("data-pick")) { NX.pickCourses({ after: draw }); return; }
        courseForm(t.hasAttribute("data-edit") ? S.find("courses", t.getAttribute("data-edit")) : null, draw);
      });
      draw();
    }
  });
})();
