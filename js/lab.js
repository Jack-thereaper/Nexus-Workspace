/* Nexus Workspace: Engineering Lab (NEWLY IMPLEMENTED). Calculators + lab log (collection "lab"). */
(function () {
  "use strict";
  const NX = window.NX, U = NX.util, S = NX.store, esc = U.esc;

  const DIGITS = [["Black", 0, "#000"], ["Brown", 1, "#6b3f1d"], ["Red", 2, "#d22"], ["Orange", 3, "#f80"], ["Yellow", 4, "#fd2"],
    ["Green", 5, "#2a2"], ["Blue", 6, "#35f"], ["Violet", 7, "#92f"], ["Grey", 8, "#888"], ["White", 9, "#fff"]];
  const MULTS = [["Black x1", 1, "#000"], ["Brown x10", 10, "#6b3f1d"], ["Red x100", 100, "#d22"], ["Orange x1k", 1e3, "#f80"], ["Yellow x10k", 1e4, "#fd2"],
    ["Green x100k", 1e5, "#2a2"], ["Blue x1M", 1e6, "#35f"], ["Violet x10M", 1e7, "#92f"], ["Gold x0.1", 0.1, "#d4af37"], ["Silver x0.01", 0.01, "#bbb"]];
  const TOLS = [["Gold ±5%", 5], ["Silver ±10%", 10], ["Brown ±1%", 1], ["Red ±2%", 2], ["Green ±0.5%", 0.5], ["Blue ±0.25%", 0.25], ["Violet ±0.1%", 0.1], ["Grey ±0.05%", 0.05]];

  const opts = (list) => list.map((x, i) => '<option value="' + i + '">' + esc(x[0]) + "</option>").join("");
  const trim = (n) => String(Number(n.toPrecision(6)));

  function ohms(r) {
    if (r >= 1e6) return trim(r / 1e6) + " MΩ";
    if (r >= 1e3) return trim(r / 1e3) + " kΩ";
    return trim(r) + " Ω";
  }

  function logForm(entry, after) {
    NX.ui.form({
      title: entry ? "Edit lab entry" : "New lab entry",
      values: entry || { date: U.today() },
      fields: [
        { name: "title", label: "Experiment / title", required: true, maxlength: 200, placeholder: "RC low-pass filter" },
        { name: "date", label: "Date", type: "date" },
        { name: "notes", label: "Method and observations", type: "textarea", rows: 5, maxlength: 5000 },
        { name: "result", label: "Result", type: "textarea", rows: 2, maxlength: 2000 }
      ],
      onSubmit(v) {
        try {
          const rec = { title: v.title, date: v.date, notes: v.notes, result: v.result };
          if (entry) S.update("lab", entry.id, rec); else S.add("lab", rec);
        } catch (e) { return "Could not save: " + e.message; }
        NX.ui.toast("Lab entry saved"); after();
      },
      onDelete: entry ? () => { S.remove("lab", entry.id); NX.ui.toast("Entry deleted"); after(); } : null
    });
  }

  NX.register({
    id: "lab", title: "Engineering Lab", icon: "⚙",
    render(root) {
      const drawLog = () => {
        const log = S.list("lab").sort((a, b) => (a.date < b.date ? 1 : -1));
        root.querySelector("#labLog").innerHTML = log.length ? log.map((x) =>
          '<div class="row"><div class="grow"><div class="title">' + esc(x.title) + '</div><div class="meta">' + esc(U.fmtDate(x.date)) +
          (x.result ? " &middot; " + esc(x.result.slice(0, 80)) : "") + '</div></div><button class="btn ghost small" data-edit="' + esc(x.id) + '">Open</button></div>').join("")
          : '<p class="empty">No lab entries yet.</p>';
      };

      root.innerHTML =
        '<div class="page-head"><div><h1>Engineering Lab</h1><p>Quick calculators and your lab log.</p></div></div>' +
        '<div class="grid g2">' +
        /* Resistor */
        '<div class="card"><h2>Resistor colour code (4-band)</h2><div class="calc-row">' +
        '<label class="field">Band 1<select id="rb1">' + opts(DIGITS) + '</select></label>' +
        '<label class="field">Band 2<select id="rb2">' + opts(DIGITS) + '</select></label>' +
        '<label class="field">Multiplier<select id="rbm">' + opts(MULTS) + '</select></label>' +
        '<label class="field">Tolerance<select id="rbt">' + opts(TOLS) + "</select></label></div>" +
        '<div class="result" id="rOut"></div></div>' +
        /* Ohm */
        '<div class="card"><h2>Ohm\'s law</h2><p class="muted" style="margin-bottom:10px;font-size:.85rem">Fill in any two values and leave the third empty.</p><div class="calc-row">' +
        '<label class="field">Voltage (V)<input type="number" id="ov" step="any"></label>' +
        '<label class="field">Current (A)<input type="number" id="oi" step="any"></label>' +
        '<label class="field">Resistance (Ω)<input type="number" id="or" step="any"></label></div>' +
        '<button class="btn primary" id="oGo">Calculate</button><div class="result" id="oOut">Enter two values.</div></div>' +
        /* Base */
        '<div class="card"><h2>Number base converter</h2><div class="calc-row">' +
        '<label class="field">Value<input type="text" id="bv" maxlength="64" placeholder="e.g. 255"></label>' +
        '<label class="field">From base<select id="bb"><option value="10">Decimal</option><option value="2">Binary</option><option value="8">Octal</option><option value="16">Hexadecimal</option></select></label></div>' +
        '<div class="result" id="bOut">Enter a value.</div></div>' +
        /* Log */
        '<div class="card"><div class="toolbar" style="margin-bottom:10px"><h2 style="flex:1">Lab log</h2><button class="btn primary small" data-add>+ New entry</button></div><div class="list" id="labLog"></div></div></div>';

      const q = (id) => root.querySelector("#" + id);

      const resistor = () => {
        const d1 = DIGITS[+q("rb1").value], d2 = DIGITS[+q("rb2").value], m = MULTS[+q("rbm").value], t = TOLS[+q("rbt").value];
        const val = (d1[1] * 10 + d2[1]) * m[1];
        q("rOut").innerHTML = '<span class="swatch" style="background:' + d1[2] + '"></span><span class="swatch" style="background:' + d2[2] + '"></span><span class="swatch" style="background:' + m[2] + '"></span>' +
          "<b>" + esc(ohms(val)) + "</b> ±" + t[1] + "% (range " + esc(ohms(val * (1 - t[1] / 100))) + " to " + esc(ohms(val * (1 + t[1] / 100))) + ")";
      };
      ["rb1", "rb2", "rbm", "rbt"].forEach((id) => q(id).addEventListener("change", resistor));
      resistor();

      q("oGo").addEventListener("click", () => {
        const raw = { v: q("ov").value.trim(), i: q("oi").value.trim(), r: q("or").value.trim() };
        const given = Object.keys(raw).filter((k) => raw[k] !== "");
        const out = q("oOut");
        if (given.length !== 2) { out.textContent = "Fill in exactly two values."; return; }
        const n = {}; given.forEach((k) => { n[k] = Number(raw[k]); });
        if (given.some((k) => !isFinite(n[k]))) { out.textContent = "Enter valid numbers."; return; }
        let V, I, Rr;
        if (raw.v === "") { I = n.i; Rr = n.r; V = I * Rr; }
        else if (raw.i === "") { V = n.v; Rr = n.r; if (Rr === 0) { out.textContent = "Resistance cannot be zero when solving for current."; return; } I = V / Rr; }
        else { V = n.v; I = n.i; if (I === 0) { out.textContent = "Current cannot be zero when solving for resistance."; return; } Rr = V / I; }
        out.innerHTML = "V = <b>" + trim(V) + " V</b><br>I = <b>" + trim(I) + " A</b><br>R = <b>" + trim(Rr) + " Ω</b><br>P = <b>" + trim(V * I) + " W</b>";
      });

      const base = () => {
        const out = q("bOut"), txt = q("bv").value.trim().toLowerCase(), b = +q("bb").value;
        if (!txt) { out.textContent = "Enter a value."; return; }
        const valid = { 2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^[0-9]+$/, 16: /^[0-9a-f]+$/ }[b];
        if (!valid.test(txt)) { out.textContent = "That is not a valid base-" + b + " number."; return; }
        const prefix = { 2: "0b", 8: "0o", 10: "", 16: "0x" }[b];
        const n = BigInt(prefix + txt);
        out.innerHTML = "Decimal: <b>" + n.toString(10) + "</b><br>Binary: <b>" + n.toString(2) + "</b><br>Octal: <b>" + n.toString(8) + "</b><br>Hex: <b>" + n.toString(16).toUpperCase() + "</b>";
      };
      q("bv").addEventListener("input", base);
      q("bb").addEventListener("change", base);

      root.addEventListener("click", (e) => {
        const t = e.target.closest("[data-add],[data-edit]");
        if (t) logForm(t.hasAttribute("data-edit") ? S.find("lab", t.getAttribute("data-edit")) : null, drawLog);
      });
      drawLog();
    }
  });
})();
