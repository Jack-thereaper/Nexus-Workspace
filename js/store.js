/*
 * Nexus Workspace: data layer (NEWLY IMPLEMENTED).
 * Everything lives in localStorage under "nexus.v1.<collection>".
 * Every write is validated, and imports are validated BEFORE anything changes.
 */
(function () {
  "use strict";
  const NX = (window.NX = window.NX || {});
  const ROOT = "nexus.v1."; // legacy prefix. The first user ("main") keeps using it, so old data still loads.
  const SCHEMA = 1;
  const MAX_ITEMS = 20000;

  let persistent = true;
  try {
    localStorage.setItem(ROOT + "__probe", "1");
    localStorage.removeItem(ROOT + "__probe");
  } catch (e) { persistent = false; }

  /* ---------- tiny validators ---------- */
  const S = (max) => (v) => typeof v === "string" && v.length <= max;
  const R = (max) => (v) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
  const N = (min, max) => (v) => typeof v === "number" && isFinite(v) && v >= min && v <= max;
  const B = () => (v) => typeof v === "boolean";
  const E = (list) => (v) => list.indexOf(v) !== -1;
  const DATE = (v) => typeof v === "string" && (v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v));
  const DATE_REQ = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const TIME = (v) => typeof v === "string" && (v === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(v));
  const L = (allowed) => (v) => Array.isArray(v) && v.length <= allowed.length &&
    v.every((x) => allowed.indexOf(x) !== -1) && v.filter((x, i) => v.indexOf(x) === i).length === v.length;
  const URL_REQ = (v) => typeof v === "string" && v.length <= 500 && /^https?:\/\/\S+$/i.test(v);

  const WIDGETS = ["tasks", "events", "goals", "jump"];
  const TILES = ["due", "overdue", "open", "focus", "gpa"];
  const ACCENTS = ["#4f8cff", "#22d3ee", "#34d399", "#a78bfa", "#fb923c", "#f472b6"];
  NX.HUD = { WIDGETS: WIDGETS, TILES: TILES, ACCENTS: ACCENTS };

  const COLLECTIONS = {
    tasks: { type: "array", label: "Tasks", spec: {
      id: R(64), title: R(200), due: DATE, priority: E(["low", "medium", "high"]),
      done: B(), doneOn: DATE, course: S(100), created: DATE } },
    notes: { type: "array", label: "Notes", spec: {
      id: R(64), title: S(200), body: S(100000), pinned: B(), updated: S(40) } },
    courses: { type: "array", label: "Courses", spec: {
      id: R(64), name: R(120), code: S(30), credits: N(0.5, 30),
      grade: E(["", "A", "B", "C", "D", "E", "F"]), semester: S(40) } },
    resources: { type: "array", label: "Resources", spec: {
      id: R(64), title: R(200), url: URL_REQ, category: S(60), note: S(500) } },
    events: { type: "array", label: "Events", spec: {
      id: R(64), title: R(200), date: DATE_REQ, time: TIME, note: S(500) } },
    goals: { type: "array", label: "Goals", spec: {
      id: R(64), title: R(200), current: N(0, 1e9), target: N(0.0001, 1e9), unit: S(30), due: DATE } },
    focus: { type: "array", label: "Focus sessions", spec: {
      id: R(64), date: DATE_REQ, minutes: N(1, 1440), label: S(200) } },
    lab: { type: "array", label: "Lab log", spec: {
      id: R(64), title: R(200), date: DATE, notes: S(5000), result: S(2000) } },
    profile: { type: "object", label: "Profile",
      defaults: { name: "", course: "", level: "", school: "", bio: "" },
      spec: { name: S(80), course: S(100), level: S(40), school: S(120), bio: S(500) } },
    hud: { type: "object", label: "HUD layout",
      defaults: { greeting: "", accent: "#4f8cff", compact: false, widgets: WIDGETS.slice(), tiles: TILES.slice() },
      spec: { greeting: S(80), accent: E(ACCENTS), compact: B(), widgets: L(WIDGETS), tiles: L(TILES) } },
    settings: { type: "object", label: "Settings",
      defaults: { gpaScale: "5", focusMin: 25, breakMin: 5, lastBackup: "", welcomed: false },
      spec: { gpaScale: E(["4", "5"]), focusMin: N(1, 180), breakMin: N(1, 60), lastBackup: S(40), welcomed: B() } }
  };
  const NAMES = Object.keys(COLLECTIONS);

  /* Keep only known fields. Unknown fields in imports are dropped. */
  function clean(name, item) {
    const spec = COLLECTIONS[name].spec;
    const out = {};
    if (!item || typeof item !== "object" || Array.isArray(item)) return out;
    Object.keys(spec).forEach((k) => { if (k in item) out[k] = item[k]; });
    return out;
  }
  function problems(name, item) {
    const spec = COLLECTIONS[name].spec;
    const bad = [];
    Object.keys(spec).forEach((k) => { if (!spec[k](item[k])) bad.push(k); });
    return bad;
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  const copy = (x) => JSON.parse(JSON.stringify(x));

  /* ---------- load / save ---------- */
  const cache = {};
  const mem = {};

  /* ---------- users on this device ---------- */
  const REG_KEY = "nexus.accounts", SESSION_KEY = "nexus.session";
  let sessionOK = true, memSession = null, memReg = null;
  try { sessionStorage.setItem("nexus.__p", "1"); sessionStorage.removeItem("nexus.__p"); } catch (e) { sessionOK = false; }
  const sessGet = () => { if (!sessionOK) return memSession; try { return sessionStorage.getItem(SESSION_KEY); } catch (e) { return memSession; } };
  const sessSet = (v) => { memSession = v; if (sessionOK) { try { sessionStorage.setItem(SESSION_KEY, v); } catch (e) { /* ignore */ } } };
  const sessClear = () => { memSession = null; if (sessionOK) { try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ } } };
  /* Set by "Switch user": keeps a lone, PIN-less user from being signed straight back in, so they can add someone. */
  const PICK_KEY = "nexus.pick";
  let memPick = false;
  const pickGet = () => { if (!sessionOK) return memPick; try { return sessionStorage.getItem(PICK_KEY) === "1"; } catch (e) { return memPick; } };
  const pickSet = (on) => { memPick = on; if (sessionOK) { try { if (on) sessionStorage.setItem(PICK_KEY, "1"); else sessionStorage.removeItem(PICK_KEY); } catch (e) { /* ignore */ } } };

  function readReg() {
    let raw = null;
    if (persistent) { try { raw = JSON.parse(localStorage.getItem(REG_KEY) || "null"); } catch (e) { raw = null; } } else raw = memReg;
    const list = raw && Array.isArray(raw.accounts) ? raw.accounts : [], out = [], seen = {};
    list.forEach((a) => {
      if (!a || typeof a.id !== "string" || !/^[a-z0-9]{1,32}$/.test(a.id) || seen[a.id]) return;
      seen[a.id] = 1;
      const ok = a.pin && typeof a.pin.salt === "string" && typeof a.pin.hash === "string";
      out.push({ id: a.id, pin: ok ? { salt: a.pin.salt, hash: a.pin.hash } : null });
    });
    return { accounts: out.length ? out : [{ id: "main", pin: null }] };
  }
  function writeReg() {
    memReg = copy(reg);
    if (persistent) { try { localStorage.setItem(REG_KEY, JSON.stringify(reg)); } catch (e) { /* ignore */ } }
  }
  const prefixFor = (id) => (id === "main" ? ROOT : ROOT + "u." + id + ".");
  let reg = readReg();
  let currentId = null;
  (function resolveSession() {
    const s0 = sessGet();
    if (s0 && reg.accounts.some((a) => a.id === s0)) currentId = s0;
    else if (reg.accounts.length === 1 && !reg.accounts[0].pin && !pickGet()) { currentId = reg.accounts[0].id; sessSet(currentId); }
  })();

  function peekName(id) {
    try {
      const k = prefixFor(id) + "profile";
      const raw = persistent ? localStorage.getItem(k) : mem[k];
      const o = raw ? JSON.parse(raw) : null;
      return o && typeof o.name === "string" ? o.name.trim().slice(0, 80) : "";
    } catch (e) { return ""; }
  }
  async function sha(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  const clearCache = () => { Object.keys(cache).forEach((k) => { delete cache[k]; }); };

  const accounts = {
    list() { return reg.accounts.map((a) => ({ id: a.id, name: peekName(a.id), hasPin: !!a.pin })); },
    current: () => currentId,
    isLocked: () => currentId === null,
    sessionOK: () => sessionOK,
    pinSupported: () => !!(window.crypto && window.crypto.subtle),
    hasPin(id) { const a = reg.accounts.filter((x) => x.id === id)[0]; return !!(a && a.pin); },

    async checkPin(id, pin) {
      const a = reg.accounts.filter((x) => x.id === id)[0];
      if (!a) return false;
      if (!a.pin) return true;
      if (!accounts.pinSupported() || typeof pin !== "string") return false;
      return (await sha(a.pin.salt + pin)) === a.pin.hash;
    },
    async login(id, pin) {
      if (!(await accounts.checkPin(id, pin))) return false;
      currentId = id; sessClear(); sessSet(id); pickSet(false); clearCache(); store.lastSnapshot = null;
      return true;
    },
    logout() { sessClear(); pickSet(true); },

    create(name) {
      const n = String(name || "").trim();
      if (!n || n.length > 80) throw new Error("Enter a name (up to 80 characters).");
      if (reg.accounts.length >= 20) throw new Error("That is the most users this device can hold.");
      const id = uid().replace(/[^a-z0-9]/g, "").slice(0, 20);
      reg.accounts.push({ id: id, pin: null }); writeReg();
      const key = prefixFor(id) + "profile", text = JSON.stringify({ name: n });
      if (persistent) { try { localStorage.setItem(key, text); } catch (e) { /* ignore */ } } else mem[key] = text;
      return id;
    },
    remove(id) {
      if (reg.accounts.length <= 1) throw new Error("You cannot delete the only user.");
      const i = reg.accounts.findIndex((x) => x.id === id);
      if (i === -1) return;
      const p = prefixFor(id);
      NAMES.forEach((n) => [n, n + ".corrupt"].forEach((k) => { delete mem[p + k]; try { localStorage.removeItem(p + k); } catch (e) { /* ignore */ } }));
      reg.accounts.splice(i, 1); writeReg();
      if (id === currentId) { currentId = null; sessClear(); clearCache(); }
    },
    async setPin(id, pin) {
      const a = reg.accounts.filter((x) => x.id === id)[0];
      if (!a) return;
      if (pin === null) { a.pin = null; writeReg(); return; }
      if (!/^\d{4,8}$/.test(pin)) throw new Error("A PIN is 4 to 8 digits.");
      if (!accounts.pinSupported()) throw new Error("PINs need a secure (https) page.");
      const salt = uid();
      a.pin = { salt: salt, hash: await sha(salt + pin) }; writeReg();
    }
  };

  function need() { if (currentId === null) throw new Error("Nobody is signed in."); return prefixFor(currentId); }
  function rawGet(name) {
    const k = need() + name;
    if (!persistent) return mem[k] === undefined ? null : mem[k];
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }
  function rawSet(name, text) {
    const k = need() + name;
    if (!persistent) { mem[k] = text; return true; }
    try { localStorage.setItem(k, text); return true; }
    catch (e) { if (NX.ui) NX.ui.toast("Could not save: browser storage is full or blocked."); return false; }
  }
  function rawDel(name) {
    const k = need() + name;
    delete mem[k];
    try { localStorage.removeItem(k); } catch (e) { /* ignore */ }
  }

  function load(name) {
    const def = COLLECTIONS[name];
    const raw = rawGet(name);
    let data = null;
    if (raw !== null) {
      try { data = JSON.parse(raw); } catch (e) { rawSet(name + ".corrupt", raw); data = null; }
    }
    if (def.type === "array") {
      if (!Array.isArray(data)) data = [];
      const good = [], dropped = [];
      data.forEach((it) => {
        const c = clean(name, it);
        (problems(name, c).length ? dropped : good).push(problems(name, c).length ? it : c);
      });
      if (dropped.length) {
        console.warn("Nexus: dropped " + dropped.length + " invalid " + name + " item(s); kept in " + name + ".corrupt");
        rawSet(name + ".corrupt", JSON.stringify(dropped));
      }
      return good;
    }
    const merged = Object.assign(copy(def.defaults), clean(name, data || {}));
    return problems(name, merged).length ? copy(def.defaults) : merged;
  }

  function ensure(name) {
    if (!COLLECTIONS[name]) throw new Error("Unknown collection: " + name);
    if (!(name in cache)) cache[name] = load(name);
    return cache[name];
  }
  function persist(name) { return rawSet(name, JSON.stringify(cache[name])); }

  /* ---------- public API ---------- */
  const store = {
    isPersistent: () => persistent,
    names: () => NAMES.slice(),
    label: (n) => COLLECTIONS[n].label,
    uid: uid,
    lastSnapshot: null,
    accounts: accounts,

    list(name) { return ensure(name).map((x) => Object.assign({}, x)); },
    get(name) { return copy(ensure(name)); },
    find(name, id) { const f = ensure(name).filter((x) => x.id === id)[0]; return f ? Object.assign({}, f) : null; },

    add(name, data) {
      const arr = ensure(name);
      const item = clean(name, Object.assign({ id: uid() }, data));
      const bad = problems(name, item);
      if (bad.length) throw new Error("Invalid " + name + " (" + bad.join(", ") + ")");
      if (arr.length >= MAX_ITEMS) throw new Error("Too many " + name);
      arr.push(item); persist(name);
      return Object.assign({}, item);
    },
    update(name, id, patch) {
      const arr = ensure(name);
      const i = arr.findIndex((x) => x.id === id);
      if (i === -1) throw new Error("Not found");
      const item = clean(name, Object.assign({}, arr[i], patch, { id: id }));
      const bad = problems(name, item);
      if (bad.length) throw new Error("Invalid " + name + " (" + bad.join(", ") + ")");
      arr[i] = item; persist(name);
      return Object.assign({}, item);
    },
    remove(name, id) {
      const arr = ensure(name);
      const i = arr.findIndex((x) => x.id === id);
      if (i !== -1) { arr.splice(i, 1); persist(name); }
    },
    setObject(name, patch) {
      const cur = ensure(name);
      const next = Object.assign({}, cur, clean(name, patch));
      const bad = problems(name, next);
      if (bad.length) throw new Error("Invalid " + name + " (" + bad.join(", ") + ")");
      cache[name] = copy(next); persist(name);
    },

    /* ---------- backup ---------- */
    exportAll(only) {
      const data = {};
      (only ? [only] : NAMES).forEach((n) => { data[n] = copy(ensure(n)); });
      return { app: "nexus-workspace", schema: SCHEMA, exported: new Date().toISOString(), data: data };
    },

    /* Checks a parsed backup. Changes nothing. */
    validateBackup(parsed) {
      const errors = [], warnings = [], counts = {}, cleaned = {};
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { ok: false, errors: ["This is not a Nexus backup file."], warnings, counts, cleaned };
      }
      if (parsed.app !== "nexus-workspace") errors.push("This file was not made by Nexus Workspace.");
      if (typeof parsed.schema !== "number" || parsed.schema > SCHEMA || parsed.schema < 1) {
        errors.push("Unsupported backup version (" + String(parsed.schema) + ").");
      }
      if (!parsed.data || typeof parsed.data !== "object" || Array.isArray(parsed.data)) {
        errors.push("The backup has no data section.");
        return { ok: false, errors, warnings, counts, cleaned };
      }
      Object.keys(parsed.data).forEach((name) => {
        if (!COLLECTIONS[name]) { warnings.push('Ignored unknown section "' + String(name).slice(0, 40) + '".'); return; }
        const def = COLLECTIONS[name], src = parsed.data[name];
        if (def.type === "array") {
          if (!Array.isArray(src)) { errors.push(def.label + ": expected a list."); return; }
          if (src.length > MAX_ITEMS) { errors.push(def.label + ": too many items."); return; }
          const seen = {}, out = [];
          let shown = 0;
          src.forEach((it, i) => {
            const c = clean(name, it), bad = problems(name, c);
            if (bad.length) {
              if (shown++ < 3) errors.push(def.label + " item " + (i + 1) + ": invalid " + bad.join(", ") + ".");
              return;
            }
            if (seen[c.id]) { errors.push(def.label + ": duplicate id in item " + (i + 1) + "."); return; }
            seen[c.id] = 1; out.push(c);
          });
          cleaned[name] = out; counts[name] = out.length;
        } else {
          const c = clean(name, src), merged = Object.assign(copy(def.defaults), c), bad = problems(name, merged);
          if (bad.length) { errors.push(def.label + ": invalid " + bad.join(", ") + "."); return; }
          cleaned[name] = merged; counts[name] = 1;
        }
      });
      if (!Object.keys(cleaned).length && !errors.length) errors.push("The backup contains nothing to import.");
      return { ok: errors.length === 0, errors, warnings, counts, cleaned };
    },

    /* Apply an already-validated backup. mode: "merge" or "replace". */
    importBackup(cleaned, mode) {
      store.lastSnapshot = store.exportAll();
      Object.keys(cleaned).forEach((name) => {
        const def = COLLECTIONS[name], cur = ensure(name);
        if (def.type === "array") {
          if (mode === "replace") cache[name] = cleaned[name].map((x) => Object.assign({}, x));
          else {
            const have = {};
            cur.forEach((x) => { have[x.id] = 1; });
            cleaned[name].forEach((x) => { if (!have[x.id]) cur.push(Object.assign({}, x)); });
          }
        } else if (mode === "replace") {
          cache[name] = copy(cleaned[name]);
        }
        persist(name);
      });
    },

    undoImport() {
      if (!store.lastSnapshot) return false;
      const snap = store.lastSnapshot;
      Object.keys(snap.data).forEach((n) => { cache[n] = copy(snap.data[n]); persist(n); });
      store.lastSnapshot = null;
      return true;
    },

    resetAll() {
      NAMES.forEach((n) => { rawDel(n); rawDel(n + ".corrupt"); delete cache[n]; });
      store.lastSnapshot = null;
    }
  };

  NX.store = store;
  NX.pages = [];
  NX.register = (p) => NX.pages.push(p);
})();
