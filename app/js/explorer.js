// Data explorer: any cause, sex, age group and period, as a chart and a table.
import { T, LABELS, JA_TERM, fmt, ageLabel } from './i18n.js';
import { color, lineChart, ageLines } from './charts.js';
import { copyLink, downloadCSV, exportPNG } from './share.js';

const CAUSES = ['total', 'traffic', 'falls', 'drowning', 'choking', 'fire', 'poisoning', 'other'];
const AGES = ['0–4', '5–9', '10–14', '15–19', '20–24', '25–29', '30–34', '35–39', '40–44', '45–49', '50–54',
  '55–59', '60–64', '65–69', '70–74', '75–79', '80–84', '85–89', '90+'];
const FIRST = 1995, LAST = 2025, LAST_RATE = 2024;
const DEFAULTS = { v: 'time', c: ['falls', 'drowning', 'choking', 'traffic'], s: 'all', a: 'all', m: 'deaths', f: FIRST, t: LAST, y: LAST_RATE, cy: '' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

export function parseState(hash) {
  const q = new URLSearchParams((hash.split('?')[1]) || '');
  const num = (k, lo, hi, dflt) => { const v = parseInt(q.get(k), 10); return v >= lo && v <= hi ? v : dflt; };
  const c = (q.get('c') || '').split(',').filter((x) => CAUSES.includes(x));
  const s = {
    v: q.get('v') === 'age' ? 'age' : 'time',
    c: c.length ? c : DEFAULTS.c.slice(),
    s: ['all', 'male', 'female', 'compare'].includes(q.get('s')) ? q.get('s') : 'all',
    a: ['all', ...AGES].includes(q.get('a')) ? q.get('a') : 'all',
    m: q.get('m') === 'rate' ? 'rate' : 'deaths',
    f: num('f', FIRST, LAST, FIRST), t: num('t', FIRST, LAST, LAST),
    y: num('y', FIRST, LAST, LAST_RATE), cy: q.get('cy') ? num('cy', FIRST, LAST, '') : '',
  };
  if (s.f > s.t) [s.f, s.t] = [s.t, s.f];
  return s;
}

const stateHash = (s) => `#explorer?${new URLSearchParams({ v: s.v, c: s.c.join(','), s: s.s, a: s.a, m: s.m, f: s.f, t: s.t, y: s.y, cy: s.cy })}`;

export function renderExplorer(root, d, lang, initial) {
  const t = T[lang], x = t.ex, L = LABELS[lang];
  let s = { ...initial, c: initial.c.slice() };
  const years = Array.from({ length: LAST - FIRST + 1 }, (_, i) => FIRST + i);
  const opt = (v, text, sel) => `<option value="${v}"${String(v) === String(sel) ? ' selected' : ''}>${esc(text)}</option>`;
  const seg = (name, items, cur) => `<div class="toggle" role="group" data-name="${name}">${items.map(([v, text]) =>
    `<button type="button" data-v="${v}" aria-pressed="${v === cur}">${esc(text)}</button>`).join('')}</div>`;

  root.innerHTML = `
    <section class="ex" aria-labelledby="ex-h">
      <header class="ex-head">
        <h1 class="title small" id="ex-h">${esc(x.title)}</h1>
        <p class="lede small">${esc(x.intro)}</p>
      </header>
      <div class="ex-grid">
        <form class="ex-controls card" id="ex-form" onsubmit="return false">
          <div class="field"><span class="field-label">${esc(x.view)}</span>${seg('v', [['time', x.overTime], ['age', x.byAge]], s.v)}</div>
          <fieldset class="field"><legend class="field-label">${esc(x.causes)}</legend>
            <div class="chips">${CAUSES.map((c) => `<label class="chip"><input type="checkbox" name="c" value="${c}"${s.c.includes(c) ? ' checked' : ''}>
              <i class="sw" style="--sw:${color(c)}"></i><span>${esc(L[c])}${lang === 'en' && JA_TERM[c] ? ` <span class="ja" lang="ja">${JA_TERM[c]}</span>` : ''}</span></label>`).join('')}</div>
          </fieldset>
          <label class="field"><span class="field-label">${esc(x.sex)}</span>
            <select id="ex-s" class="select">${[['all', L.all], ['male', L.male], ['female', L.female], ['compare', x.compareSex]].map(([v, l]) => opt(v, l, s.s)).join('')}</select></label>
          <label class="field" data-only="time"><span class="field-label">${esc(x.age)}</span>
            <select id="ex-a" class="select">${['all', ...AGES].map((a) => opt(a, ageLabel(a, lang), s.a)).join('')}</select></label>
          <div class="field"><span class="field-label">${esc(x.measure)}</span>${seg('m', [['deaths', L.deaths], ['rate', L.rate]], s.m)}</div>
          <div class="field two" data-only="time">
            <label><span class="field-label">${esc(x.from)}</span><select id="ex-f" class="select">${years.map((y) => opt(y, y, s.f)).join('')}</select></label>
            <label><span class="field-label">${esc(x.to)}</span><select id="ex-t" class="select">${years.map((y) => opt(y, y, s.t)).join('')}</select></label>
          </div>
          <div class="field two" data-only="age">
            <label><span class="field-label">${esc(x.year)}</span><select id="ex-y" class="select">${years.map((y) => opt(y, y, s.y)).join('')}</select></label>
            <label><span class="field-label">${esc(x.compareYear)}</span><select id="ex-cy" class="select">${opt('', x.none, s.cy)}${years.map((y) => opt(y, y, s.cy)).join('')}</select></label>
          </div>
          <button type="button" class="link-btn" id="ex-reset">${esc(x.reset)}</button>
        </form>
        <div class="ex-out">
          <div class="card" id="ex-card">
            <div class="card-top"><p class="card-title" id="ex-title"></p>
              <div class="tools"><div class="actions">
                <button type="button" class="act" data-act="link" title="${esc(t.copyLink)}" aria-label="${esc(t.copyLink)}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8.5 11.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5l-1 1M11.5 8.5a3.5 3.5 0 0 0-5 0L4 11a3.5 3.5 0 0 0 5 5l1-1"/></svg></button>
                <button type="button" class="act" data-act="png" title="${esc(t.pngTitle)}">${t.png}</button>
                <button type="button" class="act" data-act="csv" title="${esc(t.csvTitle)}">${t.csv}</button>
              </div></div></div>
            <ul class="legend" id="ex-legend"></ul>
            <div class="chart-area"><div class="chart" id="ex-chart"></div></div>
            <div class="ex-summary" id="ex-summary"></div>
            <p class="note" id="ex-note"></p>
          </div>
          <div class="card table-card"><div class="table-wrap"><table class="table" id="ex-table"></table></div></div>
        </div>
      </div>
    </section>`;

  const $ = (sel) => root.querySelector(sel);
  const value = (year, cause, sex, age) => {
    const r = d.exIndex.get(`${year}|${cause}|${sex}|${age}`);
    if (!r) return { v: null, derived: false };
    return s.m === 'rate' ? { v: r.rate, derived: !!r.rate_derived } : { v: r.deaths, derived: false };
  };
  const sexes = () => (s.s === 'compare' ? ['male', 'female'] : [s.s]);
  const fmtV = (v) => (v == null ? '—' : s.m === 'rate' ? fmt('rate', v, lang) : fmt('int', v, lang));

  function build() {
    const out = { series: [], derivedUsed: false };
    if (s.v === 'time') {
      const ys = years.filter((y) => y >= s.f && y <= s.t);
      out.rows = ys.map((y) => ({ year: y }));
      s.c.forEach((c) => sexes().forEach((sx) => {
        const key = `${c}|${sx}`;
        out.series.push({ key, cause: c, sex: sx, color: color(c), dash: s.s === 'compare' && sx === 'female' ? '5 3' : null,
          label: s.s === 'compare' ? `${L[c]} · ${L[sx]}` : L[c] });
        out.rows.forEach((row) => {
          const { v, derived } = value(row.year, c, sx, s.a);
          row[key] = v;
          if (derived && v != null) { row[`${key}*`] = true; out.derivedUsed = true; }
        });
      }));
    } else {
      const ys = [s.y, ...(s.cy !== '' && s.cy !== s.y ? [s.cy] : [])];
      s.c.forEach((c) => sexes().forEach((sx) => ys.forEach((y, yi) => {
        const vals = AGES.map((a) => value(y, c, sx, a));
        if (vals.some((v) => v.derived && v.v != null)) out.derivedUsed = true;
        out.series.push({ cause: c, sex: sx, year: y, color: color(c),
          dash: s.s === 'compare' && sx === 'female' ? '5 3' : null, width: yi === 1 ? 1.5 : 2.25, opacity: yi === 1 ? 0.45 : null,
          label: [L[c], s.s === 'compare' ? L[sx] : null, ys.length > 1 ? String(y) : null].filter(Boolean).join(' · '),
          values: vals.map((v) => v.v), derived: vals.map((v) => v.derived) });
      })));
    }
    return out;
  }

  function title() {
    const sexText = s.s === 'compare' ? x.compareSex : L[s.s];
    const tplS = s.v === 'time' ? x.chartTitleTime : x.chartTitleAge;
    return tplS.replace('{measure}', L[s.m]).replace('{sex}', sexText).replace('{age}', ageLabel(s.a, lang))
      .replace('{y0}', s.f).replace('{y1}', s.t).replace('{year}', s.cy !== '' && s.cy !== s.y ? `${s.y} / ${s.cy}` : s.y);
  }

  function draw() {
    root.querySelectorAll('[data-only]').forEach((el) => { el.hidden = el.dataset.only !== s.v; });
    root.querySelectorAll('.toggle[data-name]').forEach((g) => g.querySelectorAll('button').forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.v === s[g.dataset.name]))));
    $('#ex-title').textContent = title();
    const chart = $('#ex-chart');
    if (!s.c.length) {
      chart.innerHTML = `<p class="msg">${esc(x.pickCause)}</p>`;
      $('#ex-legend').innerHTML = ''; $('#ex-summary').innerHTML = ''; $('#ex-table').innerHTML = ''; $('#ex-note').textContent = '';
      return;
    }
    const b = build();
    $('#ex-legend').innerHTML = b.series.filter((se, i, arr) => arr.findIndex((o) => o.label === se.label) === i)
      .map((se) => `<li><i class="sw${se.dash ? ' dashed' : ''}" style="--sw:${se.color}${se.opacity ? `;opacity:${se.opacity}` : ''}"></i><span>${esc(se.label)}</span></li>`).join('');
    const tipFmt = (v, row, se) => (v == null ? '—' : fmtV(v) + (row && se && row[`${se.key}*`] ? '*' : ''));
    if (s.v === 'time') {
      lineChart(chart, { rows: b.rows, series: b.series, yFmt: (v) => (s.m === 'rate' ? String(v) : fmt('int', v, lang)), tipFmt,
        tipTitle: (y) => fmt('year', y, lang), aria: title() });
    } else {
      ageLines(chart, { ages: AGES, series: b.series, tipTitle: (a) => ageLabel(a, lang), ageFmt: (a) => a,
        tipFmt: (v, i, se) => (v == null ? '—' : fmtV(v) + (se.derived[i] ? '*' : '')), aria: title() });
    }
    summary(b);
    table(b);
    const notes = [];
    if (b.derivedUsed) notes.push(x.derived);
    if (s.m === 'rate' && ((s.v === 'time' && s.t >= LAST) || (s.v === 'age' && (s.y === LAST || s.cy === LAST)))) notes.push(x.noRate2025);
    $('#ex-note').textContent = notes.join(' ');
  }

  function summary(b) {
    const lines = b.series.slice(0, 6).map((se) => {
      if (s.v === 'time') {
        const pts = b.rows.filter((r) => r[se.key] != null);
        if (pts.length < 2) return null;
        const a = pts[0], z = pts[pts.length - 1];
        const chg = a[se.key] ? fmt('signed', Math.round((1000 * (z[se.key] - a[se.key])) / a[se.key]) / 10, lang) : '—';
        return x.summary.replace('{series}', se.label).replace('{a}', fmtV(a[se.key])).replace('{y0}', fmt('year', a.year, lang))
          .replace('{b}', fmtV(z[se.key])).replace('{y1}', fmt('year', z.year, lang)).replace('{chg}', chg);
      }
      const vals = se.values.map((v, i) => [v, i]).filter(([v]) => v != null);
      if (!vals.length) return null;
      const [v, i] = vals.reduce((p, q) => (q[0] > p[0] ? q : p));
      return x.summaryAge.replace('{series}', se.label.replace(` · ${se.year}`, '')).replace('{year}', fmt('year', se.year, lang))
        .replace('{age}', ageLabel(AGES[i], lang)).replace('{v}', fmtV(v) + (se.derived[i] ? '*' : ''));
    }).filter(Boolean);
    $('#ex-summary').innerHTML = lines.map((l) => `<p>${esc(l)}</p>`).join('');
  }

  function table(b) {
    const head = s.v === 'time' ? x.tableYear : x.tableAge;
    const cols = b.series.map((se) => `<th scope="col"><i class="sw${se.dash ? ' dashed' : ''}" style="--sw:${se.color}"></i>${esc(se.label)}</th>`).join('');
    let body;
    if (s.v === 'time') {
      body = b.rows.slice().reverse().map((r) => `<tr><th scope="row">${r.year}</th>${b.series.map((se) =>
        `<td>${esc(fmtV(r[se.key]))}${r[`${se.key}*`] ? '*' : ''}</td>`).join('')}</tr>`).join('');
    } else {
      body = AGES.map((a, i) => `<tr><th scope="row">${esc(ageLabel(a, lang))}</th>${b.series.map((se) =>
        `<td>${esc(fmtV(se.values[i]))}${se.derived[i] && se.values[i] != null ? '*' : ''}</td>`).join('')}</tr>`).join('');
    }
    $('#ex-table').innerHTML = `<thead><tr><th scope="col">${esc(head)}</th>${cols}</tr></thead><tbody>${body}</tbody>`;
  }

  function commit() {
    history.replaceState(null, '', `${location.pathname}${location.search}${stateHash(s)}`);
    draw();
  }

  // ───────────────────────── controls
  root.querySelectorAll('.toggle[data-name]').forEach((g) => g.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-v]');
    if (!btn) return;
    s[g.dataset.name] = btn.dataset.v;
    if (s.m === 'rate' && s.v === 'age' && s.y === LAST && s.cy === '') s.y = LAST_RATE;
    commit();
  }));
  root.querySelectorAll('input[name="c"]').forEach((inp) => inp.addEventListener('change', () => {
    s.c = [...root.querySelectorAll('input[name="c"]:checked')].map((i) => i.value);
    commit();
  }));
  const sel = (id, key, cast = (v) => v) => $(id).addEventListener('change', (ev) => { s[key] = cast(ev.target.value); commit(); });
  sel('#ex-s', 's');
  sel('#ex-a', 'a');
  $('#ex-f').addEventListener('change', (ev) => {
    s.f = Number(ev.target.value);
    if (s.f > s.t) { s.t = s.f; $('#ex-t').value = s.t; }
    commit();
  });
  $('#ex-t').addEventListener('change', (ev) => {
    s.t = Number(ev.target.value);
    if (s.t < s.f) { s.f = s.t; $('#ex-f').value = s.f; }
    commit();
  });
  sel('#ex-y', 'y', Number);
  sel('#ex-cy', 'cy', (v) => (v === '' ? '' : Number(v)));
  $('#ex-reset').addEventListener('click', () => {
    s = { ...DEFAULTS, c: DEFAULTS.c.slice() };
    root.querySelectorAll('input[name="c"]').forEach((i) => { i.checked = s.c.includes(i.value); });
    [['#ex-s', s.s], ['#ex-a', s.a], ['#ex-f', s.f], ['#ex-t', s.t], ['#ex-y', s.y], ['#ex-cy', s.cy]].forEach(([id, v]) => { $(id).value = v; });
    commit();
  });

  root.querySelectorAll('#ex-card .act').forEach((btn) => btn.addEventListener('click', async () => {
    if (btn.dataset.act === 'link') {
      copyLink(`${location.origin}${location.pathname}?lang=${lang}${stateHash(s)}`, t.copied, t.copyFail);
    } else if (btn.dataset.act === 'csv') {
      const ys = s.v === 'time' ? years.filter((y) => y >= s.f && y <= s.t) : [s.y, s.cy].filter((y) => y !== '');
      const ages = s.v === 'time' ? [s.a] : AGES;
      const rows = d.explorer.filter((r) => ys.includes(r.year) && s.c.includes(r.cause) && sexes().includes(r.sex) && ages.includes(r.age));
      downloadCSV('japan-accidental-deaths-explorer.csv', rows, ['year', 'cause', 'sex', 'age', 'deaths', 'rate', 'rate_derived']);
    } else {
      btn.disabled = true;
      const b = build();
      const legend = b.series.map((se) => ({ label: se.label, css: cssVar(`--k-${se.cause}`), dash: !!se.dash }));
      try {
        await exportPNG({ area: $('#ex-card .chart-area'), title: title(), legend, note: $('#ex-note').textContent, source: t.source,
          filename: `japan-accidental-deaths-explorer-${lang}.png` });
      } finally { btn.disabled = false; }
    }
  }));

  draw();
  return { redraw: draw };
}
