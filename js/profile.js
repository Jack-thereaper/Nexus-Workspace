/* Nexus Workspace: Profile and Settings pages (NEWLY IMPLEMENTED). Collections: "profile", "settings". */
(function () {
  "use strict";
  const NX = window.NX, U = NX.util, S = NX.store, esc = U.esc;

  const input = (id, label, val, extra) => '<label class="field">' + label + '<input type="text" id="' + id + '" value="' + esc(val) + '" maxlength="' + (extra || 120) + '"></label>';

  NX.register({
    id: "profile", title: "Profile", icon: "☺",
    render(root) {
      const p = S.get("profile");
      root.innerHTML =
        '<div class="page-head"><div><h1>Profile</h1><p>How Nexus addresses you. Stored only in this browser.</p></div></div>' +
        '<div class="card" style="max-width:560px"><form id="pf">' +
        input("pName", "Name", p.name, 80) + input("pCourse", "Course of study", p.course, 100) +
        input("pLevel", "Level / year", p.level, 40) + input("pSchool", "School", p.school, 120) +
        '<label class="field">About you<textarea id="pBio" rows="3" maxlength="500">' + esc(p.bio) + "</textarea></label>" +
        '<p class="form-error" id="pErr" role="alert"></p><button class="btn primary" type="submit">Save profile</button></form></div>';
      root.querySelector("#pf").addEventListener("submit", (e) => {
        e.preventDefault();
        S.setObject("profile", { name: root.querySelector("#pName").value.trim(), course: root.querySelector("#pCourse").value.trim(), level: root.querySelector("#pLevel").value.trim(),
          school: root.querySelector("#pSchool").value.trim(), bio: root.querySelector("#pBio").value.trim() });
        root.querySelector("#pErr").textContent = "";
        NX.renderSide();
        NX.ui.toast("Profile saved");
      });
    }
  });

  NX.register({
    id: "settings", title: "Settings", icon: "☰",
    render(root) {
      const s = S.get("settings");
      root.innerHTML =
        '<div class="page-head"><div><h1>Settings</h1><p>Preferences stay on this device.</p></div></div>' +
        '<div class="card" style="max-width:560px"><form id="sf">' +
        '<label class="field">GPA scale<select id="sScale"><option value="5"' + (s.gpaScale === "5" ? " selected" : "") + '>5.0 scale (A=5 ... F=0)</option>' +
        '<option value="4"' + (s.gpaScale === "4" ? " selected" : "") + ">4.0 scale (A=4 ... F=0)</option></select></label>" +
        '<label class="field">Focus session length (minutes)<input type="number" id="sFocus" min="1" max="180" step="1" value="' + s.focusMin + '"></label>' +
        '<label class="field">Break length (minutes)<input type="number" id="sBreak" min="1" max="60" step="1" value="' + s.breakMin + '"></label>' +
        '<p class="form-error" id="sErr" role="alert"></p><button class="btn primary" type="submit">Save settings</button></form>' +
        '<p class="muted" style="margin-top:14px;font-size:.85rem">Timer changes apply to the next session. To export or erase your data, use <a href="#/backup">Backup</a>.</p></div>';
      root.querySelector("#sf").addEventListener("submit", (e) => {
        e.preventDefault();
        const f = Number(root.querySelector("#sFocus").value), b = Number(root.querySelector("#sBreak").value);
        if (!Number.isInteger(f) || f < 1 || f > 180) { root.querySelector("#sErr").textContent = "Focus length must be a whole number from 1 to 180."; return; }
        if (!Number.isInteger(b) || b < 1 || b > 60) { root.querySelector("#sErr").textContent = "Break length must be a whole number from 1 to 60."; return; }
        S.setObject("settings", { gpaScale: root.querySelector("#sScale").value, focusMin: f, breakMin: b });
        root.querySelector("#sErr").textContent = "";
        NX.ui.toast("Settings saved");
      });
    }
  });
})();
