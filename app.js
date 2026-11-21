/* Vitvarukollen v3.1 – priser, kostnadsmotor, regelmotor och UI. Ren JS, ingen backend. */
(() => {
'use strict';
const G = typeof window !== 'undefined' ? window : globalThis;
const APPS = G.VK_APPLIANCES;
const TZ = 'Europe/Stockholm';
const MIN = 60000, Q = 15 * MIN, H = 60 * MIN;
const VERSION = '3.1.0';

/* ---------- lagring ---------- */
const store = {
  get(k, d) { try { const v = G.localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { G.localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { G.localStorage.removeItem(k); } catch {} },
  keys() { try { return Object.keys(G.localStorage); } catch { return []; } }
};

/* ---------- inställningar ---------- */
const DEFAULT_CFG = {
  v: 1, area: 'SE3', retailer: 'Telinet Energi', grid: 'Ellevio',
  // öre/kWh; inc = beloppet är inkl. 25 % moms
  spotMarkup: { v: 1.79, inc: false },     // Telinet: fasta påslag inkl. elcertifikat
  variable: { v: 0, inc: false },          // Telinet: rörliga kostnader (sätts i efterhand) – valfri uppskattning
  energyTax: { v: 36.0, inc: false },      // Statlig energiskatt 2026 (45,0 inkl. moms)
  gridTransfer: { v: 26.0, inc: true },    // Ellevio överföringsavgift
  // kr/mån
  retailerMonthly: { v: 55.20, inc: false },
  gridMonthly: { v: 590, inc: true },
  sleepFrom: '23:00', sleepTo: '06:30',
  comboBufferMin: 15,
  machines: Object.fromEntries(APPS.map(a => [a.id, { delayMode: a.delayMode, asleepOK: a.asleepOK }])),
  kwh: {}
};
const clone = o => JSON.parse(JSON.stringify(o));
function mergeCfg(base, inc) {
  const out = clone(base);
  if (!inc || typeof inc !== 'object') return out;
  for (const k of Object.keys(out)) {
    if (!(k in inc)) continue;
    const bv = out[k], iv = inc[k];
    if (bv && typeof bv === 'object' && !Array.isArray(bv)) {
      if (k === 'kwh') { out.kwh = {}; for (const [p, v] of Object.entries(iv || {})) if (+v > 0) out.kwh[p] = +v; }
      else if (k === 'machines') { for (const id of Object.keys(out.machines)) if (iv && iv[id]) Object.assign(out.machines[id], iv[id]); }
      else if ('v' in bv) { if (iv && isFinite(+iv.v)) out[k] = { v: +iv.v, inc: !!iv.inc }; }
    } else if (typeof bv === typeof iv) out[k] = iv;
  }
  return out;
}
let cfg = mergeCfg(DEFAULT_CFG, store.get('vk_cfg', null));
const saveCfg = () => store.set('vk_cfg', cfg);
const exVatKr = f => (f.inc ? f.v / 1.25 : f.v) / 100;      // öre -> kr exkl. moms
const exVatSek = f => (f.inc ? f.v / 1.25 : f.v);             // kr -> kr exkl. moms
/** Totalpris kr/kWh inkl. moms för ett spotpris (kr/kWh exkl. moms). */
const adders = () => exVatKr(cfg.spotMarkup) + exVatKr(cfg.variable) + exVatKr(cfg.energyTax) + exVatKr(cfg.gridTransfer);
const total = spot => (spot + adders()) * 1.25;

/* ---------- tid (Europe/Stockholm) ---------- */
const fmtParts = new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
function parts(ms) {
  const o = {};
  for (const p of fmtParts.formatToParts(new Date(ms))) if (p.type !== 'literal') o[p.type] = +p.value;
  if (o.hour === 24) o.hour = 0;
  return o;
}
const pad = n => String(n).padStart(2, '0');
const dateKey = ms => { const p = parts(ms); return `${p.year}-${pad(p.month)}-${pad(p.day)}`; };
const hm = ms => { const p = parts(ms); return `${pad(p.hour)}:${pad(p.minute)}`; };
const minOfDay = ms => { const p = parts(ms); return p.hour * 60 + p.minute; };
const tzOffset = ms => { const p = parts(ms); return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(ms / MIN) * MIN; };
function localToMs(y, mo, d, h, mi) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let t = guess - tzOffset(guess);
  const off2 = tzOffset(t);
  if (guess - off2 !== t) t = guess - off2;
  return t;
}
const toMin = s => { const [h, m] = String(s).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
/** Nästa tillfälle (strikt efter `after`) då klockan visar hh:mm. */
function nextClock(s, after) {
  const p = parts(after), m = toMin(s);
  for (let dd = 0; dd < 3; dd++) {
    const t = localToMs(p.year, p.month, p.day + dd, Math.floor(m / 60), m % 60);
    if (t > after) return t;
  }
  return after + 24 * H;
}
const WD = ['sön', 'mån', 'tis', 'ons', 'tor', 'fre', 'lör'];
function dayLabel(ms) {
  const now = Date.now(), p = parts(now), k = dateKey(ms);
  if (k === dateKey(now)) return '';
  if (k === dateKey(localToMs(p.year, p.month, p.day + 1, 12, 0))) return 'imorgon ';
  const q = parts(ms); return WD[new Date(Date.UTC(q.year, q.month - 1, q.day)).getUTCDay()] + ' ';
}
const inSleep = (ms, from = cfg.sleepFrom, to = cfg.sleepTo) => { const m = minOfDay(ms), f = toMin(from), t = toMin(to); return f > t ? (m >= f || m < t) : (m >= f && m < t); };
function overlapsSleep(s, e) { for (let t = s; t < e; t += 5 * MIN) if (inSleep(t)) return true; return inSleep(e - MIN); }

/* ---------- priser ---------- */
let quarters = [];               // [{t, spot}] sorterade
let qIndex = new Map();          // t -> spot
let status = { updated: 0, tomorrow: false, demo: false, error: '', loading: false, todayKey: '' };

const priceUrl = key => { const [y, m, d] = key.split('-'); return `https://www.elprisetjustnu.se/api/v1/prices/${y}/${m}-${d}_${cfg.area}.json`; };
async function fetchDay(key) {
  const r = await fetch(priceUrl(key), { cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  if (!Array.isArray(j) || !j.length) return null;
  return j;
}
function ingest(arr, into) {
  for (const e of arr) {
    const s = Date.parse(e.time_start), en = Date.parse(e.time_end), p = +e.SEK_per_kWh;
    if (!isFinite(s) || !isFinite(en) || !isFinite(p)) continue;
    for (let t = s; t < en; t += Q) into.set(t, p);   // timpriser (äldre data) expanderas till kvartar
  }
}
function rebuild(map) {
  quarters = [...map.entries()].sort((a, b) => a[0] - b[0]).map(([t, spot]) => ({ t, spot }));
  qIndex = map;
}
function demoDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  const start = localToMs(y, m, d, 0, 0), end = localToMs(y, m, d + 1, 0, 0), out = [];
  let i = 0;
  for (let t = start; t < end; t += Q, i++) {
    const h = minOfDay(t) / 60;
    const g = (c, w) => Math.exp(-((h - c) ** 2) / (2 * w * w));
    const p = 0.55 + 0.9 * g(8, 1.3) + 1.6 * g(18, 1.8) - 0.35 * g(3, 2.5) + 0.08 * Math.sin(i * 1.7 + d);
    out.push({ SEK_per_kWh: Math.max(0.05, +p.toFixed(4)), time_start: new Date(t).toISOString(), time_end: new Date(t + Q).toISOString() });
  }
  return out;
}
function cleanCache(keep) {
  for (const k of store.keys()) if (k.startsWith('prices_') && !keep.includes(k)) store.del(k);
}
async function loadPrices(force = false) {
  const now = Date.now(), p = parts(now);
  const today = dateKey(now), tomorrow = dateKey(localToMs(p.year, p.month, p.day + 1, 12, 0));
  const ck = k => `prices_${cfg.area}_${k}`;
  status.loading = true; status.error = ''; renderStatus();
  const map = new Map();
  let demo = false, tom = false, updated = status.updated;
  try {
    let td = store.get(ck(today), null);
    if (!td) { const data = await fetchDay(today); td = { at: Date.now(), data }; if (data) store.set(ck(today), td); }
    if (!td.data) throw new Error('Inga priser för idag');
    ingest(td.data, map); updated = Math.max(updated, td.at);
    let tm = store.get(ck(tomorrow), null);
    if (!tm || !tm.data) {
      const data = await fetchDay(tomorrow).catch(() => null);
      if (data) { tm = { at: Date.now(), data }; store.set(ck(tomorrow), tm); updated = Date.now(); }
      else updated = Date.now();
    }
    if (tm && tm.data) { ingest(tm.data, map); tom = true; }
    cleanCache([ck(today), ck(tomorrow)]);
  } catch (e) {
    if (!map.size) { demo = true; ingest(demoDay(today), map); ingest(demoDay(tomorrow), map); tom = true; }
    status.error = String(e && e.message || e);
  }
  rebuild(map);
  status = { updated, tomorrow: tom, demo, error: status.error, loading: false, todayKey: today };
  G.dispatchEvent && G.dispatchEvent(new Event('vk-prices'));
}

/* ---------- kostnadsmotor ---------- */
const appById = id => APPS.find(a => a.id === id);
const progById = (app, id) => app.programs.find(p => p.id === id) || app.programs.find(p => p.id === app.defaultProgramId);
const kwhOf = prog => +(cfg.kwh[prog.id] > 0 ? cfg.kwh[prog.id] : prog.totalKwh);
const loadMult = (app, load) => (load === 'half' && app.supportsHalfLoad ? app.halfLoadMultiplier : 1);

/** Programmets energiprofil som tidssegment från `start`. */
function segments(app, prog, start, load) {
  const w = prog.quarterWeights, sum = w.reduce((a, b) => a + b, 0) || 1;
  const E = kwhOf(prog) * loadMult(app, load), end = start + prog.durationMinutes * MIN, out = [];
  for (let i = 0; i < w.length; i++) {
    const s = start + i * Q, e = Math.min(start + (i + 1) * Q, end);
    if (e > s) out.push({ s, e, kwh: E * w[i] / sum });
  }
  return out;
}
/** Kostnad i kr inkl. moms; null om priser saknas för någon del. */
function costOf(segs) {
  let c = 0;
  for (const g of segs) {
    let t = g.s;
    while (t < g.e) {
      const qs = Math.floor(t / Q) * Q, end = Math.min(qs + Q, g.e), spot = qIndex.get(qs);
      if (spot === undefined) return null;
      c += g.kwh * (end - t) / (g.e - g.s) * total(spot);
      t = end;
    }
  }
  return c;
}
/** En körning (ev. tvätt + tork) som startar vid `start`. */
function plan(app, prog, start, opt) {
  const end = start + prog.durationMinutes * MIN;
  let segs = segments(app, prog, start, opt.load), dryer = null;
  if (opt.combo && app.id === 'washer_bosch') {
    const dApp = appById('dryer_bosch'), dProg = progById(dApp, opt.dryerProgram);
    const dDur = dProg.durationMinutes * MIN;
    let ds = Math.ceil((end + cfg.comboBufferMin * MIN) / MIN) * MIN;
    // Någon måste flytta tvätten: tumlaren startar inte medan ni sover (om den inte får gå då)
    if (!cfg.machines.dryer_bosch.asleepOK && overlapsSleep(ds, ds + dDur)) ds = nextClock(cfg.sleepTo, ds);
    dryer = { start: ds, end: ds + dDur, prog: dProg };
    segs = segs.concat(segments(dApp, dProg, ds, opt.load));
  }
  const chainEnd = dryer ? dryer.end : end;
  return { start, end, dryer, chainEnd, cost: costOf(segs) };
}
/** Alla knapptryck maskinen tillåter (hela timmar). */
function candidates(app, prog, now) {
  const mode = cfg.machines[app.id].delayMode, dur = prog.durationMinutes * MIN, out = [{ k: 0, start: now, mode }];
  if (mode === 'start') for (let k = 1; k <= 24; k++) out.push({ k, start: now + k * H, mode });
  else for (let k = Math.max(1, Math.ceil(dur / H)); k <= 24; k++) out.push({ k, start: now + k * H - dur, mode });
  return out;
}
function deadlineMs(opt, now) {
  if (!opt.deadline || opt.deadline === 'none') return Infinity;
  const s = opt.deadline === 'custom' ? opt.customDeadline : opt.deadline;
  return nextClock(s, now);
}
/** Huvudberäkning för ett program. */
function evaluate(app, prog, opt, now = Date.now()) {
  const dl = deadlineMs(opt, now), allowSleep = cfg.machines[app.id].asleepOK;
  let best = null, nowPlan = null, any = false;
  for (const c of candidates(app, prog, now)) {
    const p = Object.assign(plan(app, prog, c.start, opt), c);
    if (c.k === 0) nowPlan = p;
    if (p.cost == null) continue;
    any = true;
    if (p.chainEnd > dl) continue;
    if (!allowSleep && overlapsSleep(p.start, p.end)) continue;
    if (!best || p.cost < best.cost - 1e-9) best = p;
  }
  return { nowPlan, best, dl, noData: !any };
}

/* ---------- regelmotor (max två tips) ---------- */
function tipsFor(app, prog, opt, res, now) {
  const t = [], b = res.best;
  if (!b) return t;
  const p = parts(now);
  if (!status.tomorrow && p.hour < 14) t.push(['🕐', 'Morgondagens priser släpps ca 13:00 – kolla igen då, natten kan bli billigare.']);
  const endM = minOfDay(b.end);
  if (b.k > 0 && endM < 390 && (b.end - now) < 30 * H) {
    t.push(['🌙', app.id === 'washer_bosch' && !b.dryer
      ? `Klar kl. ${hm(b.end)} – tänk på slutsignalen och att blöt tvätt blir liggande till morgonen.`
      : `Klar kl. ${hm(b.end)} – tänk på slutsignalen mitt i natten.`]);
  }
  if (b.dryer && b.dryer.start - b.end > 2 * H) t.push(['🧺', `Tvätten väntar ${fmtDur(b.dryer.start - b.end)} på tumlaren (kl. ${hm(b.dryer.start)}) eftersom tumlaren inte går medan ni sover.`]);
  // Program-alternativ: snålaste programmet vid samma starttid
  const low = lowestProg(app);
  if (low && low.id !== prog.id && !b.dryer) {
    const alt = costOf(segments(app, low, b.start, opt.load));
    if (alt != null) {
      const diff = b.cost - alt;
      const cheap = isCheap(b.start, b.end);
      if (diff >= 0.5 && !cheap) t.push(['💡', `Byte till ${low.name} sparar ${kr(diff)} vid samma starttid.`]);
      else if (cheap && diff > 0) t.push(['⚡', `Billig el då – ${prog.name} kostar bara ${kr(diff)} mer än ${low.name}.`]);
    }
  }
  if (opt.deadline && opt.deadline !== 'none') t.push(['⏱', `Filter aktivt: visar bara starter som är klara senast ${hm(res.dl)}.`]);
  return t.slice(0, 2);
}
function lowestProg(app) {
  const c = app.programs.filter(p => p.cmp);
  return c.length ? c.reduce((a, b) => (kwhOf(b) < kwhOf(a) ? b : a)) : null;
}
function isCheap(s, e) {
  const now = Date.now(), fut = quarters.filter(q => q.t + Q > now).map(q => q.spot).sort((a, b) => a - b);
  if (fut.length < 8) return false;
  const p20 = fut[Math.floor(fut.length * 0.2)];
  const own = quarters.filter(q => q.t + Q > s && q.t < e).map(q => q.spot);
  return own.length && own.reduce((a, b) => a + b, 0) / own.length <= p20;
}

/* ---------- format ---------- */
const nf2 = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const kr = x => (x == null ? '–' : nf2.format(x) + ' kr');
const kwhTxt = x => new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 }).format(x) + ' kWh';
const durTxt = m => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ' ' + (m % 60) + 'm' : ''}` : `${m}m`);
const fmtDur = ms => { const m = Math.round(ms / MIN); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? (m % 60) + ' min' : ''}`.trim() : `${m} min`; };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const actionText = p => (p.k === 0 ? 'Starta nu' : p.mode === 'start' ? `Fördröjd start +${p.k} h` : `Klar om ${p.k} h`);

G.VK = { parts, dateKey, hm, localToMs, nextClock, ingest, rebuild, segments, costOf, plan, candidates, evaluate, tipsFor, total, demoDay, get cfg() { return cfg; }, set cfg(c) { cfg = c; }, APPS, appById, progById, inSleep, overlapsSleep, mergeCfg, DEFAULT_CFG, status: () => status };

if (typeof document === 'undefined') return;   // Node-test: bara motorn

/* =================================================================== UI */
const $ = s => document.querySelector(s);
const DL_OPTS = [['none', 'Inget tak'], ['07:00', '07:00'], ['17:00', '17:00'], ['22:30', '22:30'], ['custom', 'Valfri tid']];
let ui = Object.assign({ view: 'run', machine: 'washer_bosch', prog: {}, load: 'full', combo: false, deadline: 'none', customDeadline: '18:00', showAll: {} }, store.get('vk_ui', {}));
const saveUi = () => store.set('vk_ui', ui);
const qs = new URLSearchParams(location.search);
if (qs.get('m') && appById(qs.get('m'))) ui.machine = qs.get('m');
let gSel = null, toastTimer = 0, lastRes = null;

function curApp() { return appById(ui.machine) || APPS[0]; }
function curProg(app = curApp()) { return progById(app, ui.prog[app.id] || app.defaultProgramId); }
function opts(app = curApp()) {
  return { load: app.supportsHalfLoad ? ui.load : 'full', combo: app.id === 'washer_bosch' && ui.combo, deadline: ui.deadline, customDeadline: ui.customDeadline, dryerProgram: ui.prog.dryer_bosch || appById('dryer_bosch').defaultProgramId };
}

function renderStatus() {
  const d = $('#sdot'), t = $('#stext');
  if (!d) return;
  $('#refresh').classList.toggle('spin', !!status.loading);
  if (status.loading && !quarters.length) { t.textContent = 'Hämtar priser…'; return; }
  if (status.demo) { d.className = 'dot bad'; t.textContent = 'Demodata – priserna kunde inte hämtas'; return; }
  const u = status.updated ? hm(status.updated) : '–';
  d.className = 'dot' + (status.tomorrow ? ' ok' : '');
  t.textContent = `${cfg.area} uppdaterad ${u} · ` + (status.tomorrow ? 'Imorgon klar' : 'Morgondagens priser släpps ca 13:00');
}

function renderMachines() {
  $('#machines').innerHTML = APPS.map(a => `<button data-m="${a.id}" aria-pressed="${a.id === ui.machine}">${esc(a.name)}</button>`).join('');
}
function renderPills() {
  const app = curApp(), o = [];
  if (app.supportsHalfLoad) o.push(`<button class="pill" id="p-load" aria-pressed="${ui.load === 'half'}">${ui.load === 'half' ? '◐ Halvfull' : '● Full maskin'}</button>`);
  if (app.id === 'washer_bosch') o.push(`<button class="pill" id="p-combo" aria-pressed="${ui.combo}">+ Tork efter</button>`);
  o.push(`<label class="pill" aria-pressed="${ui.deadline !== 'none'}">Klar senast: <select id="p-dl" aria-label="Klar senast">${DL_OPTS.map(([v, l]) => `<option value="${v}"${v === ui.deadline ? ' selected' : ''}>${l}</option>`).join('')}</select>${ui.deadline === 'custom' ? `<input type="time" id="p-dlt" value="${esc(ui.customDeadline)}" aria-label="Valfri tid">` : ' ▾'}</label>`);
  $('#pills').innerHTML = o.join('');
}

function renderDecision() {
  const app = curApp(), prog = curProg(app), o = opts(app), now = Date.now();
  if (!quarters.length) { $('#decision').innerHTML = `<div class="card decision none"><span class="badge none">Väntar på priser</span><div class="action">…</div></div>`; return; }
  const r = lastRes = evaluate(app, prog, o, now), b = r.best, n = r.nowPlan;
  if (!b) {
    $('#decision').innerHTML = `<div class="card decision none"><span class="badge none">Inget alternativ</span>
      <div class="action" style="font-size:28px">${r.noData ? 'Priser saknas' : 'Hinner inte'}</div>
      <div class="when">${r.noData ? 'Programmet går längre än de priser som finns. Kolla igen efter 13:00.' : `Inget knapptryck blir klart ${o.deadline !== 'none' ? 'senast ' + hm(r.dl) : ''} med nuvarande inställningar (sovtid/klar senast).`}</div>
      ${n && n.cost != null ? `<div class="amounts"><div><small>Kör nu</small><strong>${kr(n.cost)}</strong></div></div>` : ''}</div>`;
    return;
  }
  const save = n && n.cost != null ? n.cost - b.cost : 0;
  const nowValid = n && n.cost != null && n.chainEnd <= r.dl && (cfg.machines[app.id].asleepOK || !overlapsSleep(n.start, n.end));
  const wait = b.k > 0 && (!nowValid || save >= Math.max(0.15, 0.03 * (n && n.cost || 0)));
  const shown = wait ? b : n;
  const cls = wait ? 'wait' : 'go';
  const pct = n && n.cost ? Math.round(save / n.cost * 100) : 0;
  const validTo = Math.ceil((now + 1) / Q) * Q;
  const tips = tipsFor(app, prog, o, r, now);
  $('#decision').innerHTML = `<div class="card decision ${cls}">
    <span class="badge ${cls}">${wait ? 'Vänta – ställ in maskinen' : 'Kör nu!'}</span>
    <div class="action">${esc(wait ? actionText(b) : 'Starta nu')}</div>
    <div class="when">${esc(prog.name)} · startar <b>${dayLabel(shown.start)}${hm(shown.start)}</b> · klar <b>${dayLabel(shown.end)}${hm(shown.end)}</b>${shown.dryer ? `<br>Tork ${esc(shown.dryer.prog.name)}: <b>${dayLabel(shown.dryer.start)}${hm(shown.dryer.start)}–${hm(shown.dryer.end)}</b>` : ''}</div>
    <div class="amounts"><div><small>Kör nu</small><strong>${kr(n && n.cost)}</strong></div>
      <div class="best"><small>Bästa start ${b.k ? hm(b.start) : '(nu)'}</small><strong>${kr(b.cost)}</strong>${save > 0.005 && b.k ? `<br><span class="save">Spara ${kr(save)} (${pct} %)</span>` : ''}</div></div>
    ${wait ? `<div class="valid">Gäller om du trycker före ${hm(validTo)}${b.mode === 'finish' ? ' · Bosch räknar sluttid, starttiden är beräknad' : ''}</div>` : ''}
    ${tips.length ? `<div class="tips">${tips.map(([i, s]) => `<div class="tip"><i>${i}</i><span>${esc(s)}</span></div>`).join('')}</div>` : ''}
    <div class="row2"><button class="btn primary" id="started">✓ Jag har startat</button></div>
  </div>`;
  $('#started').onclick = () => logRun(app, prog, shown, n);
}

function renderTable() {
  const app = curApp(), act = curProg(app), o = opts(app), now = Date.now();
  const low = lowestProg(app), actRes = lastRes;
  const favs = app.programs.filter(p => p.isFavorite || p.id === act.id);
  const rest = app.programs.filter(p => !favs.includes(p));
  const list = ui.showAll[app.id] ? favs.concat(rest) : favs;
  const rows = list.map(p => {
    const r = p.id === act.id && actRes ? actRes : (quarters.length ? evaluate(app, p, o, now) : null);
    const nc = r && r.nowPlan ? r.nowPlan.cost : null, bc = r && r.best ? r.best.cost : null;
    return `<button class="prow${p.id === act.id ? ' active' : ''}" data-p="${p.id}">
      <span><span class="nm">${esc(p.name)}</span><span class="meta">${durTxt(p.durationMinutes)} · ${kwhTxt(kwhOf(p) * loadMult(app, o.load))}${p.id === act.id ? '<span class="tag act">Aktiv</span>' : ''}${low && p.id === low.id ? '<span class="tag low">Lägst kWh</span>' : ''}</span></span>
      <span class="n">${kr(nc)}</span>
      <span class="b">${kr(bc)}${r && r.best && r.best.k ? `<small>kl. ${hm(r.best.start)}</small>` : '<small>nu</small>'}</span></button>`;
  }).join('');
  $('#ptable').innerHTML = `<h2>Jämför program</h2><div class="thead"><span>Program${o.combo ? ' (+ tork)' : ''}</span><span>Nu</span><span>Bäst</span></div>${rows}
    ${rest.length ? `<button class="more" id="more">${ui.showAll[app.id] ? 'Visa färre ▴' : `Visa övriga program (${rest.length} till) ▾`}</button>` : ''}`;
}

/* ---------- sparlogg & kalender ---------- */
function logRun(app, prog, p, n) {
  const log = store.get('vk_log', []);
  const entry = { at: Date.now(), m: app.id, p: prog.id, cost: +p.cost.toFixed(2), now: n && n.cost != null ? +n.cost.toFixed(2) : +p.cost.toFixed(2), end: p.dryer ? p.dryer.end : p.end, name: prog.name, mname: app.name };
  log.push(entry); store.set('vk_log', log.slice(-500));
  renderSavings();
  toast(`Sparat ${kr(Math.max(0, entry.now - entry.cost))}`, [['Påminn mig', () => calendar(entry)], ['Ångra', () => { const l = store.get('vk_log', []); l.pop(); store.set('vk_log', l); renderSavings(); }]]);
}
function renderSavings() {
  const log = store.get('vk_log', []), mk = dateKey(Date.now()).slice(0, 7);
  const m = log.filter(e => dateKey(e.at).slice(0, 7) === mk);
  if (!m.length) { $('#savings').innerHTML = ''; return; }
  const s = m.reduce((a, e) => a + Math.max(0, e.now - e.cost), 0);
  const month = new Intl.DateTimeFormat('sv-SE', { month: 'long', timeZone: TZ }).format(new Date());
  $('#savings').innerHTML = `<div class="card savings"><div><h2 style="margin:0">Sparat i ${month}</h2><span class="when">${m.length} körningar loggade i den här telefonen</span></div><strong>${kr(s)}</strong></div>`;
}
function icsDate(ms) { return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''); }
async function calendar(e) {
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Vitvarukollen//SV', 'BEGIN:VEVENT', `UID:${e.at}@vitvarukollen`, `DTSTAMP:${icsDate(Date.now())}`,
    `DTSTART:${icsDate(e.end)}`, `DTEND:${icsDate(e.end + 10 * MIN)}`, `SUMMARY:${e.mname} klar – ${e.name}`, 'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', `DESCRIPTION:${e.mname} är klar`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const file = new File([ics], 'vitvarukollen.ics', { type: 'text/calendar' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Påminnelse' }); return; } } catch (err) { if (err && err.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = 'vitvarukollen.ics'; document.body.appendChild(a); a.click(); a.remove();
}
function toast(msg, actions = []) {
  clearTimeout(toastTimer);
  const el = $('#toast');
  el.innerHTML = `<div class="toast"><span>${esc(msg)}</span>${actions.map((a, i) => `<button data-i="${i}">${esc(a[0])}</button>`).join('')}</div>`;
  el.querySelectorAll('button').forEach(b => b.onclick = () => { el.innerHTML = ''; actions[+b.dataset.i][1](); });
  toastTimer = setTimeout(() => { el.innerHTML = ''; }, 6000);
}

/* ---------- prisgraf ---------- */
function drawChart() {
  const svg = $('#chart'), W = svg.clientWidth, Hh = svg.clientHeight;
  if (!W || !quarters.length) return;
  const now = Date.now(), cur = Math.floor(now / Q) * Q;
  const qs = quarters.filter(q => q.t >= cur);
  if (!qs.length) { svg.innerHTML = ''; return; }
  const tots = qs.map(q => total(q.spot)), sorted = [...tots].sort((a, b) => a - b);
  const p25 = sorted[Math.floor(sorted.length * .25)], p75 = sorted[Math.floor(sorted.length * .75)], p90 = sorted[Math.floor(sorted.length * .9)];
  const max = Math.max(...tots) * 1.08, min0 = Math.min(0, ...tots);
  const L = 34, R = 6, T = 18, B = 26, bw = (W - L - R) / qs.length;
  const y = v => T + (Hh - T - B) * (1 - (v - min0) / (max - min0));
  const app = curApp(), prog = curProg(app);
  if (gSel == null || gSel < cur) gSel = lastRes && lastRes.best ? Math.floor(lastRes.best.start / Q) * Q : cur;
  const runEnd = gSel + prog.durationMinutes * MIN;
  let s = '';
  for (const g of [0.5, 1, 1.5, 2, 3, 4, 5, 6].filter(v => v < max)) s += `<line x1="${L}" x2="${W - R}" y1="${y(g)}" y2="${y(g)}" stroke="#334155" stroke-width="1"/><text x="${L - 5}" y="${y(g) + 4}" text-anchor="end" fill="#64748B" font-size="11">${nf2.format(g).replace(',00', '')}</text>`;
  s += `<rect x="${L + (gSel - cur) / Q * bw}" y="${T - 8}" width="${Math.max(2, (runEnd - gSel) / Q * bw)}" height="${Hh - T - B + 8}" fill="#60A5FA" fill-opacity=".14" stroke="#60A5FA" stroke-opacity=".6" rx="3"/>`;
  qs.forEach((q, i) => {
    const v = tots[i], c = v >= p90 ? '#EF4444' : v >= p75 ? '#F59E0B' : v <= p25 ? '#10B981' : '#475569';
    s += `<rect x="${(L + i * bw + bw * .12).toFixed(2)}" y="${y(Math.max(v, 0)).toFixed(1)}" width="${Math.max(.8, bw * .76).toFixed(2)}" height="${Math.abs(y(v) - y(0)).toFixed(1)}" fill="${c}" rx="${bw > 4 ? 1.5 : 0}"/>`;
    const m = minOfDay(q.t);
    if (m % 180 === 0) {
      s += `<text x="${L + i * bw}" y="${Hh - 8}" fill="#94A3B8" font-size="11" text-anchor="middle">${m === 0 ? (W < 420 ? '00' : dateKey(q.t).slice(8) + '/' + dateKey(q.t).slice(5, 7)) : pad(m / 60)}</text>`;
      if (m === 0) s += `<line x1="${L + i * bw}" x2="${L + i * bw}" y1="${T - 8}" y2="${Hh - B}" stroke="#94A3B8" stroke-dasharray="3 3" stroke-width="1"/>`;
    }
  });
  s += `<text x="${L}" y="11" fill="#94A3B8" font-size="11">nu ${hm(now)}</text>`;
  svg.setAttribute('viewBox', `0 0 ${W} ${Hh}`);
  svg.innerHTML = s;
  svg._geo = { L, bw, cur, n: qs.length };
  renderGraphSel();
  const iMin = tots.indexOf(sorted[0]), iMax = tots.indexOf(sorted[sorted.length - 1]);
  const avg = tots.reduce((a, b) => a + b, 0) / tots.length;
  $('#gsum').innerHTML = `<div><span>🟢 Lägst</span><b>${nf2.format(sorted[0])} kr/kWh · ${dayLabel(qs[iMin].t)}${hm(qs[iMin].t)}</b></div>
    <div><span>🔴 Högst</span><b>${nf2.format(sorted[sorted.length - 1])} kr/kWh · ${dayLabel(qs[iMax].t)}${hm(qs[iMax].t)}</b></div>
    <div><span>Snitt framåt</span><b>${nf2.format(avg)} kr/kWh</b></div>`;
}
function renderGraphSel() {
  const app = curApp(), prog = curProg(app), o = opts(app);
  const p = plan(app, prog, Math.max(gSel, Date.now()), o);
  const tq = total(qIndex.get(gSel) ?? NaN);
  $('#gsel').innerHTML = `<div class="sel"><span class="when">Start ${dayLabel(gSel)}<b>${hm(Math.max(gSel, Date.now()))}</b> · ${esc(prog.name)}${o.combo ? ' + tork' : ''}</span><strong>${kr(p.cost)}</strong></div>
    <div class="when">Klar ${dayLabel(p.chainEnd)}<b>${hm(p.chainEnd)}</b> · kvartspris ${isFinite(tq) ? nf2.format(tq) + ' kr/kWh' : '–'}</div>
    <div class="valid">Dra fingret längs grafen för att testa andra starttider.</div>`;
}
function scrub(ev) {
  const svg = $('#chart'), g = svg._geo; if (!g) return;
  const r = svg.getBoundingClientRect(), x = ev.clientX - r.left;
  const i = Math.max(0, Math.min(g.n - 1, Math.floor((x - g.L) / g.bw)));
  const t = g.cur + i * Q;
  if (t !== gSel) { gSel = t; drawChart(); }
}

/* ---------- inställningar ---------- */
function fieldMoney(key, label, unit, hint) {
  const f = cfg[key];
  return `<div class="field"><label for="f-${key}">${label}</label><span class="inp"><input type="number" inputmode="decimal" step="any" id="f-${key}" data-k="${key}" value="${f.v}"><span class="u">${unit}</span></span>
    <label class="chk"><input type="checkbox" data-inc="${key}"${f.inc ? ' checked' : ''}> inkl. moms</label>${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
}
function renderSettings() {
  const add = adders() * 1.25 * 100, fixed = exVatSek(cfg.retailerMonthly) * 1.25 + exVatSek(cfg.gridMonthly) * 1.25;
  const machines = APPS.map(a => { const m = cfg.machines[a.id]; return `<div class="field"><label>${esc(a.name)}<span class="hint" style="display:block">${esc(a.model)}</span></label>
    <span class="mini" role="group" aria-label="Fördröjning ${esc(a.name)}"><button data-dm="${a.id}:start" aria-pressed="${m.delayMode === 'start'}">Start om +h</button><button data-dm="${a.id}:finish" aria-pressed="${m.delayMode === 'finish'}">Klar om h</button></span>
    <label class="chk" style="font-size:14px">Får gå medan vi sover <input type="checkbox" class="switch" data-sl="${a.id}"${m.asleepOK ? ' checked' : ''}></label></div>`; }).join('');
  const kwh = APPS.map(a => `<details><summary>${esc(a.name)} – kWh per program</summary>${a.programs.map(p => `<div class="field"><label for="k-${p.id}">${esc(p.name)}</label><span class="inp"><input type="number" inputmode="decimal" step="0.01" min="0" id="k-${p.id}" data-kwh="${p.id}" placeholder="${p.totalKwh}" value="${cfg.kwh[p.id] ?? ''}"><span class="u">kWh</span></span></div>`).join('')}</details>`).join('');
  $('#settings').innerHTML = `
  <div class="card"><h2>Elhandel – ${esc(cfg.retailer)}</h2>
    ${fieldMoney('spotMarkup', 'Fasta påslag inkl. elcertifikat', 'öre/kWh')}
    ${fieldMoney('variable', 'Rörliga kostnader (uppskattning)', 'öre/kWh', 'Sätts i efterhand. Dina senaste fakturor: 11,3–11,7 öre exkl. moms. 0 = räknas inte med.')}
    ${fieldMoney('retailerMonthly', 'Månadsavgift', 'kr/mån')}
  </div>
  <div class="card"><h2>Elnät – ${esc(cfg.grid)}</h2>
    ${fieldMoney('gridTransfer', 'Överföringsavgift', 'öre/kWh')}
    ${fieldMoney('gridMonthly', 'Fast avgift', 'kr/mån')}
    ${fieldMoney('energyTax', 'Energiskatt', 'öre/kWh', 'Faktureras via elnätet. 36,0 öre exkl. moms = 45,0 öre inkl. moms (2026).')}
    <div class="sumline">Rörligt utöver spotpriset: <b>${nf2.format(add)} öre/kWh</b> inkl. moms<br>Fasta avgifter: <b>${kr(fixed)}/mån</b> (påverkar inte när ni ska köra)</div>
  </div>
  <div class="card"><h2>Maskiner</h2>
    <div class="hint" style="font-size:13px;color:var(--mute)">Kolla på panelen: räknar maskinen tid till <b>start</b> eller till <b>klar</b>?</div>
    ${machines}
    <div class="field"><label>Sovtid</label><span class="inp"><input type="time" id="s-from" value="${cfg.sleepFrom}" aria-label="Sovtid från"><span class="u">–</span><input type="time" id="s-to" value="${cfg.sleepTo}" aria-label="Sovtid till"></span></div>
    ${kwh}
  </div>
  <div class="card"><h2>Dela med partner</h2>
    <p class="when" style="margin:0 0 10px">Skicka länken till den andra telefonen så får den exakt samma priser och maskininställningar.</p>
    <div class="row2" style="margin-top:0"><button class="btn primary" id="share">Dela länk</button><button class="btn" id="copy">Kopiera</button></div>
    <details><summary>Klistra in delningslänk</summary><textarea id="imp" placeholder="Klistra in länken eller koden här"></textarea><div class="row2"><button class="btn" id="doimp">Importera</button></div></details>
  </div>
  <div class="card"><h2>Övrigt</h2>
    <div class="row2" style="margin-top:0"><button class="btn" id="reset">Återställ standardvärden</button><button class="btn" id="clearlog">Rensa sparlogg</button></div>
    <p class="valid">Vitvarukollen ${VERSION} · Elområde ${esc(cfg.area)}</p>
  </div>`;
}
const b64u = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
const shareLink = () => location.origin + location.pathname + '#cfg=' + b64u(JSON.stringify(cfg));
function parseImport(text) {
  const m = String(text).match(/cfg=([A-Za-z0-9_-]+)/) || String(text).trim().match(/^([A-Za-z0-9_-]{20,})$/);
  if (!m) throw new Error('Hittar ingen kod');
  return mergeCfg(DEFAULT_CFG, JSON.parse(unb64u(m[1])));
}
function offerImport(text) {
  let c; try { c = parseImport(text); } catch { toast('Ogiltig delningslänk'); return; }
  $('#banner').innerHTML = `<div class="banner info"><b>Importera inställningar?</b><br>Påslag ${c.spotMarkup.v} öre, överföring ${c.gridTransfer.v} öre, energiskatt ${c.energyTax.v} öre m.m.<div class="row2"><button class="btn primary" id="imp-ok">Importera</button><button class="btn" id="imp-no">Avbryt</button></div></div>`;
  $('#imp-ok').onclick = () => { cfg = c; saveCfg(); $('#banner').innerHTML = ''; clearHash(); renderAll(); toast('Inställningarna är importerade'); };
  $('#imp-no').onclick = () => { $('#banner').innerHTML = ''; clearHash(); };
}
function clearHash() { try { history.replaceState(null, '', location.pathname + location.search); } catch {} }

/* ---------- render & händelser ---------- */
function renderRun() { renderStatus(); renderMachines(); renderPills(); renderDecision(); renderTable(); renderSavings(); }
function renderAll() {
  renderRun();
  if (ui.view === 'graph') drawChart();
  if (ui.view === 'set') renderSettings();
  $('#garea').textContent = cfg.area;
}
function show(view) {
  ui.view = view; saveUi();
  for (const v of ['run', 'graph', 'set']) $('#v-' + v).hidden = v !== view;
  document.querySelectorAll('nav button').forEach(b => b.dataset.view === view ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  if (view === 'graph') { gSel = null; requestAnimationFrame(drawChart); }
  if (view === 'set') renderSettings();
  if (view === 'run') renderRun();
  window.scrollTo(0, 0);
}

document.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.view) return show(t.dataset.view);
  if (t.dataset.m) { ui.machine = t.dataset.m; saveUi(); return renderRun(); }
  if (t.dataset.p) { ui.prog[curApp().id] = t.dataset.p; saveUi(); renderDecision(); renderTable(); return window.scrollTo({ top: 0, behavior: 'smooth' }); }
  if (t.dataset.dm) { const [id, mode] = t.dataset.dm.split(':'); cfg.machines[id].delayMode = mode; saveCfg(); return renderSettings(); }
  switch (t.id) {
    case 'refresh': return loadPrices(true);
    case 'p-load': ui.load = ui.load === 'half' ? 'full' : 'half'; saveUi(); return renderRun();
    case 'p-combo': ui.combo = !ui.combo; saveUi(); return renderRun();
    case 'more': ui.showAll[curApp().id] = !ui.showAll[curApp().id]; saveUi(); return renderTable();
    case 'share': {
      const url = shareLink();
      if (navigator.share) navigator.share({ title: 'Vitvarukollen', text: 'Mina inställningar för Vitvarukollen', url }).catch(() => {});
      else navigator.clipboard.writeText(url).then(() => toast('Länken är kopierad'), () => toast('Kunde inte kopiera'));
      return;
    }
    case 'copy': return navigator.clipboard.writeText(shareLink()).then(() => toast('Länken är kopierad'), () => toast('Kunde inte kopiera'));
    case 'doimp': return offerImport($('#imp').value);
    case 'reset': cfg = clone(DEFAULT_CFG); saveCfg(); renderAll(); return toast('Standardvärden återställda');
    case 'clearlog': { const old = store.get('vk_log', []); store.set('vk_log', []); renderSavings(); return toast('Sparloggen är rensad', [['Ångra', () => { store.set('vk_log', old); renderSavings(); }]]); }
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'p-dl') { ui.deadline = t.value; saveUi(); return renderRun(); }
  if (t.id === 'p-dlt') { ui.customDeadline = t.value || '18:00'; saveUi(); renderDecision(); return renderTable(); }
  if (t.dataset.k) { const v = parseFloat(String(t.value).replace(',', '.')); if (isFinite(v)) { cfg[t.dataset.k].v = v; saveCfg(); renderSettings(); } return; }
  if (t.dataset.inc) { cfg[t.dataset.inc].inc = t.checked; saveCfg(); return renderSettings(); }
  if (t.dataset.sl) { cfg.machines[t.dataset.sl].asleepOK = t.checked; saveCfg(); return; }
  if (t.dataset.kwh) { const v = parseFloat(String(t.value).replace(',', '.')); if (v > 0) cfg.kwh[t.dataset.kwh] = v; else delete cfg.kwh[t.dataset.kwh]; saveCfg(); return; }
  if (t.id === 's-from' || t.id === 's-to') { cfg[t.id === 's-from' ? 'sleepFrom' : 'sleepTo'] = t.value || (t.id === 's-from' ? '23:00' : '06:30'); saveCfg(); }
});
const fig = $('#fig');
fig.addEventListener('pointerdown', e => { fig.setPointerCapture(e.pointerId); scrub(e); });
fig.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') scrub(e); });
new ResizeObserver(() => { if (ui.view === 'graph') drawChart(); }).observe(fig);
addEventListener('vk-prices', () => renderAll());

// Klockan: räkna om varje halvminut, hämta morgondagen när den släpps
let lastQ = 0;
setInterval(() => {
  const q = Math.floor(Date.now() / Q);
  if (q !== lastQ) { lastQ = q; if (ui.view === 'run') { renderDecision(); renderTable(); } if (ui.view === 'graph') drawChart(); }
  const p = parts(Date.now());
  if (!status.tomorrow && !status.loading && !status.demo && (p.hour > 12 || (p.hour === 12 && p.minute >= 55)) && p.minute % 5 === 0) loadPrices();
  if (status.todayKey && status.todayKey !== dateKey(Date.now())) loadPrices();
}, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (status.todayKey !== dateKey(Date.now()) || !status.tomorrow || status.demo) loadPrices(); else renderAll(); } });

if (location.hash.startsWith('#cfg=')) offerImport(location.hash);
show(ui.view || 'run');
loadPrices();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
