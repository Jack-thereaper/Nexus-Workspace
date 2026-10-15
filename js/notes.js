/* Nexus Workspace: Notes page (NEWLY IMPLEMENTED). Collection: "notes". Autosaves as you type. */
(function () {
  "use strict";
  const NX = window.NX, U = NX.util, S = NX.store, esc = U.esc;
  let selected = null;

  NX.register({
    id: "notes", title: "Notes", icon: "✎",
    render(root) {
      let q = "", timer = null, dirty = null;

      const flush = () => {
        if (!dirty) return;
        clearTimeout(timer);
        try { S.update("notes", dirty.id, { title: dirty.title, body: dirty.body, updated: new Date().toISOString() }); } catch (e) { /* note deleted */ }
        dirty = null;
        const s = root.querySelector("#saved"); if (s) s.textContent = "Saved";
      };

      const draw = () => {
        const all = S.list("notes").sort((a, b) => (b.pinned - a.pinned) || (a.updated < b.updated ? 1 : -1));
        if (selected && !all.some((n) => n.id === selected)) selected = null;
        if (!selected && all.length) selected = all[0].id;
        const list = all.filter((n) => !q || (n.title + " " + n.body).toLowerCase().indexOf(q) !== -1);
        const cur = all.filter((n) => n.id === selected)[0];
        root.innerHTML =
          '<div class="page-head"><div><h1>Notes</h1><p>' + all.length + " notes. Changes save automatically.</p></div>" +
          '<div class="head-actions"><button class="btn primary" data-new>+ New note</button></div></div>' +
          '<div class="notes-layout"><div class="card" style="padding:12px"><input type="search" id="nq" placeholder="Search notes..." value="' + esc(q) + '" aria-label="Search notes" style="margin-bottom:10px">' +
          '<div class="note-list">' + (list.length ? list.map((n) =>
            '<button class="note-item' + (n.id === selected ? " active" : "") + '" data-open="' + esc(n.id) + '"><b>' + (n.pinned ? "📌 " : "") + esc(n.title || "Untitled") +
            "</b><small>" + esc((n.body || "").slice(0, 60) || "Empty note") + "</small></button>").join("") : '<p class="empty">No notes found.</p>') + "</div></div>" +
          '<div class="card">' + (cur ?
            '<input type="text" class="note-title" id="nt" maxlength="200" value="' + esc(cur.title) + '" placeholder="Title" aria-label="Note title">' +
            '<textarea class="note-body" id="nb" maxlength="100000" placeholder="Start writing..." aria-label="Note body">' + esc(cur.body) + "</textarea>" +
            '<div class="toolbar" style="margin:12px 0 0"><span class="muted" id="saved">Saved</span><span class="spacer"></span>' +
            '<button class="btn ghost small" data-pin="' + esc(cur.id) + '">' + (cur.pinned ? "Unpin" : "Pin") + "</button>" +
            '<button class="btn danger-ghost small" data-del="' + esc(cur.id) + '">Delete</button></div>'
            : '<p class="empty">Create a note to get started.</p>') + "</div></div>";
        const nq = root.querySelector("#nq");
        nq.addEventListener("input", () => { flush(); q = nq.value.trim().toLowerCase(); const p = nq.selectionStart; draw(); const n = root.querySelector("#nq"); n.focus(); n.setSelectionRange(p, p); });
      };

      const queueSave = () => {
        const nt = root.querySelector("#nt"), nb = root.querySelector("#nb");
        if (!nt || !nb || !selected) return;
        dirty = { id: selected, title: nt.value, body: nb.value };
        const s = root.querySelector("#saved"); if (s) s.textContent = "Saving...";
        clearTimeout(timer); timer = setTimeout(flush, 400);
      };
      root.addEventListener("input", (e) => { if (e.target.id === "nt" || e.target.id === "nb") queueSave(); });

      root.addEventListener("click", (e) => {
        const t = e.target.closest("[data-new],[data-open],[data-pin],[data-del]");
        if (!t) return;
        flush();
        if (t.hasAttribute("data-new")) {
          selected = S.add("notes", { title: "", body: "", pinned: false, updated: new Date().toISOString() }).id; draw();
          const nt = root.querySelector("#nt"); if (nt) nt.focus();
        } else if (t.hasAttribute("data-open")) { selected = t.getAttribute("data-open"); draw(); }
        else if (t.hasAttribute("data-pin")) { const n = S.find("notes", selected); S.update("notes", n.id, { pinned: !n.pinned }); draw(); }
        else if (t.hasAttribute("data-del")) {
          NX.ui.confirm({ title: "Delete this note?", message: "This cannot be undone.", okLabel: "Delete", danger: true,
            onOk: () => { S.remove("notes", selected); selected = null; NX.ui.toast("Note deleted"); draw(); } });
        }
      });
      draw();
      return flush; // saves any pending edit when you leave the page
    }
  });
})();
