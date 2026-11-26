// Copy links, CSV downloads and PNG export of charts.

export function toast(text) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.hidden = true; }, 2200);
}

export async function copyLink(url, okText, failText) {
  try {
    await navigator.clipboard.writeText(url);
    toast(okText);
  } catch (e) {
    window.prompt(failText, url);
  }
}

function download(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

export function downloadCSV(filename, rows, columns) {
  const cell = (v) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const text = [columns.map(cell).join(','), ...rows.map((r) => columns.map((c) => cell(r[c])).join(','))].join('\n');
  // BOM so spreadsheet programs read the Japanese text as UTF-8
  download(new Blob(['﻿' + text + '\n'], { type: 'text/csv;charset=utf-8' }), filename);
}

const STYLE_PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linejoin', 'opacity', 'fill-opacity',
  'font-size', 'font-family', 'font-weight', 'font-variant-numeric'];

function svgImage(svg) {
  const clone = svg.cloneNode(true);
  const src = [svg, ...svg.querySelectorAll('*')];
  const dst = [clone, ...clone.querySelectorAll('*')];
  src.forEach((node, i) => {
    const cs = getComputedStyle(node);
    const decl = STYLE_PROPS.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(';');
    dst[i].setAttribute('style', decl);
  });
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const w = svg.getBoundingClientRect().width;
  const h = svg.getBoundingClientRect().height;
  clone.setAttribute('width', w);
  clone.setAttribute('height', h);
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = reject;
    img.src = url;
  });
}

function wrap(ctx, text, maxW) {
  const lines = [];
  // Japanese has no spaces, so break on characters when a word does not fit.
  let line = '';
  for (const ch of text.split(/(\s+)/).flatMap((w) => (ctx.measureText(w).width > maxW ? [...w] : [w]))) {
    if (ctx.measureText(line + ch).width > maxW && line.trim()) { lines.push(line.trim()); line = ch.trimStart(); } else line += ch;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

// Draw the chart area (one or more SVGs plus panel titles) with a title, legend and source line.
export async function exportPNG({ area, title, legend = [], note = '', source = '', filename }) {
  const css = getComputedStyle(document.documentElement);
  const v = (name) => css.getPropertyValue(name).trim();
  const font = getComputedStyle(document.body).fontFamily;
  const scale = 2, pad = 28;
  const box = area.getBoundingClientRect();
  const W = Math.ceil(box.width) + pad * 2;
  const measureCtx = document.createElement('canvas').getContext('2d');

  measureCtx.font = `600 19px ${font}`;
  const titleLines = wrap(measureCtx, title, W - pad * 2);
  measureCtx.font = `13px ${font}`;
  const legendRows = [];
  let row = [], rowW = 0;
  legend.forEach((it) => {
    const w = 22 + measureCtx.measureText(it.label).width + 18;
    if (rowW + w > W - pad * 2 && row.length) { legendRows.push(row); row = []; rowW = 0; }
    row.push({ ...it, w }); rowW += w;
  });
  if (row.length) legendRows.push(row);
  measureCtx.font = `12px ${font}`;
  const footLines = [...(note ? wrap(measureCtx, note, W - pad * 2) : []), ...wrap(measureCtx, source, W - pad * 2)];

  const headH = pad + titleLines.length * 26 + 8 + legendRows.length * 22 + 10;
  const H = Math.ceil(headH + box.height + 16 + footLines.length * 17 + pad);
  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.fillStyle = v('--panel') || '#fff';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = v('--fg');
  ctx.textBaseline = 'top';
  ctx.font = `600 19px ${font}`;
  titleLines.forEach((l, i) => ctx.fillText(l, pad, pad + i * 26));
  let yy = pad + titleLines.length * 26 + 8;
  ctx.font = `13px ${font}`;
  legendRows.forEach((r) => {
    let xx = pad;
    r.forEach((it) => {
      ctx.strokeStyle = it.css || v('--fg');
      ctx.lineWidth = 3;
      ctx.setLineDash(it.dash ? [5, 3] : []);
      ctx.beginPath(); ctx.moveTo(xx, yy + 8); ctx.lineTo(xx + 16, yy + 8); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = v('--fg');
      ctx.fillText(it.label, xx + 22, yy + 1);
      xx += it.w;
    });
    yy += 22;
  });

  const top = headH;
  const svgs = [...area.querySelectorAll('svg.chart-svg')];
  const imgs = await Promise.all(svgs.map(svgImage));
  svgs.forEach((s, i) => {
    const r = s.getBoundingClientRect();
    ctx.drawImage(imgs[i], pad + r.left - box.left, top + r.top - box.top, r.width, r.height);
  });
  ctx.font = `600 13px ${font}`;
  ctx.fillStyle = v('--fg');
  area.querySelectorAll('.panel-title').forEach((t) => {
    const r = t.getBoundingClientRect();
    ctx.fillText(t.textContent.trim(), pad + r.left - box.left, top + r.top - box.top + 2);
  });

  ctx.font = `12px ${font}`;
  ctx.fillStyle = v('--muted');
  footLines.forEach((l, i) => ctx.fillText(l, pad, top + box.height + 16 + i * 17));

  await new Promise((resolve) => canvas.toBlob((b) => { download(b, filename); resolve(); }, 'image/png'));
}
