// Ses Söndürücü Laboratuvarı: ekran, çizim ve ses
import {
  FIRES, MIN_HZ, MAX_HZ, step, effect, bandFactor, simulate, explain,
  sliderToHz, hzToSlider, hzLabel
} from './core.mjs';

const $ = id => document.getElementById(id);
const STORE = 'ses-sondurucu-v1';
const MAX_RUN = 30; // 30 saniyede sönmezse "sönmedi" yazarım

const p = { ates: 'mum', hz: 45, db: 105, mesafe: 0.2 };
let level = 1, running = false, elapsed = 0, log = [];

/* ---------- kayıt (sadece bu tarayıcı) ---------- */
function save() { try { localStorage.setItem(STORE, JSON.stringify({ p, log })); } catch { /* gizli sekme */ } }
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE));
    if (d && d.p) Object.assign(p, d.p);
    if (d && Array.isArray(d.log)) log = d.log;
  } catch { /* boş başla */ }
}

/* ---------- ses (isteğe bağlı, kısık) ---------- */
let audio = null;
function soundOn() {
  if (!$('cHear').checked || audio) return;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = Math.min(p.hz, 20000);
  gain.gain.value = 0.0001;
  gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.3);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  audio = { ctx, osc, gain };
}
function soundOff() {
  if (!audio) return;
  const a = audio; audio = null;
  a.gain.gain.exponentialRampToValueAtTime(0.0001, a.ctx.currentTime + 0.2);
  setTimeout(() => a.ctx.close(), 300);
}
function soundUpdate() { if (audio) audio.osc.frequency.setTargetAtTime(Math.min(p.hz, 20000), audio.ctx.currentTime, 0.05); }

/* ---------- deney ---------- */
function setRunning(v) {
  running = v;
  $('bRun').textContent = v ? '⏸ Sesi kapat' : '▶ Sesi aç';
  $('bRun').classList.toggle('on', v);
  v ? soundOn() : soundOff();
}

function addLog(sonuc, ok) {
  log.unshift({ n: log.length + 1, ates: FIRES[p.ates].ad, hz: p.hz, db: p.db, mesafe: p.mesafe, sonuc, ok });
  log = log.slice(0, 50);
  renderLog(); save();
}

function finish(reason) {
  if (reason === 'out') addLog(`Söndü (${elapsed.toFixed(1)} sn)`, true);
  else if (reason === 'timeout') addLog(`${MAX_RUN} sn'de sönmedi (alev %${Math.round(level * 100)})`, false);
  else if (elapsed > 0.5) addLog(`Ben durdurdum (${elapsed.toFixed(1)} sn, alev %${Math.round(level * 100)})`, false);
  setRunning(false);
}

$('bRun').onclick = () => {
  if (running) { finish('stop'); return; }
  if (level === 0) { level = 1; }
  elapsed = 0; setRunning(true);
};
$('bReset').onclick = () => { if (running) finish('stop'); level = 1; elapsed = 0; updateStatus(); };
$('cHear').onchange = () => { if (running) { $('cHear').checked ? soundOn() : soundOff(); } };

/* ---------- ayarlar ---------- */
function readControls() {
  $('rHz').value = hzToSlider(p.hz);
  $('rDb').value = p.db;
  $('rDist').value = Math.round(p.mesafe * 100);
  $('sFire').value = p.ates;
}
function updateInfo() {
  $('oHz').textContent = p.hz >= 1000 ? `${(p.hz / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} kHz` : `${p.hz} Hz`;
  $('hzKind').textContent = hzLabel(p.hz);
  $('oDb').textContent = `${p.db} dB`;
  $('oDist').textContent = `${Math.round(p.mesafe * 100)} cm`;
  const e = effect(p), sim = simulate(p);
  $('sEff').textContent = `%${Math.round(e * 100)}`;
  $('sPred').textContent = sim.soner ? 'Söner' : 'Sönmez';
  $('sPred').style.color = sim.soner ? 'var(--green)' : 'var(--orange)';
  $('sTime').textContent = sim.soner ? `${sim.saniye.toLocaleString('tr-TR')} sn` : '–';
  const notes = explain(p);
  $('notes').innerHTML = notes.map(n => `<li>${n}</li>`).join('');
  drawChart(); soundUpdate(); save();
}
$('rHz').oninput = e => { p.hz = sliderToHz(+e.target.value); updateInfo(); };
$('rDb').oninput = e => { p.db = +e.target.value; updateInfo(); };
$('rDist').oninput = e => { p.mesafe = +e.target.value / 100; updateInfo(); };
$('sFire').onchange = e => { p.ates = e.target.value; if (running) finish('stop'); level = 1; elapsed = 0; updateInfo(); };
document.querySelectorAll('.presets button').forEach(b => b.onclick = () => { p.hz = +b.dataset.hz; readControls(); updateInfo(); });

function renderLog() {
  $('log').innerHTML = log.map(r => `<tr><td>${r.n}</td><td>${r.ates}</td><td>${r.hz.toLocaleString('tr-TR')} Hz</td><td>${r.db} dB</td>
    <td>${Math.round(r.mesafe * 100)} cm</td><td class="${r.ok ? 'ok' : 'no'}">${r.sonuc}</td></tr>`).join('');
  $('logEmpty').hidden = log.length > 0;
}
$('bClearLog').onclick = () => { if (log.length && confirm('Deney defteri silinsin mi?')) { log = []; renderLog(); save(); } };

function updateStatus() {
  $('lvl').style.width = `${Math.round(level * 100)}%`;
  $('lvlTxt').textContent = `%${Math.round(level * 100)}`;
  const st = $('status');
  st.className = 'status ' + (level === 0 ? 'out' : running ? 'burn' : '');
  st.textContent = level === 0 ? `Söndü! (${elapsed.toFixed(1)} sn)` : running ? `Ses açık… ${elapsed.toFixed(1)} sn` : 'Hazır';
}

/* ---------- çizim ---------- */
const cv = $('cv'), ctx = cv.getContext('2d');
let W = 0, H = 0, t = 0, S = 1; // S: küçük ekranda çizimi küçültür
const parts = [], smoke = [];

function resize() {
  const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  W = r.width; H = r.height;
  S = Math.min(1, Math.max(0.5, W / 700));
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
new ResizeObserver(resize).observe(cv);

const fireX = () => (30 + 80 * S) + (Math.min(p.mesafe, 1.5) - 0.05) / 1.45 * (W - (60 + 140 * S));

function drawSpeaker(x, y) {
  ctx.save(); ctx.translate(x, y); ctx.scale(S, S); ctx.translate(-x, -y);
  ctx.fillStyle = '#2a1a1e'; ctx.fillRect(x - 34, y - 46, 40, 92);
  ctx.fillStyle = '#3a2a2e'; ctx.fillRect(x - 30, y - 42, 32, 84);
  ctx.fillStyle = '#120a0c';
  ctx.beginPath(); ctx.arc(x - 14, y + 12, 13, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x - 14, y - 22, 7, 0, 7); ctx.fill();
  ctx.fillStyle = running ? '#5fd7ff' : '#a8958c';
  ctx.beginPath(); ctx.arc(x - 14, y + 12, 5 + (running ? Math.sin(t * 30) * 1.5 : 0), 0, 7); ctx.fill();
  ctx.restore();
}

function drawWaves(x, y) {
  if (!running) return;
  const lam = 18 + 70 * (1 - Math.log(p.hz / MIN_HZ) / Math.log(MAX_HZ / MIN_HZ)); // kalın ses = geniş halka
  const alpha = Math.max(0.08, (p.db - 60) / 60);
  const speed = 60;
  const maxR = W - x;
  ctx.lineWidth = 2;
  for (let r = (t * speed) % lam; r < maxR; r += lam) {
    const fade = 1 - r / maxR;
    ctx.strokeStyle = `rgba(95,215,255,${(alpha * fade).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(x, y, r, -0.6, 0.6); ctx.stroke();
  }
}

function drawBase(x, y) {
  ctx.save(); ctx.translate(x, y); ctx.scale(S, S); ctx.translate(-x, -y);
  if (p.ates === 'mum') {
    ctx.fillStyle = '#fff1d2'; ctx.fillRect(x - 10, y, 20, 60);
    ctx.fillStyle = '#2b1a12'; ctx.fillRect(x - 1, y - 6, 2, 8);
  } else if (p.ates === 'alkol') {
    ctx.fillStyle = '#6b7b8c';
    ctx.beginPath(); ctx.moveTo(x - 30, y); ctx.lineTo(x + 30, y); ctx.lineTo(x + 22, y + 24); ctx.lineTo(x - 22, y + 24); ctx.fill();
  } else {
    ctx.fillStyle = '#5a3a24';
    ctx.save(); ctx.translate(x, y + 14);
    ctx.rotate(0.3); ctx.fillRect(-45, -6, 90, 12);
    ctx.rotate(-0.6); ctx.fillRect(-45, -6, 90, 12);
    ctx.restore();
  }
  ctx.restore();
}

function drawFire(x, y) {
  const size = { mum: 1.8, alkol: 2.6, kamp: 4.2 }[p.ates] * S;
  const e = running ? effect(p) : 0;
  if (level > 0) {
    const n = Math.round(3 + level * 6 * size);
    for (let i = 0; i < n; i++) {
      parts.push({
        x: x + (Math.random() - 0.5) * 10 * size, y: y - 4,
        vx: (Math.random() - 0.5) * 12, vy: -(30 + Math.random() * 40) * (0.5 + level * 0.7) * Math.sqrt(size),
        life: 1, r: (5 + Math.random() * 6) * Math.sqrt(size) * (0.4 + level * 0.6)
      });
    }
  } else if (Math.random() < 0.4 && smoke.length < 60) {
    smoke.push({ x, y: y - 4, vx: (Math.random() - 0.5) * 8, vy: -20, life: 1 });
  }
  ctx.globalCompositeOperation = 'lighter';
  for (let i = parts.length - 1; i >= 0; i--) {
    const q = parts[i];
    q.life -= 0.035;
    q.vx += Math.sin(t * 40 + q.y * 0.1) * 30 * e;           // ses alevi sağa sola savuruyor
    q.x += q.vx / 60; q.y += q.vy / 60;
    if (q.life <= 0) { parts.splice(i, 1); continue; }
    const c = q.life > 0.6 ? `255,${Math.round(200 + 55 * q.life)},${Math.round(80 * q.life)}` : `255,${Math.round(120 * q.life + 60)},40`;
    ctx.fillStyle = `rgba(${c},${(q.life * 0.28).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(q.x, q.y, q.r * q.life + 1, 0, 7); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  for (let i = smoke.length - 1; i >= 0; i--) {
    const s = smoke[i];
    s.life -= 0.01; s.x += s.vx / 60; s.y += s.vy / 60;
    if (s.life <= 0) { smoke.splice(i, 1); continue; }
    ctx.fillStyle = `rgba(168,149,140,${(s.life * 0.25).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(s.x, s.y, 6 + (1 - s.life) * 14, 0, 7); ctx.fill();
  }
}

function drawScene() {
  ctx.fillStyle = '#120a0c'; ctx.fillRect(0, 0, W, H);
  const ground = H * 0.78;
  ctx.fillStyle = '#1f1215'; ctx.fillRect(0, ground, W, H - ground);
  const sx = 30 + 50 * S, sy = ground - 50 * S, fx = fireX();
  drawWaves(sx, sy);
  drawSpeaker(sx, sy);
  const baseY = ground - (p.ates === 'mum' ? 60 : p.ates === 'alkol' ? 24 : 20) * S;
  drawBase(fx, baseY);
  drawFire(fx, baseY);
  // mesafe çizgisi
  ctx.strokeStyle = 'rgba(255,241,210,.25)'; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(sx, ground + 18); ctx.lineTo(fx, ground + 18); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#a8958c'; ctx.font = '12px Rubik, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(p.mesafe * 100)} cm`, (sx + fx) / 2, ground + 34);
}

function drawChart() {
  const c = $('chart'), r = c.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = r.width, h = r.height, pad = 22;
  const xOf = hz => pad + Math.log(hz / MIN_HZ) / Math.log(MAX_HZ / MIN_HZ) * (w - pad * 2);
  g.fillStyle = 'rgba(95,207,122,.12)'; g.fillRect(xOf(30), 8, xOf(60) - xOf(30), h - pad - 8);
  g.strokeStyle = '#ffcf3a'; g.lineWidth = 2; g.beginPath();
  for (let i = 0; i <= 200; i++) {
    const hz = MIN_HZ * (MAX_HZ / MIN_HZ) ** (i / 200);
    const y = h - pad - bandFactor(hz) * (h - pad - 12);
    i ? g.lineTo(xOf(hz), y) : g.moveTo(xOf(hz), y);
  }
  g.stroke();
  g.fillStyle = '#a8958c'; g.font = '11px Rubik, sans-serif'; g.textAlign = 'center';
  for (const [hz, txt] of [[10, '10'], [45, '45'], [440, '440'], [4000, '4k'], [20000, '20k']]) g.fillText(txt, xOf(hz), h - 6);
  const mx = xOf(p.hz);
  g.strokeStyle = '#5fd7ff'; g.beginPath(); g.moveTo(mx, 8); g.lineTo(mx, h - pad); g.stroke();
}
new ResizeObserver(drawChart).observe($('chart'));

/* ---------- döngü ---------- */
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now; t += dt;
  if (running && level > 0) {
    elapsed += dt;
    level = step(level, { ...p, acik: true }, dt);
    if (level === 0) finish('out');
    else if (elapsed >= MAX_RUN) finish('timeout');
  }
  updateStatus();
  if (W) drawScene();
  requestAnimationFrame(loop);
}

load(); readControls(); updateInfo(); renderLog();
requestAnimationFrame(loop);
