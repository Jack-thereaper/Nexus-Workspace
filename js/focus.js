/*
 * Nexus Workspace: Focus Timer (NEWLY IMPLEMENTED). Collection: "focus".
 * Timing uses the clock (end timestamp), so it stays accurate if the tab is throttled,
 * and it keeps running while you visit other pages.
 */
(function () {
  "use strict";
  const NX = window.NX, U = NX.util, S = NX.store, esc = U.esc;

  const st = { mode: "focus", running: false, endAt: 0, remaining: 0, label: "", total: 0 };
  let tickId = null, paint = null;
  const baseTitle = () => document.title.replace(/^\(\d+:\d+\)\s*/, "");

  function lengthFor(mode) {
    const s = S.get("settings");
    return (mode === "focus" ? s.focusMin : s.breakMin) * 60 * 1000;
  }
  function reset(mode) {
    st.mode = mode; st.running = false; st.total = lengthFor(mode); st.remaining = st.total;
    stopTick();
  }
  const left = () => (st.running ? Math.max(0, st.endAt - Date.now()) : st.remaining);
  const fmt = (ms) => { const s = Math.ceil(ms / 1000); return U.pad(Math.floor(s / 60)) + ":" + U.pad(s % 60); };

  function startTick() { if (!tickId) tickId = setInterval(tick, 250); }
  function stopTick() { if (tickId) { clearInterval(tickId); tickId = null; } document.title = baseTitle(); }

  function tick() {
    const ms = left();
    if (ms <= 0) { complete(); return; }
    document.title = "(" + fmt(ms) + ") " + baseTitle();
    if (paint) paint();
  }

  function complete() {
    const wasFocus = st.mode === "focus";
    if (wasFocus) {
      try { S.add("focus", { date: U.today(), minutes: Math.max(1, Math.round(st.total / 60000)), label: st.label }); } catch (e) { /* ignore */ }
      NX.ui.toast("Focus session complete. Take a break.");
    } else NX.ui.toast("Break over. Ready when you are.");
    reset(wasFocus ? "break" : "focus");
    if (paint) paint(true);
  }

  function start() {
    if (st.running) return;
    st.endAt = Date.now() + st.remaining; st.running = true; startTick();
    if (paint) paint(true);
  }
  function pause() {
    if (!st.running) return;
    st.remaining = left(); st.running = false; stopTick();
    if (paint) paint(true);
  }

  reset("focus");

  NX.register({
    id: "focus", title: "Focus Timer", icon: "⏱",
    render(root) {
      const sessionsToday = () => S.list("focus").filter((x) => x.date === U.today());
      const draw = () => {
        const today = sessionsToday(), mins = today.reduce((a, x) => a + x.minutes, 0);
        const pct = st.total ? Math.max(0, Math.min(100, (1 - left() / st.total) * 100)) : 0;
        root.innerHTML =
          '<div class="page-head"><div><h1>Focus Timer</h1><p>Work in focused blocks, then rest.</p></div></div>' +
          '<div class="grid g2"><div class="card timer-card">' +
          '<div class="timer-mode" id="tMode">' + (st.mode === "focus" ? "Focus" : "Break") + "</div>" +
          '<div class="timer-time" id="tTime" aria-live="off">' + fmt(left()) + "</div>" +
          '<div class="progress timer-ring"><i id="tBar" style="width:' + pct + '%"></i></div>' +
          '<label class="field" style="max-width:380px;margin:0 auto 18px;text-align:left">What are you working on?' +
          '<input type="text" id="tLabel" maxlength="200" value="' + esc(st.label) + '" placeholder="Optional"></label>' +
          '<div class="toolbar" style="justify-content:center;margin:0">' +
          '<button class="btn primary" id="tStart">' + (st.running ? "Pause" : st.remaining < st.total ? "Resume" : "Start") + "</button>" +
          '<button class="btn ghost" id="tReset">Reset</button>' +
          '<button class="btn ghost" id="tSwitch">' + (st.mode === "focus" ? "Skip to break" : "Skip to focus") + "</button></div></div>" +
          '<div class="card"><h2>Today</h2><div class="stats" style="margin-bottom:12px"><div class="stat accent"><b>' + U.mins(mins) + "</b><span>Focused</span></div>" +
          '<div class="stat"><b>' + today.length + "</b><span>Sessions</span></div></div>" +
          '<div class="list">' + (today.length ? today.slice().reverse().map((x) =>
            '<div class="row"><div class="grow"><div class="title">' + esc(x.label || "Focus session") + '</div><div class="meta">' + x.minutes + " min</div></div></div>").join("")
            : '<p class="empty">No sessions yet today.</p>') + "</div></div></div>";
      };
      paint = (full) => {
        if (full) { draw(); return; }
        const t = root.querySelector("#tTime"), b = root.querySelector("#tBar");
        if (t) t.textContent = fmt(left());
        if (b) b.style.width = Math.max(0, Math.min(100, (1 - left() / st.total) * 100)) + "%";
      };
      root.addEventListener("click", (e) => {
        const id = e.target.id;
        if (id === "tStart") { st.running ? pause() : start(); }
        else if (id === "tReset") { reset(st.mode); draw(); }
        else if (id === "tSwitch") { reset(st.mode === "focus" ? "break" : "focus"); draw(); }
      });
      root.addEventListener("input", (e) => { if (e.target.id === "tLabel") st.label = e.target.value.slice(0, 200); });
      if (!st.running && st.remaining === st.total) { st.total = lengthFor(st.mode); st.remaining = st.total; }
      draw();
      return () => { paint = null; };
    }
  });
})();
