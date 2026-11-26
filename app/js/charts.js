// SVG charts drawn with d3. Every chart sizes itself from its container and returns its <svg>.
/* global d3 */

export const color = (k) => `var(--k-${k})`;
const n0 = d3.format(',');

export function measure(el, texts, cls = 'tick') {
  const svg = d3.select(el).append('svg').attr('width', 10).attr('height', 10)
    .style('position', 'absolute').style('visibility', 'hidden');
  let w = 0;
  texts.forEach((t) => {
    const node = svg.append('text').attr('class', cls).text(t).node();
    w = Math.max(w, node.getComputedTextLength() || String(t).length * 7);
  });
  svg.remove();
  return Math.ceil(w);
}

export function tooltip(el) {
  const tip = document.createElement('div');
  tip.className = 'tip';
  tip.hidden = true;
  tip.setAttribute('role', 'status');
  el.appendChild(tip);
  return {
    show(x, y, title, items) {
      tip.replaceChildren();
      const b = document.createElement('b');
      b.textContent = title;
      tip.appendChild(b);
      items.forEach((it) => {
        const row = document.createElement('div');
        row.className = 'tip-row';
        const i = document.createElement('i');
        i.style.background = it.color || 'transparent';
        if (it.dash) { i.style.background = 'transparent'; i.style.borderTop = `2px dashed ${it.color}`; }
        const l = document.createElement('span');
        l.textContent = it.label;
        const v = document.createElement('span');
        v.textContent = it.value;
        row.append(i, l, v);
        tip.appendChild(row);
      });
      tip.hidden = false;
      const W = el.clientWidth, tw = tip.offsetWidth, th = tip.offsetHeight;
      let left = x + 14;
      if (left + tw > W) left = Math.max(0, x - tw - 14);
      tip.style.transform = `translate(${Math.round(left)}px, ${Math.round(Math.max(-th / 2, y - th / 2))}px)`;
    },
    hide() { tip.hidden = true; },
  };
}

function yearTicks(x, width) {
  const [a, b] = x.domain();
  const step = [1, 2, 5, 10, 20, 25, 50].find((s) => (b - a) / s <= Math.max(2, width / 80)) || 50;
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

function size(el, ratio, lo, hi) {
  const W = Math.max(260, el.clientWidth || 600);
  return [W, Math.round(Math.min(hi, Math.max(lo, W * ratio)))];
}

function frame(el, W, H, aria) {
  return d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H)
    .attr('role', 'img').attr('aria-label', aria).attr('class', 'chart-svg');
}

function gridY(svg, y, ticks, m, W, fmtY) {
  svg.append('g').attr('class', 'grid').selectAll('line').data(ticks).join('line')
    .attr('x1', m.l).attr('x2', W - m.r).attr('y1', (d) => y(d)).attr('y2', (d) => y(d));
  svg.append('g').attr('class', 'axis').selectAll('text').data(ticks).join('text')
    .attr('x', m.l - 8).attr('y', (d) => y(d)).attr('dy', '0.32em').attr('text-anchor', 'end').text(fmtY);
}

// ───────────────────────────── line chart over years
export function lineChart(el, o) {
  el.replaceChildren();
  const [W, H] = size(el, o.ratio || 0.46, o.minH || 250, o.maxH || 400);
  const vals = o.rows.flatMap((r) => o.series.map((s) => r[s.key])).filter((v) => v != null);
  const y = d3.scaleLinear().domain([0, o.yMax != null ? o.yMax : d3.max(vals) || 1]).nice();
  const ticks = y.ticks(Math.max(3, Math.min(6, Math.round(H / 70))));
  const tickW = measure(el, ticks.map(o.yFmt));
  const last = o.series.map((s) => {
    for (let i = o.rows.length - 1; i >= 0; i--) if (o.rows[i][s.key] != null) return o.rows[i];
    return null;
  });
  const endTexts = o.series.map((s, i) => (last[i] ? o.tipFmt(last[i][s.key]) : ''));
  const endW = o.series.length <= 8 ? measure(el, endTexts, 'endlabel') : 0;
  const m = { t: 14, r: endW + 18, b: 26, l: tickW + 12 };
  const xs = o.rows.map((r) => r.year);
  const x = d3.scaleLinear().domain(d3.extent(xs)).range([m.l, W - m.r]);
  if (xs.length === 1) x.domain([xs[0] - 1, xs[0] + 1]);
  y.range([H - m.b, m.t]);
  const svg = frame(el, W, H, o.aria);
  gridY(svg, y, ticks, m, W, o.yFmt);
  const gx = svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b})`);
  gx.append('line').attr('x1', m.l).attr('x2', W - m.r);
  gx.selectAll('text').data(yearTicks(x, W - m.l - m.r)).join('text')
    .attr('x', (d) => x(d)).attr('y', 18).attr('text-anchor', 'middle').text((d) => d);
  (o.refs || []).filter((rf) => rf.x >= x.domain()[0] && rf.x <= x.domain()[1]).forEach((rf) => {
    svg.append('line').attr('class', 'ref').attr('x1', x(rf.x)).attr('x2', x(rf.x)).attr('y1', m.t).attr('y2', H - m.b)
      .attr('stroke-dasharray', rf.dash);
  });
  (o.hrefs || []).forEach((v) => {
    svg.append('line').attr('class', 'ref').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(v)).attr('y2', y(v))
      .attr('stroke-dasharray', '4 3');
  });
  o.series.forEach((s) => {
    const line = d3.line().defined((d) => d[s.key] != null).x((d) => x(d.year)).y((d) => y(d[s.key]));
    svg.append('path').attr('fill', 'none').style('stroke', s.color).attr('stroke-width', s.width || 2)
      .style('stroke-opacity', s.opacity || null)
      .attr('stroke-dasharray', s.dash || null).attr('stroke-linejoin', 'round').attr('d', line(o.rows));
    if (xs.length === 1 && o.rows[0][s.key] != null) {
      svg.append('circle').attr('cx', x(xs[0])).attr('cy', y(o.rows[0][s.key])).attr('r', 4).style('fill', s.color);
    }
  });
  if (endW) {
    const ends = o.series.map((s, i) => (last[i] ? { s, x: x(last[i].year), y: y(last[i][s.key]), text: endTexts[i] } : null)).filter(Boolean);
    ends.forEach((e) => svg.append('circle').attr('cx', e.x).attr('cy', e.y).attr('r', 3).style('fill', e.s.color));
    dodge(ends, 14, m.t, H - m.b);
    ends.forEach((e) => svg.append('text').attr('class', 'endlabel').attr('x', W - m.r + 8).attr('y', e.ly)
      .attr('dy', '0.32em').style('fill', e.s.textColor || e.s.color).text(e.text));
  }
  const tip = tooltip(el);
  const rule = svg.append('line').attr('class', 'ref').attr('y1', m.t).attr('y2', H - m.b).style('opacity', 0);
  const dots = svg.append('g');
  const move = (ev) => {
    const [px] = d3.pointer(ev);
    const r = o.rows[d3.bisectCenter(xs, x.invert(px))];
    if (!r) return;
    const cx = x(r.year);
    rule.attr('x1', cx).attr('x2', cx).style('opacity', 1);
    const live = o.series.filter((s) => r[s.key] != null);
    dots.selectAll('circle').data(live).join('circle').attr('cx', cx).attr('cy', (s) => y(r[s.key])).attr('r', 4)
      .style('fill', (s) => s.color).style('stroke', 'var(--panel)').attr('stroke-width', 1.5);
    const items = live.map((s) => ({ color: s.color, dash: !!s.dash, label: s.label, value: o.tipFmt(r[s.key], r, s), v: r[s.key] }))
      .sort((p, q) => q.v - p.v);
    tip.show(cx, m.t + 60, o.tipTitle ? o.tipTitle(r.year) : String(r.year), items);
  };
  svg.append('rect').attr('class', 'hit').attr('x', m.l).attr('y', m.t).attr('width', Math.max(0, W - m.l - m.r))
    .attr('height', H - m.t - m.b).attr('fill', 'transparent')
    .on('pointermove', move).on('pointerdown', move)
    .on('pointerleave', () => { rule.style('opacity', 0); dots.selectAll('*').remove(); tip.hide(); });
  return svg.node();
}

// ───────────────────────────── yearly bars (figure 1)
export function yearBars(el, o) {
  el.replaceChildren();
  const [W, H] = size(el, 0.42, 260, 380);
  const rows = o.rows;
  const years = d3.range(d3.min(rows, (r) => r.year), d3.max(rows, (r) => r.year) + 1);
  const byYear = new Map(rows.map((r) => [r.year, r]));
  const y = d3.scaleLinear().domain([0, d3.max(rows, (r) => r[o.key])]).nice();
  const ticks = y.ticks(Math.max(3, Math.round(H / 75)));
  const m = { t: 22, r: 8, b: 26, l: measure(el, ticks.map((t) => n0(t))) + 12 };
  const x = d3.scaleBand().domain(years).range([m.l, W - m.r]).paddingInner(0.2);
  y.range([H - m.b, m.t]);
  const svg = frame(el, W, H, o.aria);
  gridY(svg, y, ticks, m, W, (d) => n0(d));
  svg.append('g').selectAll('rect').data(years.filter((yr) => !byYear.has(yr))).join('rect')
    .attr('x', (d) => x(d)).attr('width', x.step()).attr('y', m.t).attr('height', H - m.b - m.t).attr('class', 'gap');
  const bars = rows.filter((r) => r[o.key] != null);
  svg.append('g').selectAll('rect').data(bars).join('rect')
    .attr('x', (d) => x(d.year)).attr('width', x.bandwidth()).attr('y', (d) => y(d[o.key])).attr('height', (d) => y(0) - y(d[o.key]))
    .style('fill', (d) => (o.highlight.includes(d.year) ? 'var(--critical)' : 'var(--k-bars)'));
  const latest = bars[bars.length - 1];
  const labelled = bars.filter((d) => o.labelYears.includes(d.year)).concat([latest]);
  svg.append('g').selectAll('text').data(labelled).join('text').attr('class', 'barlabel')
    .attr('x', (d) => x(d.year) + x.bandwidth() / 2).attr('y', (d) => y(d[o.key]) - 6)
    .attr('text-anchor', (d) => (d === latest ? 'end' : 'middle')).text((d) => `${d.year}: ${o.fmt(d[o.key])}`);
  const gx = svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b})`);
  gx.append('line').attr('x1', m.l).attr('x2', W - m.r);
  const step = W < 520 ? 20 : 10;
  gx.selectAll('text').data(years.filter((yr) => yr % step === 0)).join('text')
    .attr('x', (d) => x(d) + x.bandwidth() / 2).attr('y', 18).attr('text-anchor', 'middle').text((d) => d);
  const tip = tooltip(el);
  const hi = svg.append('rect').attr('class', 'hover-band').style('opacity', 0).attr('pointer-events', 'none');
  const move = (ev) => {
    const [px] = d3.pointer(ev);
    const yr = years[Math.max(0, Math.min(years.length - 1, Math.floor((px - m.l) / x.step())))];
    hi.attr('x', x(yr) - 1).attr('width', x.bandwidth() + 2).attr('y', m.t).attr('height', H - m.b - m.t).style('opacity', 1);
    tip.show(x(yr) + x.bandwidth() / 2, m.t + 50, o.tipTitle(yr), o.tipItems(byYear.get(yr)));
  };
  svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', W - m.l - m.r).attr('height', H - m.t - m.b)
    .attr('fill', 'transparent').on('pointermove', move).on('pointerdown', move)
    .on('pointerleave', () => { hi.style('opacity', 0); tip.hide(); });
  return svg.node();
}

// ───────────────────────────── lines across age groups (figure 3, explorer "by age")
export function ageLines(el, o) {
  el.replaceChildren();
  const W = Math.max(220, el.clientWidth || 300);
  const H = o.height || Math.round(Math.min(380, Math.max(220, W * 0.4)));
  const max = d3.max(o.series, (s) => d3.max(s.values)) || 1;
  const y = d3.scaleLinear().domain([0, max]).nice();
  const ticks = y.ticks(o.small ? 4 : 5);
  const yf = o.yFmt || ((v) => (max < 5 ? d3.format('.1f')(v) : n0(v)));
  const m = { t: 10, r: 12, b: 24, l: measure(el, ticks.map(yf)) + 10 };
  const x = d3.scalePoint().domain(o.ages).range([m.l, W - m.r]);
  y.range([H - m.b, m.t]);
  const svg = frame(el, W, H, o.aria);
  gridY(svg, y, ticks, m, W, yf);
  const every = Math.ceil(o.ages.length / Math.max(3, Math.floor((W - m.l - m.r) / 46)));
  const gx = svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b})`);
  gx.append('line').attr('x1', m.l).attr('x2', W - m.r);
  const shown = o.ages.filter((a, i) => i % every === 0);
  gx.selectAll('text').data(shown).join('text')
    .attr('x', (d) => x(d)).attr('y', 17)
    .attr('text-anchor', (d, i) => (i === shown.length - 1 && x(d) > W - m.r - 16 ? 'end' : i === 0 ? 'start' : 'middle'))
    .text((d) => (o.ageFmt ? o.ageFmt(d) : d));
  o.series.forEach((s) => {
    const line = d3.line().defined((v) => v != null).x((v, i) => x(o.ages[i])).y((v) => y(v));
    svg.append('path').attr('fill', 'none').style('stroke', s.color).attr('stroke-width', s.width || 2)
      .style('stroke-opacity', s.opacity || null)
      .attr('stroke-dasharray', s.dash || null).attr('stroke-linejoin', 'round').attr('d', line(s.values));
  });
  const tip = tooltip(el);
  const rule = svg.append('line').attr('class', 'ref').attr('y1', m.t).attr('y2', H - m.b).style('opacity', 0);
  const move = (ev) => {
    const [px] = d3.pointer(ev);
    const i = Math.max(0, Math.min(o.ages.length - 1, Math.round((px - m.l) / x.step())));
    const cx = x(o.ages[i]);
    rule.attr('x1', cx).attr('x2', cx).style('opacity', 1);
    tip.show(cx, H / 2, o.tipTitle(o.ages[i]), o.series.map((s) => ({ color: s.color, dash: !!s.dash, label: s.label, value: o.tipFmt(s.values[i], i, s) })));
  };
  svg.append('rect').attr('x', m.l - 4).attr('y', m.t).attr('width', W - m.l - m.r + 8).attr('height', H - m.t - m.b)
    .attr('fill', 'transparent').on('pointermove', move).on('pointerdown', move)
    .on('pointerleave', () => { rule.style('opacity', 0); tip.hide(); });
  return svg.node();
}

// ───────────────────────────── horizontal stacked bars (figure 8)
export function stackedBars(el, o) {
  el.replaceChildren();
  const W = Math.max(280, el.clientWidth || 600);
  const rowH = 30;
  const labW = Math.min(measure(el, o.rows.map((r) => r.label)) + 14, W * 0.32);
  const m = { t: 4, r: o.share ? 8 : 64, b: 24, l: labW };
  const H = m.t + m.b + rowH * o.rows.length;
  const max = o.share ? 100 : d3.max(o.rows, (r) => r.total);
  const x = d3.scaleLinear().domain([0, max]).range([m.l, W - m.r]);
  const svg = frame(el, W, H, o.aria);
  const tip = tooltip(el);
  o.rows.forEach((r, i) => {
    const yy = m.t + i * rowH;
    svg.append('text').attr('class', 'rowlabel').attr('x', m.l - 10).attr('y', yy + rowH / 2).attr('dy', '0.32em')
      .attr('text-anchor', 'end').text(r.label);
    let acc = 0;
    o.keys.forEach((k) => {
      const v = r.values[k] || 0;
      if (v <= 0) return;
      svg.append('rect').attr('x', x(acc)).attr('width', Math.max(0.5, x(acc + v) - x(acc))).attr('y', yy + 5).attr('height', rowH - 10)
        .style('fill', color(k)).style('stroke', 'var(--panel)').attr('stroke-width', 0.5)
        .on('pointermove pointerdown', (ev) => {
          const [px] = d3.pointer(ev, el);
          tip.show(px, yy + rowH / 2, r.label, [{ color: color(k), label: o.labels[k], value: o.tipValue(r, k) }]);
        })
        .on('pointerleave', () => tip.hide());
      acc += v;
    });
    if (!o.share) {
      svg.append('text').attr('class', 'barlabel').attr('x', x(acc) + 6).attr('y', yy + rowH / 2).attr('dy', '0.32em').text(n0(r.total));
    } else {
      const top = o.keys.map((k) => [k, r.values[k] || 0]).sort((p, q) => q[1] - p[1])[0];
      let start = 0;
      for (const k of o.keys) { if (k === top[0]) break; start += r.values[k] || 0; }
      if (x(start + top[1]) - x(start) > 38) {
        svg.append('text').attr('class', 'inbar').attr('x', x(start) + 5).attr('y', yy + rowH / 2).attr('dy', '0.32em')
          .text(Math.round(top[1]) + '%');
      }
    }
  });
  const g = svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b + 2})`);
  g.append('line').attr('x1', m.l).attr('x2', W - m.r);
  const ticks = x.ticks(Math.max(2, Math.floor((W - m.l - m.r) / 90)));
  g.selectAll('text').data(ticks).join('text').attr('x', (d) => x(d)).attr('y', 16)
    .attr('text-anchor', (d, i) => (i === ticks.length - 1 && x(d) > W - 30 ? 'end' : 'middle'))
    .text((d) => (o.share ? d + '%' : n0(d)));
  return svg.node();
}

// ───────────────────────────── dumbbells, 1995 against 2025 (figure 9)
export function dumbbell(el, o) {
  el.replaceChildren();
  const W = Math.max(280, el.clientWidth || 600);
  const narrow = W < 560;
  const rowH = narrow ? 46 : 32;
  const labW = narrow ? 0 : Math.min(measure(el, o.rows.map((r) => r.label)) + 16, W * 0.4);
  const m = { t: 4, r: 52, b: 24, l: labW + 44 };
  const H = m.t + m.b + rowH * o.rows.length;
  const max = d3.max(o.rows, (r) => Math.max(r.a, r.b));
  const x = d3.scaleLinear().domain([0, max]).nice().range([m.l, W - m.r]);
  const svg = frame(el, W, H, o.aria);
  const tip = tooltip(el);
  o.rows.forEach((r, i) => {
    const top = m.t + i * rowH;
    const cy = narrow ? top + rowH - 13 : top + rowH / 2;
    svg.append('text').attr('class', 'rowlabel').attr('x', narrow ? 0 : labW).attr('y', narrow ? top + 12 : cy).attr('dy', '0.32em')
      .attr('text-anchor', narrow ? 'start' : 'end').text(r.label);
    const up = r.b >= r.a;
    svg.append('line').attr('x1', x(r.a)).attr('x2', x(r.b)).attr('y1', cy).attr('y2', cy).attr('class', 'dumb-line');
    svg.append('circle').attr('cx', x(r.a)).attr('cy', cy).attr('r', 5).attr('class', 'dot-from');
    svg.append('circle').attr('cx', x(r.b)).attr('cy', cy).attr('r', 5.5).style('fill', up ? 'var(--bad)' : 'var(--ok)');
    const lab = (v, left, strong) => svg.append('text').attr('class', strong ? 'barlabel strong' : 'barlabel muted')
      .attr('x', x(v) + (left ? -9 : 9)).attr('y', cy).attr('dy', '0.32em').attr('text-anchor', left ? 'end' : 'start').text(n0(v));
    lab(r.a, up, false);
    lab(r.b, !up, true);
    svg.append('rect').attr('x', 0).attr('y', top).attr('width', W).attr('height', rowH).attr('fill', 'transparent')
      .on('pointermove pointerdown', (ev) => {
        const [px] = d3.pointer(ev, el);
        tip.show(px, cy, r.label, [
          { color: 'var(--muted-mark)', label: o.yearA, value: n0(r.a) },
          { color: up ? 'var(--bad)' : 'var(--ok)', label: o.yearB, value: n0(r.b) },
        ]);
      })
      .on('pointerleave', () => tip.hide());
  });
  const g = svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b + 2})`);
  g.append('line').attr('x1', m.l).attr('x2', W - m.r);
  const ticks = x.ticks(Math.max(2, Math.floor((W - m.l - m.r) / 90)));
  g.selectAll('text').data(ticks).join('text').attr('x', (d) => x(d)).attr('y', 16)
    .attr('text-anchor', (d, i) => (i === ticks.length - 1 && x(d) > W - 30 ? 'end' : 'middle')).text((d) => n0(d));
  return svg.node();
}
