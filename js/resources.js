/* Nexus Workspace: Resources page (NEWLY IMPLEMENTED). Collection: "resources". */
(function () {
  "use strict";
  const NX = window.NX, U = NX.util, S = NX.store, esc = U.esc;

  const fields = () => [
    { name: "title", label: "Title", required: true, maxlength: 200, placeholder: "Neso Academy: Digital Logic" },
    { name: "url", label: "Link", type: "url", required: true, maxlength: 500, placeholder: "https://..." },
    { name: "category", label: "Category (optional)", maxlength: 60, placeholder: "Video, Book, Tool..." },
    { name: "note", label: "Note (optional)", type: "textarea", rows: 3, maxlength: 500 }
  ];

  function resForm(res, after) {
    NX.ui.form({
      title: res ? "Edit resource" : "Add resource",
      values: res || {},
      fields: fields(),
      onSubmit(v) {
        try {
          const rec = { title: v.title, url: v.url, category: v.category, note: v.note };
          if (res) S.update("resources", res.id, rec); else S.add("resources", rec);
        } catch (e) { return "Could not save: " + e.message; }
        NX.ui.toast(res ? "Resource updated" : "Resource added");
        after();
      },
      onDelete: res ? () => { S.remove("resources", res.id); NX.ui.toast("Resource deleted"); after(); } : null
    });
  }

  NX.register({
    id: "resources", title: "Resources", icon: "📚",
    render(root) {
      let cat = "All";
      const draw = () => {
        const all = S.list("resources");
        const cats = ["All"];
        all.forEach((r) => { const c = r.category || "Uncategorised"; if (cats.indexOf(c) === -1) cats.push(c); });
        if (cats.indexOf(cat) === -1) cat = "All";
        const view = all.filter((r) => cat === "All" || (r.category || "Uncategorised") === cat);
        root.innerHTML =
          '<div class="page-head"><div><h1>Resources</h1><p>' + all.length + " saved links</p></div>" +
          '<div class="head-actions"><button class="btn primary" data-add>+ Add resource</button></div></div>' +
          '<div class="toolbar"><div class="chips">' + cats.map((c) =>
            '<button class="chip' + (c === cat ? " active" : "") + '" data-cat="' + esc(c) + '">' + esc(c) + "</button>").join("") + "</div></div>" +
          (view.length ? '<div class="grid g3">' + view.map((r) =>
            '<div class="card"><span class="badge">' + esc(r.category || "Uncategorised") + "</span>" +
            '<h3 style="margin:10px 0 6px"><a href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer">' + esc(r.title) + "</a></h3>" +
            (r.note ? '<p class="muted" style="font-size:.88rem">' + esc(r.note) + "</p>" : "") +
            '<div class="toolbar" style="margin:12px 0 0"><button class="btn ghost small" data-edit="' + esc(r.id) + '">Edit</button></div></div>').join("") + "</div>"
            : '<p class="empty">' + (all.length ? "Nothing in this category." : "No resources yet. Save useful links here.") + "</p>");
      };
      root.addEventListener("click", (e) => {
        const t = e.target.closest("[data-add],[data-edit],[data-cat]");
        if (!t) return;
        if (t.hasAttribute("data-cat")) { cat = t.getAttribute("data-cat"); draw(); }
        else resForm(t.hasAttribute("data-edit") ? S.find("resources", t.getAttribute("data-edit")) : null, draw);
      });
      draw();
    }
  });
})();
