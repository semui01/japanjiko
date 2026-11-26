// App entry: language, routing, resize, offline support and install prompt.
import { initialLang, saveLang, T } from './i18n.js';
import { loadAll } from './data.js';
import { renderReport } from './report.js';
import { renderExplorer, parseState } from './explorer.js';
import { toast } from './share.js';

let lang = initialLang();
let data = null;
let view = null;
let current = null;
const main = document.getElementById('main');

function chrome() {
  const t = T[lang];
  document.documentElement.lang = lang;
  document.title = lang === 'ja' ? '日本の不慮の事故死亡統計 1899〜2025年' : 'Accidental Deaths in Japan, 1899–2025';
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t[el.dataset.t]; });
  const btn = document.getElementById('lang');
  btn.textContent = t.langSwitch;
  btn.setAttribute('aria-label', t.langSwitchLabel);
  btn.lang = lang === 'ja' ? 'en' : 'ja';
}

function markNav() {
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.dataset.nav === current) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

function route(force = false) {
  if (!data) return;
  const h = location.hash;
  const want = h.startsWith('#explorer') ? 'explorer' : 'report';
  if (force || want !== current) {
    const keepScroll = force && want === current ? window.scrollY : 0;
    current = want;
    view = want === 'explorer' ? renderExplorer(main, data, lang, parseState(h)) : renderReport(main, data, lang);
    markNav();
    window.scrollTo(0, keepScroll);
  }
  if (want === 'report' && h.startsWith('#fig-')) {
    const el = document.getElementById(h.slice(1));
    if (el) requestAnimationFrame(() => el.scrollIntoView());
  }
}

document.getElementById('lang').addEventListener('click', () => {
  lang = lang === 'ja' ? 'en' : 'ja';
  saveLang(lang);
  const params = new URLSearchParams(location.search);
  if (params.has('lang')) { params.set('lang', lang); history.replaceState(null, '', `${location.pathname}?${params}${location.hash}`); }
  chrome();
  route(true);
});

window.addEventListener('hashchange', () => route());

let lastWidth = 0, pending = false;
new ResizeObserver(() => {
  const w = main.clientWidth;
  if (w === lastWidth || pending) return;
  lastWidth = w;
  pending = true;
  requestAnimationFrame(() => { pending = false; if (view) view.redraw(); });
}).observe(main);

// Install prompt (Chrome, Edge, Android)
let deferredPrompt = null;
const installBtn = document.getElementById('install');
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; installBtn.hidden = false; });
installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
});
window.addEventListener('appinstalled', () => { installBtn.hidden = true; });

// Offline support
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  const firstInstall = !navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const sw = reg.installing;
    if (sw && firstInstall) sw.addEventListener('statechange', () => { if (sw.state === 'activated') toast(T[lang].offlineReady); });
  }).catch(() => { /* offline support is optional */ });
}

chrome();
loadAll('data/').then((d) => {
  data = d;
  route(true);
}).catch((err) => {
  console.error(err);
  main.innerHTML = `<p class="msg">${T[lang].loadError}</p>`;
});
