/* Minimal stand-in for the Claude dashboard runtime, so report/ runs as a static site.
   Implements only what report/app.js uses: data, calc, draw, onData, colors. */
(function () {
  'use strict';
  const SOURCES = window.DASH_SOURCES || {};
  const store = {};
  const calcs = {};
  const draws = {};
  const onDataFns = [];
  let version = 0;
  let scheduled = false;

  function load(id) {
    if (store[id]) return;
    const url = SOURCES[id];
    if (!url) { store[id] = { status: 'missing', data: [] }; return; }
    store[id] = { status: 'loading', data: [] };
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then((t) => {
        const rows = d3.csvParse(t);
        store[id] = { status: 'ok', data: rows, columns: rows.columns, v: ++version };
        schedule();
      })
      .catch((e) => { store[id] = { status: 'error', data: [], message: String(e) }; schedule(); });
  }

  function calcValue(id) {
    const c = calcs[id];
    const ins = c.inputs.map(data);
    if (ins.some((s) => s.status === 'loading')) return { status: 'loading', data: null };
    const bad = ins.find((s) => s.status !== 'ok');
    if (bad) return { status: bad.status, data: null };
    const key = ins.map((s) => s.v).join('|');
    if (c.key !== key) { c.key = key; c.value = c.fn(...ins.map((s) => s.data)); c.v = ++version; }
    return { status: 'ok', data: c.value, v: c.v };
  }

  function data(id) {
    if (calcs[id]) return calcValue(id);
    load(id);
    return store[id];
  }

  function runDraw(name) {
    const fn = draws[name];
    if (!fn) return;
    document.querySelectorAll('[data-draw="' + name + '"]').forEach((el) => {
      try { fn(el); } catch (e) { console.error('draw ' + name, e); }
    });
  }

  function runAll() {
    scheduled = false;
    onDataFns.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
    Object.keys(draws).forEach(runDraw);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(runAll);
  }

  let lastWidth = 0;
  new ResizeObserver(() => {
    const w = document.documentElement.clientWidth;
    if (w !== lastWidth) { lastWidth = w; schedule(); }
  }).observe(document.documentElement);

  window.dash = {
    data,
    calc(id, def) { calcs[id] = { inputs: def.inputs || [], fn: def.fn }; },
    loader() {},
    draw(name, fn) {
      if (fn === undefined) { runDraw(name); return; }
      draws[name] = typeof fn === 'function' ? fn : (el) => fn.update && fn.update(el, fn.mount && fn.mount(el));
      schedule();
    },
    onData(fn) { onDataFns.push(fn); fn(); },
    colors: ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)', 'var(--c7)'],
    params: () => ({}),
    setParams() {},
    resetParams() {},
    setLink() {},
    refresh() {},
  };
})();
