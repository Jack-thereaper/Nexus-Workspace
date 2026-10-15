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
          '<div class="head-actions"><button class="btn primary" data-add>+ Add course</button></div></div>' +
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
          }).join("") : '<p class="empty">No courses yet. Add one to start tracking your GPA.</p>');
      };
      root.addEventListener("click", (e) => {
        const t = e.target.closest("[data-add],[data-edit]");
        if (!t) return;
        courseForm(t.hasAttribute("data-edit") ? S.find("courses", t.getAttribute("data-edit")) : null, draw);
      });
      draw();
    }
  });
})();
