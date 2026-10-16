/*
 * Nexus Workspace: Data Backup and Export (NEWLY IMPLEMENTED).
 * Export everything or one section, import with full validation before anything changes,
 * and reset only after a typed confirmation.
 */
(function () {
  "use strict";
  const NX = window.NX, U = NX.util, S = NX.store, esc = U.esc;
  const MAX_FILE = 5 * 1024 * 1024;

  function download(obj, name) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportAll() {
    download(S.exportAll(), "nexus-backup-" + U.today() + ".json");
    S.setObject("settings", { lastBackup: new Date().toISOString() });
    NX.ui.toast("Backup downloaded");
  }

  NX.register({
    id: "backup", title: "Data Backup", icon: "⤓",
    render(root) {
      let pending = null; // { cleaned, counts }

      const draw = () => {
        const s = S.get("settings");
        root.innerHTML =
          '<div class="page-head"><div><h1>Data Backup and Export</h1><p>Your data lives in this browser. Export regularly so a reset or cleared browser cannot cost you anything.</p></div></div>' +
          '<div class="grid g2">' +
          '<div class="card"><h2>Export</h2><p class="muted" style="margin-bottom:12px">Last full backup: ' + (s.lastBackup ? esc(new Date(s.lastBackup).toLocaleString("en-GB")) : "never") + "</p>" +
          '<button class="btn primary" id="expAll">Download full backup</button>' +
          '<div class="toolbar" style="margin:16px 0 0"><select id="expOne" aria-label="Section to export">' + S.names().map((n) => '<option value="' + n + '">' + esc(S.label(n)) + "</option>").join("") + "</select>" +
          '<button class="btn ghost" id="expOneBtn">Export this section</button></div></div>' +
          '<div class="card"><h2>Import</h2><p class="muted" style="margin-bottom:12px">Choose a Nexus backup file. It is checked first and nothing changes until you confirm.</p>' +
          '<input type="file" id="impFile" accept="application/json,.json" aria-label="Backup file">' +
          '<div id="impOut" style="margin-top:14px"></div></div>' +
          '<div class="card"><h2>Reset all data</h2><p class="muted" style="margin-bottom:12px">Erases every task, note, course, goal, event and setting stored in this browser. Export a backup first.</p>' +
          '<button class="btn danger-ghost" id="resetBtn">Reset everything...</button></div></div>';
        if (S.lastSnapshot) {
          root.querySelector("#impOut").innerHTML = '<p class="muted">An import was just applied.</p><button class="btn ghost small" id="undoImp">Undo last import</button>';
        }
      };

      const showPreview = (res) => {
        const out = root.querySelector("#impOut");
        if (!res.ok) {
          out.innerHTML = '<p class="form-error" role="alert"><b>This file cannot be imported.</b></p><ul style="margin-left:18px;color:var(--bad);font-size:.88rem">' +
            res.errors.slice(0, 8).map((e) => "<li>" + esc(e) + "</li>").join("") + "</ul><p class=\"muted\" style=\"font-size:.85rem;margin-top:8px\">Nothing was changed.</p>";
          pending = null; return;
        }
        pending = res;
        out.innerHTML = '<p><b>File looks valid.</b> It contains:</p><ul style="margin:6px 0 12px 18px;font-size:.9rem">' +
          Object.keys(res.counts).map((n) => "<li>" + esc(S.label(n)) + ": " + res.counts[n] + "</li>").join("") + "</ul>" +
          (res.warnings.length ? '<p class="muted" style="font-size:.82rem">' + res.warnings.map(esc).join("<br>") + "</p>" : "") +
          '<label class="check"><input type="radio" name="mode" value="merge" checked> Merge: add items I do not already have</label>' +
          '<label class="check"><input type="radio" name="mode" value="replace"> Replace: overwrite these sections with the file</label>' +
          '<button class="btn primary" id="impApply">Import</button>';
      };

      root.addEventListener("click", (e) => {
        const id = e.target.id;
        if (id === "expAll") { exportAll(); draw(); }
        else if (id === "expOneBtn") {
          const n = root.querySelector("#expOne").value;
          download(S.exportAll(n), "nexus-" + n + "-" + U.today() + ".json");
          NX.ui.toast(S.label(n) + " exported");
        } else if (id === "impApply" && pending) {
          const mode = root.querySelector('input[name="mode"]:checked').value, data = pending.cleaned;
          const apply = () => { S.importBackup(data, mode); pending = null; NX.renderSide(); NX.ui.toast("Import complete"); draw(); };
          if (mode === "replace") NX.ui.confirm({ title: "Replace your data?", message: "The sections in this file will overwrite what you have now. You can undo right after.", okLabel: "Replace", danger: true, onOk: apply });
          else apply();
        } else if (id === "undoImp") {
          if (S.undoImport()) { NX.renderSide(); NX.ui.toast("Import undone"); draw(); }
        } else if (id === "resetBtn") {
          NX.ui.openModal('<div class="modal-head"><h2>Reset everything?</h2><button type="button" class="icon-btn" data-close aria-label="Close">&times;</button></div>' +
            '<p class="confirm-text">This permanently erases all Nexus data in this browser. Download a backup first if you might want it back.</p>' +
            '<button class="btn ghost" id="resetExport" style="margin-bottom:14px">Download backup first</button>' +
            '<label class="field">Type RESET to confirm<input type="text" id="resetType" autocomplete="off" maxlength="10"></label>' +
            '<div class="modal-foot"><span class="spacer"></span><button class="btn ghost" data-close>Cancel</button><button class="btn danger" id="resetGo" disabled>Erase all data</button></div>');
          const m = document.getElementById("modal");
          m.querySelector("#resetExport").addEventListener("click", exportAll);
          const typed = m.querySelector("#resetType"), go = m.querySelector("#resetGo");
          typed.addEventListener("input", () => { go.disabled = typed.value.trim() !== "RESET"; });
          go.addEventListener("click", () => {
            if (typed.value.trim() !== "RESET") return;
            S.resetAll(); NX.ui.closeModal(); NX.ui.toast("All data erased"); pending = null; draw();
            NX.renderSide();
          });
        }
      });

      root.addEventListener("change", (e) => {
        if (e.target.id !== "impFile") return;
        const f = e.target.files && e.target.files[0], out = root.querySelector("#impOut");
        if (!f) return;
        if (f.size > MAX_FILE) { out.innerHTML = '<p class="form-error">That file is too large (limit 5 MB).</p>'; return; }
        const rd = new FileReader();
        rd.onload = () => {
          let parsed;
          try { parsed = JSON.parse(String(rd.result)); }
          catch (err) { out.innerHTML = '<p class="form-error"><b>This file is not valid JSON.</b> Nothing was changed.</p>'; pending = null; return; }
          showPreview(S.validateBackup(parsed));
        };
        rd.onerror = () => { out.innerHTML = '<p class="form-error">Could not read that file.</p>'; };
        rd.readAsText(f);
      });
      draw();
    }
  });
})();
