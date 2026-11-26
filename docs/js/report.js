// The nine-figure report, rendered in the current language.
import { T, LABELS, JA_TERM, tpl, fmt, ageLabel } from './i18n.js';
import { numbers } from './data.js';
import { color, lineChart, yearBars, ageLines, stackedBars, dumbbell } from './charts.js';
import { copyLink, downloadCSV, exportPNG } from './share.js';

const TYPES6 = ['falls', 'drowning', 'choking', 'traffic', 'fire', 'poisoning'];
const MIX_KEYS = ['falls', 'drowning', 'choking', 'traffic', 'fire', 'poisoning', 'other'];
const FIG9 = ['W01', 'W65-W66', 'W79', 'V01-V98', 'X30', 'X31', 'X00', 'W10', 'W69-W70', 'W13'];
const AGE_GROUPS_2025 = ['0', '1–4', '5–9', '10–14', '15–29', '30–44', '45–64', '65–79', '80 and over'];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const cssColor = (key) => cssVar(`--k-${key}`);

export function renderReport(root, d, lang) {
  const t = T[lang], L = LABELS[lang], nums = numbers(d);
  const fill = (s) => tpl(s, nums, lang);
  const label = (k) => L[k];
  const legendItem = (k, extra = '') => `<li><i class="sw${extra}" style="--sw:${color(k)}"></i><span>${esc(label(k))}</span>${lang === 'en' && JA_TERM[k] ? ` <span class="ja" lang="ja">${JA_TERM[k]}</span>` : ''}</li>`;
  const state = { fig1: 'deaths', fig4: 'count', fig8: 'count' };
  const draws = [];

  const kpi = (id, cfg, value, deltaKey, good) => {
    const [lab, sub1, sub2] = cfg;
    const delta = deltaKey ? nums[deltaKey][0] : null;
    const cls = delta == null ? '' : (good === 'down' ? delta < 0 : delta > 0) ? 'good' : 'bad';
    const sub1Html = sub1.includes('{d}')
      ? sub1.split('{d}').map(fill).join(`<b class="delta ${cls}">${fmt('signed', delta, lang)}</b>`)
      : fill(sub1);
    return `<div class="kpi" id="kpi-${id}"><p class="kpi-label">${esc(lab)}</p><p class="kpi-value">${value}</p>
      <p class="kpi-sub">${sub1Html}</p><p class="kpi-sub">${fill(sub2)}</p></div>`;
  };

  const tools = (n, modes) => `<div class="tools">
      ${modes ? `<div class="toggle" role="group" data-fig="${n}">${modes.map((m, i) => `<button type="button" data-mode="${m[0]}" aria-pressed="${i === 0}">${esc(m[1])}</button>`).join('')}</div>` : ''}
      <div class="actions">
        <button type="button" class="act" data-act="link" data-fig="${n}" title="${esc(t.copyLink)}" aria-label="${esc(t.copyLink)}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8.5 11.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5l-1 1M11.5 8.5a3.5 3.5 0 0 0-5 0L4 11a3.5 3.5 0 0 0 5 5l1-1"/></svg></button>
        <button type="button" class="act" data-act="png" data-fig="${n}" title="${esc(t.pngTitle)}">${t.png}</button>
        <button type="button" class="act" data-act="csv" data-fig="${n}" title="${esc(t.csvTitle)}">${t.csv}</button>
      </div></div>`;

  const section = (n, s, { ref = true, legend = '', modes = null, body, note }) => `
    <section class="sec" id="fig-${n}" aria-labelledby="fig-${n}-h">
      <p class="fig">${esc(t.figure)}${lang === 'ja' ? '' : ' '}${n}<span class="fig-ref">${ref ? `${esc(t.ref)} <span lang="ja">図${n}</span>` : esc(t.newFig)}</span></p>
      <h2 class="h2" id="fig-${n}-h">${esc(s.h)}</h2>
      <div class="text">${s.p.map((p) => `<p>${fill(p)}</p>`).join('')}</div>
      <div class="card">
        <div class="card-top"><p class="card-title">${esc(s.card)}</p>${tools(n, modes)}</div>
        ${legend}
        <div class="chart-area" data-area="${n}">${body}</div>
        ${note !== '' ? `<p class="note">${esc(note ?? s.note)}</p>` : ''}
      </div>
    </section>`;

  const panels = ['traffic', 'falls', 'drowning', 'choking', 'fire', 'poisoning'];
  root.innerHTML = `
    <header class="head" id="top">
      <p class="eyebrow">${esc(t.eyebrow)}</p>
      <h1 class="title">${esc(t.title)}</h1>
      <p class="lede">${fill(t.lede)}</p>
      <p class="meta">${esc(t.meta)}</p>
    </header>
    <section class="kpis" aria-label="${lang === 'ja' ? '主な数値' : 'Key figures'}">
      ${kpi('total', t.kpi.total, fmt('int', nums.tot25[0]), 'd_total', 'down')}
      ${kpi('traffic', t.kpi.traffic, fmt('int', nums.trf25[0]), 'd_traffic', 'down')}
      ${kpi('falls', t.kpi.falls, fmt('int', nums.fal25[0]), 'd_falls', 'down')}
      ${kpi('drowning', t.kpi.drowning, fmt('int', nums.drw25[0]), 'd_drowning', 'down')}
      ${kpi('age', t.kpi.age, fmt('pct', nums.age65[0]), null)}
    </section>
    <nav class="toc" aria-label="${lang === 'ja' ? '目次' : 'Sections'}">${t.toc.map((x, i) => `<a href="#fig-${i + 1}">${i + 1} ${esc(x)}</a>`).join('')}</nav>
    ${section(1, t.s1, { modes: [['deaths', t.s1.modes[0]], ['rate', t.s1.modes[1]]], body: '<div class="chart" data-chart="1"></div>' })}
    ${section(2, t.s2, { legend: `<ul class="legend">${TYPES6.map((k) => legendItem(k)).join('')}</ul>`, body: '<div class="chart" data-chart="2"></div>' })}
    ${section(3, t.s3, {
      legend: `<ul class="legend years"><li><i class="ln ln-1995"></i>1995</li><li><i class="ln ln-2008"></i>2008</li><li><i class="ln ln-2024"></i>2024</li></ul>`,
      body: `<div class="panel wide"><p class="panel-title">${esc(label('total'))}</p><div class="chart panel-chart" data-chart="3" data-type="total"></div></div>
        <div class="panels">${panels.map((k) => `<div class="panel"><p class="panel-title">${esc(label(k))}</p><div class="chart panel-chart" data-chart="3" data-type="${k}"></div></div>`).join('')}</div>`,
    })}
    ${section(4, t.s4, { modes: [['count', t.s4.modes[0]], ['index', t.s4.modes[1]]], legend: `<ul class="legend">${['pedestrian', 'car', 'motorcycle', 'cyclist'].map((k) => legendItem(k)).join('')}</ul>`, body: '<div class="chart" data-chart="4"></div>' })}
    ${section(5, t.s5, { legend: `<ul class="legend">${['unknown_place', 'home', 'other_place', 'residential_institution', 'public_area', 'industrial'].map((k) => legendItem(k, k === 'unknown_place' ? ' dashed' : '')).join('')}</ul>`, body: '<div class="chart" data-chart="5"></div>' })}
    ${section(6, t.s6, { legend: `<ul class="legend">${['drowning', 'choking', 'falls', 'fire', 'poisoning'].map((k) => legendItem(k)).join('')}</ul>`, body: '<div class="chart" data-chart="6"></div>', note: '' })}
    ${section(7, t.s7, { legend: `<ul class="legend">${['drowning', 'fire', 'poisoning', 'choking', 'falls', 'overall'].map((k) => legendItem(k, k === 'overall' ? ' dashed' : '')).join('')}</ul>`, body: '<div class="chart" data-chart="7"></div>' })}
    ${section(8, t.s8, { ref: false, modes: [['count', t.s8.modes[0]], ['share', t.s8.modes[1]]], legend: `<ul class="legend">${MIX_KEYS.map((k) => legendItem(k)).join('')}</ul>`, body: '<div class="chart" data-chart="8"></div>' })}
    ${section(9, t.s9, { ref: false, legend: `<ul class="legend years"><li><i class="dot dot-from"></i>${esc(t.s9.legend[0])}</li><li><i class="dot dot-up"></i>${esc(t.s9.legend[1])}</li><li><i class="dot dot-down"></i>${esc(t.s9.legend[2])}</li></ul>`, body: '<div class="chart" data-chart="9"></div>' })}
    <footer class="about" id="about">
      <details>
        <summary>${esc(t.about.summary)}</summary>
        <div class="about-body">
          <h3>${esc(t.about.sources)}</h3><ul>${t.about.sourceItems.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          <p class="links"><a href="https://www.e-stat.go.jp/stat-search/files?toukei=00450011&amp;tstat=000001028897" rel="noopener">e-Stat 人口動態調査</a> · <a href="https://www.mhlw.go.jp/toukei/saikin/hw/jinkou/tokusyu/furyo10/01.html" rel="noopener">MHLW 2009 report</a></p>
          <h3>${esc(t.about.method)}</h3><ul>${t.about.methodItems.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          <h3>${esc(t.about.caveats)}</h3><ul>${t.about.caveatItems.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        </div>
      </details>
    </footer>`;

  // ───────────────────────── figure definitions: draw, CSV rows, PNG legend
  const intF = (v) => fmt('int', v, lang);
  const rateF = (v) => fmt('rate', v, lang);
  const pctF = (v) => fmt('pct', v, lang);
  const yearT = (y) => fmt('year', y, lang);
  const series = (keys, extra = {}) => keys.map((k) => ({ key: k, color: color(k), label: label(k), ...(extra[k] || {}) }));
  const legendFor = (keys, dashed = []) => keys.map((k) => ({ label: label(k), css: cssColor(k), dash: dashed.includes(k) }));
  const C = (rows, columns) => ({ rows, columns });

  const figs = {
    1: {
      draw(el) {
        const rate = state.fig1 === 'rate';
        yearBars(el, {
          rows: d.long_run, key: rate ? 'accidental_rate' : 'accidental_deaths', fmt: rate ? rateF : intF,
          highlight: [1923, 1995, 2011], labelYears: [1923, 2011],
          aria: t.s1.card, tipTitle: yearT,
          tipItems: (r) => (r ? [
            { color: 'var(--k-bars)', label: t.s1.modes[0], value: intF(r.accidental_deaths) },
            { color: 'transparent', label: t.s1.modes[1], value: r.accidental_rate == null ? t.s1.notPublished : rateF(r.accidental_rate) },
          ] : [{ label: t.s1.noRecord, value: '' }]),
        });
      },
      csv: () => C(d.long_run, ['year', 'all_deaths', 'accidental_deaths', 'accidental_rate', 'traffic_deaths', 'traffic_rate']),
      legend: () => [],
    },
    2: {
      draw: (el) => lineChart(el, { rows: d.by_type, series: series(TYPES6), yFmt: intF, tipFmt: intF, tipTitle: yearT,
        refs: [{ x: 2008, dash: '5 4' }, { x: 2017, dash: '1 3' }], aria: t.s2.card }),
      csv: () => C(d.by_type, ['year', 'total', 'traffic', 'falls', 'drowning', 'choking', 'fire', 'poisoning', 'other', 'source']),
      legend: () => legendFor(TYPES6),
    },
    3: {
      draw(el) {
        const type = el.dataset.type;
        const ages = [...new Set(d.age_rates.map((r) => r.age))];
        const s = [1995, 2008, 2024].map((y) => ({
          label: String(y), color: y === 2024 ? (type === 'total' ? 'var(--fg)' : color(type)) : y === 2008 ? 'var(--muted)' : 'var(--muted-mark)',
          dash: y === 1995 ? '2 3' : y === 2008 ? '5 3' : null, width: y === 2024 ? 2.5 : 1.5,
          values: ages.map((a) => (d.age_rates.find((r) => r.year === y && r.age === a) || {})[type] ?? null),
        }));
        const wide = type === 'total';
        ageLines(el, { ages, series: s, small: !wide, height: wide ? Math.round(Math.min(280, Math.max(210, el.clientWidth * 0.28))) : 180,
          tipTitle: (a) => `${t.s3.agesPrefix} ${ageLabel(a, lang)}`, tipFmt: rateF, ageFmt: (a) => a, aria: `${t.s3.card}: ${label(type)}` });
      },
      csv: () => C(d.age_rates, ['year', 'age', 'total', 'traffic', 'falls', 'drowning', 'choking', 'fire', 'poisoning', 'source']),
      legend: () => [{ label: '1995', css: cssVar('--muted-mark'), dash: true }, { label: '2008', css: cssVar('--muted'), dash: true }, { label: '2024', css: cssVar('--fg') }],
    },
    4: {
      draw(el) {
        const idx = state.fig4 === 'index';
        lineChart(el, { rows: idx ? d.traffic_index : d.traffic_mode, series: series(['pedestrian', 'car', 'motorcycle', 'cyclist']),
          yFmt: idx ? (v) => String(v) : intF, tipFmt: idx ? rateF : intF, tipTitle: yearT, yMax: idx ? 100 : null,
          hrefs: idx ? [100] : [], refs: [{ x: 2008, dash: '5 4' }], aria: t.s4.card });
      },
      csv: () => (state.fig4 === 'index'
        ? C(d.traffic_index, ['year', 'pedestrian', 'car', 'motorcycle', 'cyclist', 'pedestrian_share'])
        : C(d.traffic_mode, ['year', 'total', 'pedestrian', 'cyclist', 'motorcycle', 'car', 'light_truck_van', 'heavy_vehicle', 'other_land', 'water', 'other', 'source'])),
      legend: () => legendFor(['pedestrian', 'car', 'motorcycle', 'cyclist']),
    },
    5: {
      draw: (el) => lineChart(el, { rows: d.place,
        series: series(['unknown_place', 'home', 'other_place', 'residential_institution', 'public_area', 'industrial'], { unknown_place: { dash: '3 3', textColor: 'var(--muted)' } }),
        yFmt: intF, tipFmt: intF, tipTitle: yearT, refs: [{ x: 2008, dash: '5 4' }], aria: t.s5.card }),
      csv: () => C(d.place, ['year', 'total', 'home', 'residential_institution', 'public_area', 'sports', 'street', 'commercial', 'industrial', 'farm', 'other_place', 'unknown_place', 'source']),
      legend: () => legendFor(['unknown_place', 'home', 'other_place', 'residential_institution', 'public_area', 'industrial'], ['unknown_place']),
    },
    6: {
      draw: (el) => lineChart(el, { rows: d.home_type, series: series(['drowning', 'choking', 'falls', 'fire', 'poisoning']),
        yFmt: intF, tipFmt: intF, tipTitle: yearT, refs: [{ x: 2008, dash: '5 4' }], aria: t.s6.card }),
      csv: () => C(d.home_type, ['year', 'total', 'falls', 'drowning', 'choking', 'fire', 'poisoning', 'other', 'source']),
      legend: () => legendFor(['drowning', 'choking', 'falls', 'fire', 'poisoning']),
    },
    7: {
      draw: (el) => lineChart(el, { rows: d.home_share,
        series: series(['drowning', 'fire', 'poisoning', 'choking', 'falls', 'overall'], { overall: { dash: '5 4', width: 1.5 } }),
        yFmt: (v) => v + '%', tipFmt: pctF, tipTitle: yearT, yMax: 100, refs: [{ x: 2008, dash: '5 4' }], aria: t.s7.card }),
      csv: () => C(d.home_share, ['year', 'overall', 'falls', 'drowning', 'choking', 'fire', 'poisoning']),
      legend: () => legendFor(['drowning', 'fire', 'poisoning', 'choking', 'falls', 'overall'], ['overall']),
    },
    8: {
      draw(el) {
        const share = state.fig8 === 'share';
        const rows = AGE_GROUPS_2025.map((a) => {
          const c = d.age_groups_2025.find((r) => String(r.age_group) === a);
          const m = d.age_mix.find((r) => String(r.age_group) === a);
          return { label: ageLabel(a, lang), total: c.total, counts: c, mix: m, values: share ? m : c };
        });
        const labels = Object.fromEntries(MIX_KEYS.map((k) => [k, label(k)]));
        stackedBars(el, { rows, keys: MIX_KEYS, share, labels, aria: t.s8.card,
          tipValue: (r, k) => `${intF(r.counts[k])} · ${pctF(r.mix[k])}` });
      },
      csv: () => C(d.age_groups_2025, ['age_group', 'total', 'traffic', 'falls', 'drowning', 'choking', 'fire', 'poisoning', 'other']),
      legend: () => legendFor(MIX_KEYS),
    },
    9: {
      draw(el) {
        const rows = FIG9.map((code) => {
          const a = d.detail_causes.find((r) => r.code === code && r.year === 1995).deaths;
          const b = d.detail_causes.find((r) => r.code === code && r.year === 2025).deaths;
          return { label: `${t.s9.causes[code]} (${code.replace('-', '–')})`, a, b };
        });
        dumbbell(el, { rows, yearA: '1995', yearB: '2025', aria: t.s9.card });
      },
      csv: () => C(d.detail_causes.filter((r) => FIG9.includes(r.code)), ['code', 'cause_ja', 'year', 'deaths', 'rate']),
      legend: () => [],
    },
  };

  const drawFig = (n) => root.querySelectorAll(`[data-chart="${n}"]`).forEach((el) => figs[n].draw(el));
  Object.keys(figs).forEach((n) => { drawFig(n); draws.push(() => drawFig(n)); });

  root.querySelectorAll('.toggle[data-fig]').forEach((g) => g.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-mode]');
    if (!b) return;
    g.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    state[`fig${g.dataset.fig}`] = b.dataset.mode;
    drawFig(g.dataset.fig);
  }));

  root.querySelectorAll('.act').forEach((b) => b.addEventListener('click', async () => {
    const n = b.dataset.fig;
    const sec = root.querySelector(`#fig-${n}`);
    const title = `${t.figure}${lang === 'ja' ? '' : ' '}${n}. ${sec.querySelector('.card-title').textContent}`;
    if (b.dataset.act === 'link') {
      const url = `${location.origin}${location.pathname}?lang=${lang}#fig-${n}`;
      copyLink(url, t.copied, t.copyFail);
    } else if (b.dataset.act === 'csv') {
      const { rows, columns } = figs[n].csv();
      downloadCSV(`japan-accidental-deaths-fig${n}.csv`, rows, columns);
    } else {
      b.disabled = true;
      try {
        await exportPNG({ area: sec.querySelector('.chart-area'), title, legend: figs[n].legend(),
          note: sec.querySelector('.note')?.textContent || '', source: t.source, filename: `japan-accidental-deaths-fig${n}-${lang}.png` });
      } finally { b.disabled = false; }
    }
  }));

  return { redraw: () => draws.forEach((f) => f()) };
}
