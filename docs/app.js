/* Accidental deaths in Japan — drawings and calculations.
   Every number on the page comes from a dataset (data/*.csv) or one of the calcs below. */
(function () {
  'use strict';

  // ───────────────────────────── calculations (shown to readers in Sources)
  dash.calc('changes', {
    inputs: ['by_type'],
    title: 'Change by type of accident',
    description: 'Deaths in 2025 against 1995 and against 2008, the last year in the 2009 report.',
    fn: (byType) => {
      const at = (y) => byType.find((r) => +r.year === y);
      const a = at(1995), b = at(2008), c = at(2025);
      if (!a || !b || !c) return [];
      const pct = (now, then) => Math.round((1000 * (now - then)) / then) / 10;
      return ['total', 'traffic', 'falls', 'drowning', 'choking', 'fire', 'poisoning'].map((metric) => ({
        metric,
        deaths_1995: +a[metric],
        deaths_2008: +b[metric],
        deaths_2025: +c[metric],
        vs1995_pct: pct(+c[metric], +a[metric]),
        vs2008_pct: pct(+c[metric], +b[metric]),
        pct_of_1995: Math.round((1000 * +c[metric]) / +a[metric]) / 10,
      }));
    },
  });

  dash.calc('falls_traffic_ratio', {
    inputs: ['by_type'],
    title: 'Falls per traffic death, 2025',
    description: 'Deaths from falls in 2025 divided by deaths from traffic accidents in 2025.',
    fn: (byType) => {
      const r = byType.find((x) => +x.year === 2025);
      return r ? Math.round((10 * +r.falls) / +r.traffic) / 10 : null;
    },
  });

  dash.calc('age_share', {
    inputs: ['age_groups_2025'],
    title: 'Share of 2025 accidental deaths by age',
    description: 'Deaths aged 65 or over, and 80 or over, as a percentage of all accidental deaths in 2025 (unknown ages included in the total).',
    fn: (ageGroups) => {
      const total = ageGroups.reduce((s, r) => s + +r.total, 0);
      const sum = (groups) => ageGroups.filter((r) => groups.includes(r.age_group)).reduce((s, r) => s + +r.total, 0);
      const row = (group, deaths) => ({ group, deaths, total, share_pct: Math.round((1000 * deaths) / total) / 10 });
      return [row('65plus', sum(['65–79', '80 and over'])), row('80plus', sum(['80 and over']))];
    },
  });

  dash.calc('age_mix', {
    inputs: ['age_groups_2025'],
    title: 'Mix of accident types within each age group, 2025',
    description: 'Deaths of each type as a percentage of all accidental deaths in that age group.',
    fn: (ageGroups) =>
      ageGroups
        .filter((r) => r.age_group !== 'unknown')
        .map((r) => {
          const out = { age_group: r.age_group };
          ['traffic', 'falls', 'drowning', 'choking', 'fire', 'poisoning', 'other'].forEach((k) => {
            out[k] = +r.total ? Math.round((1000 * +r[k]) / +r.total) / 10 : 0;
          });
          return out;
        }),
  });

  dash.calc('home_share', {
    inputs: ['home_type', 'by_type', 'place'],
    title: 'Share of deaths that happened at home',
    description: 'Deaths at home divided by all deaths of the same type that year; "overall" divides all home deaths by all accidental deaths other than traffic.',
    fn: (homeType, byType, place) =>
      homeType.map((h) => {
        const t = byType.find((r) => r.year === h.year);
        const p = place.find((r) => r.year === h.year);
        const share = (a, b) => (b ? Math.round((1000 * +a) / +b) / 10 : null);
        return {
          year: +h.year,
          overall: share(h.total, p && p.total),
          falls: share(h.falls, t && t.falls),
          drowning: share(h.drowning, t && t.drowning),
          choking: share(h.choking, t && t.choking),
          fire: share(h.fire, t && t.fire),
          poisoning: share(h.poisoning, t && t.poisoning),
        };
      }),
  });

  dash.calc('traffic_index', {
    inputs: ['traffic_mode'],
    title: 'Traffic deaths by road user, 1995 = 100',
    description: 'Each year as a percentage of 1995 for each road user, plus pedestrians as a share of all traffic deaths.',
    fn: (trafficMode) => {
      const base = trafficMode.find((r) => +r.year === 1995);
      if (!base) return [];
      const idx = (r, k) => Math.round((1000 * +r[k]) / +base[k]) / 10;
      return trafficMode.map((r) => ({
        year: +r.year,
        pedestrian: idx(r, 'pedestrian'),
        car: idx(r, 'car'),
        motorcycle: idx(r, 'motorcycle'),
        cyclist: idx(r, 'cyclist'),
        pedestrian_share_pct: Math.round((1000 * +r.pedestrian) / +r.total) / 10,
      }));
    },
  });

  // ───────────────────────────── helpers
  const mode = { fig1: 'deaths', fig4: 'count', fig8: 'count' };
  const FIXED = {
    unknown_place: 'var(--cds-chart-muted)',
    other: 'var(--cds-chart-muted)',
    overall: 'var(--color-fg-muted)',
    total: 'var(--color-fg)',
  };
  const INDEX = {
    traffic: 0, falls: 1, drowning: 2, choking: 3, fire: 4, poisoning: 5,
    pedestrian: 0, car: 1, motorcycle: 2, cyclist: 3,
    home: 0, residential_institution: 1, other_place: 2, public_area: 3, industrial: 4,
  };
  const colorOf = (k) => {
    if (FIXED[k]) return FIXED[k];
    const c = dash.colors || [];
    return c.length ? c[(INDEX[k] || 0) % c.length] : 'currentColor';
  };

  const n0 = d3.format(',');
  const fmt = {
    int: (v) => (v == null ? '—' : n0(Math.round(v))),
    rate: (v) => (v == null ? '—' : (+v).toFixed(1)),
    pct1: (v) => (v == null ? '—' : (+v).toFixed(1) + '%'),
    x1: (v) => (v == null ? '—' : (+v).toFixed(1) + '×'),
    signed: (v) => (v == null ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(1) + '%'),
  };
  const toNum = (v) => (v === '' || v == null ? null : +v);
  const isNum = (v) => typeof v === 'number' || (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v));
  const typed = (rows) =>
    rows.map((r) => {
      const o = {};
      for (const k of Object.keys(r)) o[k] = r[k] === '' || r[k] == null ? null : isNum(r[k]) ? +r[k] : r[k];
      return o;
    });

  function findRow(rows, where) {
    const pairs = where.split('&').map((p) => p.split('=').map(decodeURIComponent));
    return rows.find((r) => pairs.every(([k, v]) => String(r[k]) === v));
  }

  function message(el, text) {
    const p = document.createElement('p');
    p.className = 'jk-msg';
    p.textContent = text;
    el.replaceChildren(p);
  }

  // Waits for every source; returns their rows, or null after drawing a message.
  function need(el, ids, what) {
    const all = ids.map((id) => dash.data(id));
    if (all.some((s) => s.status === 'loading')) return null;
    const bad = all.find((s) => s.status !== 'ok');
    if (bad) {
      if (bad.status === 'error' || bad.status === 'missing') message(el, `The ${what} could not be loaded.`);
      return null;
    }
    return all.map((s) => (Array.isArray(s.data) ? typed(s.data) : s.data));
  }

  function labelFor(el, key) {
    const scope = el.closest('.jk-sec') || document;
    const n = scope.querySelector(`[data-key="${key}"] [data-label]`);
    return n ? n.textContent.trim() : key;
  }

  function measure(el, texts, cls) {
    const svg = d3.select(el).append('svg').attr('width', 10).attr('height', 10)
      .style('position', 'absolute').style('visibility', 'hidden');
    let w = 0;
    texts.forEach((t) => {
      const node = svg.append('text').attr('class', cls || 'jk-tick').text(t).node();
      w = Math.max(w, node.getComputedTextLength() || String(t).length * 7);
    });
    svg.remove();
    return Math.ceil(w);
  }

  function tooltip(el) {
    const tip = document.createElement('div');
    tip.className = 'jk-tip';
    tip.hidden = true;
    el.appendChild(tip);
    return {
      show(x, y, title, items) {
        tip.replaceChildren();
        const b = document.createElement('b');
        b.textContent = title;
        tip.appendChild(b);
        items.forEach((it) => {
          const row = document.createElement('div');
          row.className = 'jk-tip-row';
          const i = document.createElement('i');
          i.style.background = it.color || 'transparent';
          const l = document.createElement('span');
          l.textContent = it.label;
          const v = document.createElement('span');
          v.textContent = it.value;
          row.append(i, l, v);
          tip.appendChild(row);
        });
        tip.hidden = false;
        const W = el.clientWidth;
        const tw = tip.offsetWidth;
        const th = tip.offsetHeight;
        let left = x + 14;
        if (left + tw > W) left = Math.max(0, x - tw - 14);
        const top = Math.max(-th / 2, y - th / 2);
        tip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
      },
      hide() {
        tip.hidden = true;
      },
    };
  }

  function yearTicks(x, width) {
    const [a, b] = x.domain();
    const span = b - a;
    const step = [5, 10, 20, 25, 50].find((s) => span / s <= Math.max(2, width / 80)) || 50;
    const out = [];
    for (let t = Math.ceil(a / step) * step; t <= b; t += step) out.push(t);
    return out;
  }

  function dodge(items, gap, min, max) {
    items.sort((p, q) => p.y - q.y);
    items.forEach((it, i) => { it.ly = i ? Math.max(it.y, items[i - 1].ly + gap) : it.y; });
    const over = items.length ? items[items.length - 1].ly - max : 0;
    if (over > 0) items.forEach((it) => { it.ly -= over; });
    items.forEach((it, i) => { it.ly = Math.max(it.ly, min + i * gap); });
  }

  function chartSize(el, ratio, lo, hi) {
    const W = Math.max(260, el.clientWidth || 600);
    return [W, Math.round(Math.min(hi, Math.max(lo, W * ratio)))];
  }

  // Line chart over years with end labels, a hover rule and a tooltip.
  function lineChart(el, o) {
    el.replaceChildren();
    const [W, H] = chartSize(el, 0.46, 250, 400);
    const vals = o.rows.flatMap((r) => o.series.map((s) => r[s.key])).filter((v) => v != null);
    const y = d3.scaleLinear().domain([0, o.yMax != null ? o.yMax : d3.max(vals)]).nice();
    const ticks = y.ticks(Math.max(3, Math.min(6, Math.round(H / 70))));
    const tickW = measure(el, ticks.map(o.yFmt));
    const last = o.series.map((s) => {
      for (let i = o.rows.length - 1; i >= 0; i--) if (o.rows[i][s.key] != null) return o.rows[i];
      return null;
    });
    const endTexts = o.series.map((s, i) => (last[i] ? o.tipFmt(last[i][s.key]) : ''));
    const endW = measure(el, endTexts, 'jk-endlabel');
    const m = { t: 14, r: endW + 18, b: 26, l: tickW + 12 };
    const xs = o.rows.map((r) => r.year);
    const x = d3.scaleLinear().domain(d3.extent(xs)).range([m.l, W - m.r]);
    y.range([H - m.b, m.t]);

    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('height', H)
      .attr('role', 'img').attr('aria-label', o.aria);
    svg.append('g').attr('class', 'jk-grid').selectAll('line').data(ticks).join('line')
      .attr('x1', m.l).attr('x2', W - m.r).attr('y1', (d) => y(d)).attr('y2', (d) => y(d));
    svg.append('g').attr('class', 'jk-axis').selectAll('text').data(ticks).join('text')
      .attr('x', m.l - 8).attr('y', (d) => y(d)).attr('dy', '0.32em').attr('text-anchor', 'end').text(o.yFmt);
    const gx = svg.append('g').attr('class', 'jk-axis').attr('transform', `translate(0,${H - m.b})`);
    gx.append('line').attr('x1', m.l).attr('x2', W - m.r);
    gx.selectAll('text').data(yearTicks(x, W - m.l - m.r)).join('text')
      .attr('x', (d) => x(d)).attr('y', 18).attr('text-anchor', 'middle').text((d) => d);
    (o.refs || []).forEach((rf) => {
      svg.append('line').attr('class', 'jk-ref').attr('x1', x(rf.x)).attr('x2', x(rf.x))
        .attr('y1', m.t).attr('y2', H - m.b).attr('stroke-dasharray', rf.dash);
    });
    (o.hrefs || []).forEach((v) => {
      svg.append('line').attr('class', 'jk-ref').attr('x1', m.l).attr('x2', W - m.r)
        .attr('y1', y(v)).attr('y2', y(v)).attr('stroke-dasharray', '4 3');
    });
    o.series.forEach((s) => {
      const line = d3.line().defined((d) => d[s.key] != null).x((d) => x(d.year)).y((d) => y(d[s.key]));
      svg.append('path').attr('fill', 'none').style('stroke', s.color).attr('stroke-width', s.width || 2)
        .attr('stroke-dasharray', s.dash || null).attr('stroke-linejoin', 'round').attr('d', line(o.rows));
    });
    const ends = o.series.map((s, i) => (last[i] ? { s, x: x(last[i].year), y: y(last[i][s.key]), text: endTexts[i] } : null)).filter(Boolean);
    ends.forEach((e) => svg.append('circle').attr('cx', e.x).attr('cy', e.y).attr('r', 3).style('fill', e.s.color));
    dodge(ends, 14, m.t, H - m.b);
    ends.forEach((e) => {
      svg.append('text').attr('class', 'jk-endlabel').attr('x', W - m.r + 8).attr('y', e.ly).attr('dy', '0.32em')
        .style('fill', e.s.color === 'var(--cds-chart-muted)' ? 'var(--color-fg-muted)' : e.s.color).text(e.text);
    });

    const tip = tooltip(el);
    const rule = svg.append('line').attr('class', 'jk-ref').attr('y1', m.t).attr('y2', H - m.b).style('opacity', 0);
    const dots = svg.append('g');
    const move = (ev) => {
      const [px] = d3.pointer(ev);
      const r = o.rows[d3.bisectCenter(xs, x.invert(px))];
      if (!r) return;
      const cx = x(r.year);
      rule.attr('x1', cx).attr('x2', cx).style('opacity', 1);
      const live = o.series.filter((s) => r[s.key] != null);
      dots.selectAll('circle').data(live).join('circle').attr('cx', cx).attr('cy', (s) => y(r[s.key])).attr('r', 4)
        .style('fill', (s) => s.color).style('stroke', 'var(--color-panel)').attr('stroke-width', 1.5);
      const items = live.map((s) => ({ color: s.color, label: s.label, value: o.tipFmt(r[s.key]), v: r[s.key] }))
        .sort((p, q) => q.v - p.v);
      tip.show(cx, m.t + 60, String(r.year), items);
    };
    svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', Math.max(0, W - m.l - m.r)).attr('height', H - m.t - m.b)
      .attr('fill', 'transparent').style('cursor', 'crosshair')
      .on('pointermove', move).on('pointerdown', move)
      .on('pointerleave', () => { rule.style('opacity', 0); dots.selectAll('*').remove(); tip.hide(); });
  }

  const seriesFor = (el, keys, extra) =>
    keys.map((k) => Object.assign({ key: k, color: colorOf(k), label: labelFor(el, k) }, (extra && extra[k]) || {}));

  // ───────────────────────────── legend swatches and toggles
  document.querySelectorAll('[data-swatch]').forEach((i) => { i.style.background = colorOf(i.dataset.swatch); });
  document.querySelectorAll('[data-swatch="overall"]').forEach((i) => {
    i.style.background = 'transparent';
    i.style.borderTop = '2px dashed var(--color-fg-muted)';
  });

  document.querySelectorAll('.jk-toggle[data-fig]').forEach((group) => {
    group.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-mode]');
      if (!b) return;
      group.querySelectorAll('button[data-mode]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      mode[group.dataset.fig] = b.dataset.mode;
      if (group.dataset.fig === 'fig8') {
        dash.draw('fig8row');
        dash.draw('fig8axis');
      } else {
        dash.draw(group.dataset.fig);
      }
    });
  });

  // ───────────────────────────── numbers in sentences and cards
  function valueOf(el) {
    const s = dash.data(el.dataset.source);
    if (s.status !== 'ok') return { status: s.status };
    const field = el.dataset.field;
    if (!field) return { status: 'ok', value: toNum(s.data) };
    const row = el.dataset.where ? findRow(s.data, el.dataset.where) : s.data[+el.dataset.row || 0];
    return { status: 'ok', value: row ? toNum(row[field]) : null };
  }

  dash.draw('v', (el) => {
    const r = valueOf(el);
    if (r.status === 'loading') return;
    el.classList.remove('dash-skeleton');
    el.textContent = r.status === 'ok' ? (fmt[el.dataset.fmt] || fmt.int)(r.value) : '—';
  });

  dash.draw('delta', (el) => {
    const r = valueOf(el);
    if (r.status === 'loading') return;
    el.classList.remove('dash-skeleton');
    if (r.status !== 'ok' || r.value == null) {
      el.textContent = '—';
      el.style.color = '';
      return;
    }
    el.textContent = fmt.signed(r.value);
    const good = el.dataset.good === 'down' ? r.value < 0 : r.value > 0;
    el.style.color = good ? 'var(--color-ok)' : 'var(--color-bad)';
  });

  // ───────────────────────────── figure 1: long-run bars
  const DISASTERS = [1923, 1995, 2011];
  dash.draw('fig1', (el) => {
    const got = need(el, ['long_run'], 'long-run table');
    if (!got) return;
    const rows = got[0];
    const rate = mode.fig1 === 'rate';
    const key = rate ? 'accidental_rate' : 'accidental_deaths';
    const vf = rate ? fmt.rate : fmt.int;
    el.replaceChildren();
    const [W, H] = chartSize(el, 0.42, 260, 380);
    const first = d3.min(rows, (r) => r.year), lastYear = d3.max(rows, (r) => r.year);
    const years = d3.range(first, lastYear + 1);
    const byYear = new Map(rows.map((r) => [r.year, r]));
    const y = d3.scaleLinear().domain([0, d3.max(rows, (r) => r[key])]).nice();
    const ticks = y.ticks(Math.max(3, Math.round(H / 75)));
    const tickW = measure(el, ticks.map((t) => n0(t)));
    const m = { t: 22, r: 8, b: 26, l: tickW + 12 };
    const x = d3.scaleBand().domain(years).range([m.l, W - m.r]).paddingInner(0.2);
    y.range([H - m.b, m.t]);

    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('height', H).attr('role', 'img')
      .attr('aria-label', rate
        ? 'Bar chart of the accidental death rate per 100,000 people in Japan for each year from 1899 to 2024.'
        : 'Bar chart of accidental deaths in Japan for each year from 1899 to 2025, with spikes in 1923, 1995 and 2011.');
    svg.append('g').attr('class', 'jk-grid').selectAll('line').data(ticks).join('line')
      .attr('x1', m.l).attr('x2', W - m.r).attr('y1', (d) => y(d)).attr('y2', (d) => y(d));
    svg.append('g').attr('class', 'jk-axis').selectAll('text').data(ticks).join('text')
      .attr('x', m.l - 8).attr('y', (d) => y(d)).attr('dy', '0.32em').attr('text-anchor', 'end').text((d) => n0(d));
    // years with no record
    const gaps = years.filter((yr) => !byYear.has(yr));
    svg.append('g').selectAll('rect').data(gaps).join('rect')
      .attr('x', (d) => x(d)).attr('width', x.step()).attr('y', m.t).attr('height', H - m.b - m.t)
      .style('fill', 'var(--cds-chart-grid)').style('opacity', 0.6);
    const bars = rows.filter((r) => r[key] != null);
    svg.append('g').selectAll('rect').data(bars).join('rect')
      .attr('x', (d) => x(d.year)).attr('width', x.bandwidth()).attr('y', (d) => y(d[key]))
      .attr('height', (d) => y(0) - y(d[key]))
      .style('fill', (d) => (DISASTERS.includes(d.year) ? 'var(--cds-chart-status-critical)' : colorOf('traffic')));
    // labels: the earthquake spikes and the latest bar
    const latest = bars[bars.length - 1];
    const labelled = bars.filter((d) => DISASTERS.includes(d.year) && d.year !== 1995).concat([latest]);
    svg.append('g').selectAll('text').data(labelled).join('text').attr('class', 'jk-barlabel')
      .attr('x', (d) => x(d.year) + x.bandwidth() / 2).attr('y', (d) => y(d[key]) - 6)
      .attr('text-anchor', (d) => (d === latest ? 'end' : 'middle'))
      .text((d) => `${d.year}: ${vf(d[key])}`);
    const gx = svg.append('g').attr('class', 'jk-axis').attr('transform', `translate(0,${H - m.b})`);
    gx.append('line').attr('x1', m.l).attr('x2', W - m.r);
    const step = W < 520 ? 20 : 10;
    gx.selectAll('text').data(years.filter((yr) => yr % step === 0)).join('text')
      .attr('x', (d) => x(d) + x.bandwidth() / 2).attr('y', 18).attr('text-anchor', 'middle').text((d) => d);

    const tip = tooltip(el);
    const hi = svg.append('rect').style('fill', 'var(--color-fg)').style('opacity', 0).attr('pointer-events', 'none');
    const move = (ev) => {
      const [px] = d3.pointer(ev);
      const i = Math.max(0, Math.min(years.length - 1, Math.floor((px - m.l) / x.step())));
      const yr = years[i];
      const r = byYear.get(yr);
      const cx = x(yr) + x.bandwidth() / 2;
      hi.attr('x', x(yr) - 1).attr('width', x.bandwidth() + 2).attr('y', m.t).attr('height', H - m.b - m.t).style('opacity', 0.08);
      const btn = (md) => (el.closest('.jk-card').querySelector(`button[data-mode="${md}"]`) || {}).textContent || md;
      const items = r
        ? [
            { color: colorOf('traffic'), label: btn('deaths'), value: fmt.int(r.accidental_deaths) },
            { color: 'transparent', label: btn('rate'), value: r.accidental_rate == null ? 'not yet published' : fmt.rate(r.accidental_rate) },
          ]
        : [{ color: 'transparent', label: 'No record', value: '' }];
      tip.show(cx, m.t + 50, String(yr), items);
    };
    svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', W - m.l - m.r).attr('height', H - m.t - m.b)
      .attr('fill', 'transparent').on('pointermove', move).on('pointerdown', move)
      .on('pointerleave', () => { hi.style('opacity', 0); tip.hide(); });
  });

  // ───────────────────────────── figure 2: main types
  dash.draw('fig2', (el) => {
    const got = need(el, ['by_type'], 'deaths-by-type table');
    if (!got) return;
    lineChart(el, {
      rows: got[0],
      series: seriesFor(el, ['falls', 'drowning', 'choking', 'traffic', 'fire', 'poisoning']),
      yFmt: (v) => n0(v),
      tipFmt: fmt.int,
      refs: [{ x: 2008, dash: '5 4' }, { x: 2017, dash: '1 3' }],
      aria: 'Line chart of accidental deaths by type from 1995 to 2025. Traffic falls steadily; falls and drowning rise; choking peaks in 2012.',
    });
  });

  // ───────────────────────────── figure 3: age-specific rates
  const RATE_YEARS = [1995, 2008, 2024];
  dash.draw('fig3', (el) => {
    const got = need(el, ['age_rates'], 'age-specific rate table');
    if (!got) return;
    const rows = got[0];
    const type = el.dataset.type;
    const ages = [...new Set(rows.map((r) => r.age))];
    const wide = !!el.closest('.jk-panel--wide');
    el.replaceChildren();
    const W = Math.max(220, el.clientWidth || 300);
    const H = wide ? Math.round(Math.min(280, Math.max(210, W * 0.28))) : 180;
    const series = RATE_YEARS.map((yr) => ({
      year: yr,
      label: labelFor(el, String(yr)),
      color: yr === 2024 ? colorOf(type) : yr === 2008 ? 'var(--color-fg-muted)' : 'var(--cds-chart-muted)',
      dash: yr === 1995 ? '2 3' : yr === 2008 ? '5 3' : null,
      width: yr === 2024 ? 2.5 : 1.5,
      values: ages.map((a) => {
        const r = rows.find((q) => q.year === yr && q.age === a);
        return r ? r[type] : null;
      }),
    }));
    const max = d3.max(series, (s) => d3.max(s.values));
    const y = d3.scaleLinear().domain([0, max || 1]).nice();
    const ticks = y.ticks(wide ? 5 : 4);
    const yf = (v) => (max < 5 ? d3.format('.1f')(v) : n0(v));
    const tickW = measure(el, ticks.map(yf));
    const m = { t: 10, r: 10, b: 24, l: tickW + 10 };
    const x = d3.scalePoint().domain(ages).range([m.l, W - m.r]);
    y.range([H - m.b, m.t]);
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('height', H).attr('role', 'img')
      .attr('aria-label', `Death rate per 100,000 by five-year age group, ${((el.closest('.jk-panel') || el).querySelector('.jk-panel-title') || {}).textContent || type}, comparing 1995, 2008 and 2024.`);
    svg.append('g').attr('class', 'jk-grid').selectAll('line').data(ticks).join('line')
      .attr('x1', m.l).attr('x2', W - m.r).attr('y1', (d) => y(d)).attr('y2', (d) => y(d));
    svg.append('g').attr('class', 'jk-axis').selectAll('text').data(ticks).join('text')
      .attr('x', m.l - 6).attr('y', (d) => y(d)).attr('dy', '0.32em').attr('text-anchor', 'end').text(yf);
    const every = Math.ceil(ages.length / Math.max(3, Math.floor((W - m.l - m.r) / 46)));
    const gx = svg.append('g').attr('class', 'jk-axis').attr('transform', `translate(0,${H - m.b})`);
    gx.append('line').attr('x1', m.l).attr('x2', W - m.r);
    gx.selectAll('text').data(ages.filter((a, i) => i % every === 0)).join('text')
      .attr('x', (d) => x(d)).attr('y', 17).attr('text-anchor', 'middle').text((d) => d);
    series.forEach((s) => {
      const line = d3.line().defined((d) => d != null).x((d, i) => x(ages[i])).y((d) => y(d));
      svg.append('path').attr('fill', 'none').style('stroke', s.color).attr('stroke-width', s.width)
        .attr('stroke-dasharray', s.dash).attr('stroke-linejoin', 'round').attr('d', line(s.values));
    });
    const tip = tooltip(el);
    const rule = svg.append('line').attr('class', 'jk-ref').attr('y1', m.t).attr('y2', H - m.b).style('opacity', 0);
    const move = (ev) => {
      const [px] = d3.pointer(ev);
      const i = Math.max(0, Math.min(ages.length - 1, Math.round((px - m.l) / x.step())));
      const cx = x(ages[i]);
      rule.attr('x1', cx).attr('x2', cx).style('opacity', 1);
      tip.show(cx, H / 2, `Ages ${ages[i]}`, series.slice().reverse().map((s) => ({ color: s.color, label: s.label, value: fmt.rate(s.values[i]) })));
    };
    svg.append('rect').attr('x', m.l - 4).attr('y', m.t).attr('width', W - m.l - m.r + 8).attr('height', H - m.t - m.b)
      .attr('fill', 'transparent').on('pointermove', move).on('pointerdown', move)
      .on('pointerleave', () => { rule.style('opacity', 0); tip.hide(); });
  });

  // ───────────────────────────── figure 4: road users
  dash.draw('fig4', (el) => {
    const index = mode.fig4 === 'index';
    const got = need(el, [index ? 'traffic_index' : 'traffic_mode'], 'road-user table');
    if (!got) return;
    lineChart(el, {
      rows: got[0],
      series: seriesFor(el, ['pedestrian', 'car', 'motorcycle', 'cyclist']),
      yFmt: index ? (v) => String(v) : (v) => n0(v),
      tipFmt: index ? (v) => (v == null ? '—' : (+v).toFixed(1)) : fmt.int,
      yMax: index ? 100 : null,
      hrefs: index ? [100] : [],
      refs: [{ x: 2008, dash: '5 4' }],
      aria: 'Line chart of traffic deaths from 1995 to 2025 for pedestrians, car occupants, motorcyclists and cyclists, all falling.',
    });
  });

  // ───────────────────────────── figure 5: place
  dash.draw('fig5', (el) => {
    const got = need(el, ['place'], 'place-of-injury table');
    if (!got) return;
    lineChart(el, {
      rows: got[0],
      series: seriesFor(el, ['unknown_place', 'home', 'other_place', 'residential_institution', 'public_area', 'industrial'],
        { unknown_place: { dash: '3 3' } }),
      yFmt: (v) => n0(v),
      tipFmt: fmt.int,
      refs: [{ x: 2008, dash: '5 4' }],
      aria: 'Line chart of non-traffic accidental deaths by place from 1995 to 2025. Home and place not recorded are the largest and both rise.',
    });
  });

  // ───────────────────────────── figure 6: at home by type
  dash.draw('fig6', (el) => {
    const got = need(el, ['home_type'], 'home-accident table');
    if (!got) return;
    lineChart(el, {
      rows: got[0],
      series: seriesFor(el, ['drowning', 'choking', 'falls', 'fire', 'poisoning']),
      yFmt: (v) => n0(v),
      tipFmt: fmt.int,
      refs: [{ x: 2008, dash: '5 4' }],
      aria: 'Line chart of accidental deaths at home by type from 1995 to 2025. Drowning nearly doubles after 2008.',
    });
  });

  // ───────────────────────────── figure 7: share at home
  dash.draw('fig7', (el) => {
    const got = need(el, ['home_share'], 'home-share calculation');
    if (!got) return;
    lineChart(el, {
      rows: got[0],
      series: seriesFor(el, ['drowning', 'fire', 'poisoning', 'choking', 'falls', 'overall'], { overall: { dash: '5 4', width: 1.5 } }),
      yFmt: (v) => v + '%',
      tipFmt: fmt.pct1,
      yMax: 100,
      refs: [{ x: 2008, dash: '5 4' }],
      aria: 'Line chart of the percentage of deaths of each type that happened at home, 1995 to 2025. Drowning rises to about 79 percent.',
    });
  });

  // ───────────────────────────── figure 8: 2025 by age group
  const MIX_KEYS = ['falls', 'drowning', 'choking', 'traffic', 'fire', 'poisoning', 'other'];
  const fig8Scale = (W, base) => {
    const share = mode.fig8 === 'share';
    const max = share ? 100 : d3.max(base.filter((r) => r.age_group !== 'unknown'), (r) => r.total);
    return d3.scaleLinear().domain([0, max]).range([0, Math.max(40, W - (share ? 4 : 60))]);
  };
  dash.draw('fig8row', (el) => {
    const share = mode.fig8 === 'share';
    const got = need(el, share ? ['age_groups_2025', 'age_mix'] : ['age_groups_2025'], 'age-group table');
    if (!got) return;
    const base = got[0];
    const counts = base.find((r) => String(r.age_group) === el.dataset.age);
    const mix = share ? got[1].find((r) => String(r.age_group) === el.dataset.age) : null;
    if (!counts) return message(el, '—');
    el.replaceChildren();
    const W = Math.max(120, el.clientWidth || 300);
    const H = 22;
    const x = fig8Scale(W, base);
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('height', H).attr('role', 'img')
      .attr('aria-label', `Accidental deaths in 2025 at ages ${el.dataset.age}, split by type.`);
    let acc = 0;
    const segs = MIX_KEYS.map((k) => {
      const v = share ? mix[k] : counts[k];
      const seg = { k, v, x0: acc };
      acc += v || 0;
      return seg;
    });
    const tip = tooltip(el);
    const ageLabel = (el.closest('.jk-row').querySelector('.jk-row-label') || {}).textContent || el.dataset.age;
    svg.append('g').selectAll('rect').data(segs.filter((s) => s.v > 0)).join('rect')
      .attr('x', (s) => x(s.x0)).attr('width', (s) => Math.max(0.5, x(s.x0 + s.v) - x(s.x0))).attr('y', 2).attr('height', H - 4)
      .style('fill', (s) => colorOf(s.k)).style('stroke', 'var(--color-panel)').attr('stroke-width', 0.5)
      .on('pointermove pointerdown', (ev, s) => {
        const [px] = d3.pointer(ev, el);
        tip.show(px, H / 2, ageLabel, [{ color: colorOf(s.k), label: labelFor(el, s.k), value: `${fmt.int(counts[s.k])}${mix ? ' · ' + fmt.pct1(mix[s.k]) : ''}` }]);
      })
      .on('pointerleave', () => tip.hide());
    if (!share) {
      svg.append('text').attr('class', 'jk-barlabel').attr('x', x(acc) + 6).attr('y', H / 2).attr('dy', '0.32em')
        .text(fmt.int(counts.total));
    } else {
      const top = segs.slice().sort((p, q) => q.v - p.v)[0];
      if (top && x(top.x0 + top.v) - x(top.x0) > 38) {
        svg.append('text').attr('class', 'jk-barlabel').attr('x', x(top.x0) + 5).attr('y', H / 2).attr('dy', '0.32em')
          .style('fill', 'var(--color-panel)').style('font-weight', 'var(--cds-font-weight-medium)').text(Math.round(top.v) + '%');
      }
    }
  });
  dash.draw('fig8axis', (el) => {
    const got = need(el, ['age_groups_2025'], 'age-group table');
    if (!got) return;
    el.replaceChildren();
    const W = Math.max(120, el.clientWidth || 300);
    const x = fig8Scale(W, got[0]);
    const share = mode.fig8 === 'share';
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} 20`).attr('height', 20).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('class', 'jk-axis');
    g.append('line').attr('x1', 0).attr('x2', x.range()[1]).attr('y1', 1).attr('y2', 1);
    g.selectAll('text').data(x.ticks(Math.max(2, Math.floor(W / 90)))).join('text')
      .attr('x', (d) => x(d)).attr('y', 15)
      .attr('text-anchor', (d, i, all) => (i === 0 ? 'start' : i === all.length - 1 && x(d) > W - 30 ? 'end' : 'middle'))
      .text((d) => (share ? d + '%' : n0(d)));
  });

  // ───────────────────────────── figure 9: detailed causes, 1995 against 2025
  const fig9Scale = (W, rows) => {
    const codes = [...document.querySelectorAll('[data-draw="fig9row"]')].map((n) => n.dataset.code);
    const max = d3.max(rows.filter((r) => codes.includes(r.code) && (r.year === 1995 || r.year === 2025)), (r) => r.deaths);
    return d3.scaleLinear().domain([0, max || 1]).nice().range([40, Math.max(80, W - 44)]);
  };
  dash.draw('fig9row', (el) => {
    const got = need(el, ['detail_causes'], 'detailed-cause table');
    if (!got) return;
    const rows = got[0];
    const a = rows.find((r) => r.code === el.dataset.code && r.year === 1995);
    const b = rows.find((r) => r.code === el.dataset.code && r.year === 2025);
    if (!a || !b) return message(el, '—');
    el.replaceChildren();
    const W = Math.max(160, el.clientWidth || 300);
    const H = 26;
    const x = fig9Scale(W, rows);
    const up = b.deaths >= a.deaths;
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('height', H).attr('role', 'img')
      .attr('aria-label', `${fmt.int(a.deaths)} deaths in 1995 and ${fmt.int(b.deaths)} in 2025.`);
    svg.append('line').attr('x1', x(a.deaths)).attr('x2', x(b.deaths)).attr('y1', H / 2).attr('y2', H / 2)
      .style('stroke', 'var(--cds-chart-muted)').attr('stroke-width', 2);
    svg.append('circle').attr('cx', x(a.deaths)).attr('cy', H / 2).attr('r', 5)
      .style('fill', 'var(--color-panel)').style('stroke', 'var(--cds-chart-muted)').attr('stroke-width', 2);
    svg.append('circle').attr('cx', x(b.deaths)).attr('cy', H / 2).attr('r', 5.5)
      .style('fill', up ? 'var(--color-bad)' : 'var(--color-ok)');
    const lab = (v, at, left, strong) => svg.append('text').attr('class', 'jk-barlabel')
      .attr('x', x(at) + (left ? -9 : 9)).attr('y', H / 2).attr('dy', '0.32em').attr('text-anchor', left ? 'end' : 'start')
      .style('fill', strong ? 'var(--color-fg)' : 'var(--color-fg-muted)').style('font-weight', strong ? 'var(--cds-font-weight-medium)' : null)
      .text(fmt.int(v));
    lab(a.deaths, a.deaths, up, false);
    lab(b.deaths, b.deaths, !up, true);
    const tip = tooltip(el);
    const name = (el.closest('.jk-row').querySelector('.jk-row-label') || {}).textContent || el.dataset.code;
    const legend = (k) => labelFor(el, k);
    svg.append('rect').attr('width', W).attr('height', H).attr('fill', 'transparent')
      .on('pointermove pointerdown', (ev) => {
        const [px] = d3.pointer(ev, el);
        tip.show(px, H / 2, name.trim(), [
          { color: 'var(--cds-chart-muted)', label: legend('1995'), value: fmt.int(a.deaths) },
          { color: up ? 'var(--color-bad)' : 'var(--color-ok)', label: '2025', value: fmt.int(b.deaths) },
        ]);
      })
      .on('pointerleave', () => tip.hide());
  });
  dash.draw('fig9axis', (el) => {
    const got = need(el, ['detail_causes'], 'detailed-cause table');
    if (!got) return;
    el.replaceChildren();
    const W = Math.max(160, el.clientWidth || 300);
    const x = fig9Scale(W, got[0]);
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} 20`).attr('height', 20).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('class', 'jk-axis');
    g.append('line').attr('x1', x.range()[0]).attr('x2', x.range()[1]).attr('y1', 1).attr('y2', 1);
    g.selectAll('text').data(x.ticks(Math.max(2, Math.floor(W / 90)))).join('text')
      .attr('x', (d) => x(d)).attr('y', 15)
      .attr('text-anchor', (d, i, all) => (i === all.length - 1 && x(d) > W - 30 ? 'end' : 'middle'))
      .text((d) => n0(d));
  });
})();
