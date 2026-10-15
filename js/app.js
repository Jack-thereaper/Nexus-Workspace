/*
 * Nexus Workspace: shell and router (NEWLY IMPLEMENTED).
 * Each page registers itself with NX.register({id, title, icon, render(root) -> cleanup?}).
 */
(function () {
  "use strict";
  const NX = window.NX;
  const $ = (id) => document.getElementById(id);
  let cleanup = null;

  function buildNav() {
    $("nav").innerHTML = NX.pages.map((p) =>
      '<a href="#/' + p.id + '" data-page="' + p.id + '"><span class="ico" aria-hidden="true">' + p.icon + "</span>" + NX.util.esc(p.title) + "</a>"
    ).join("");
  }

  function renderSide() {
    const prof = NX.store.get("profile");
    $("sideName").textContent = prof.name;
    $("sideCourse").textContent = prof.course;
  }

  function route() {
    const id = (location.hash.replace(/^#\/?/, "") || "dashboard").split("?")[0];
    const page = NX.pages.filter((p) => p.id === id)[0] || NX.pages[0];

    if (typeof cleanup === "function") { try { cleanup(); } catch (e) { console.error(e); } }
    cleanup = null;

    const view = $("view");
    view.innerHTML = "";
    const root = document.createElement("section");
    root.className = "page page-" + page.id;
    view.appendChild(root);

    document.querySelectorAll("#nav a").forEach((a) => {
      const on = a.getAttribute("data-page") === page.id;
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    document.title = page.title + " | Nexus Workspace";
    $("sidebar").classList.remove("open");
    window.scrollTo(0, 0);

    try { cleanup = page.render(root); }
    catch (e) {
      console.error(e);
      root.innerHTML = '<div class="card"><h2>Something went wrong on this page</h2><p class="muted">' + NX.util.esc(e.message) + "</p></div>";
    }
    renderSide();
  }

  function init() {
    buildNav();
    if (!NX.store.isPersistent()) $("storageWarn").hidden = false;
    $("menuBtn").addEventListener("click", () => $("sidebar").classList.toggle("open"));
    // Tapping any nav link closes the mobile menu, even when it points at the current page.
    $("nav").addEventListener("click", (e) => { if (e.target.closest("a")) $("sidebar").classList.remove("open"); });
    window.addEventListener("hashchange", route);
    route();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
