/* ============================================================
   controls.js — All UI event listeners and button handlers

   Registers:
     • Body-type mode buttons (.mb)
     • Action buttons: Pause, Bounce, Vectors, Speed, Clear, Demo, Math
     • Demo scene dropdown
     • Canvas mouse / touch events (click-to-inspect, drag-to-launch)
     • Right-mouse-drag for camera pan
     • Mouse-wheel for camera zoom (zoom centred on cursor)
     • Keyboard shortcuts: Space = pause, R = reset camera, Esc = deselect
   ============================================================ */
'use strict';

// ── Mode selection ────────────────────────────────────────────

function setMode(m) {
  mode = m;
  document.querySelectorAll('.mb').forEach(b => b.classList.remove('on'));
  const el = document.getElementById('b' + m.charAt(0).toUpperCase() + m.slice(1));
  if (el) el.classList.add('on');
}

['Planet','Moon','Star','Black','Comet','Asteroid'].forEach(name => {
  document.getElementById('b' + name).addEventListener('click', () => setMode(name.toLowerCase()));
});

// ── Pause / Resume ────────────────────────────────────────────

function togglePause() {
  paused = !paused;
  const btn = document.getElementById('bPause');
  btn.textContent = paused ? '▶ Resume' : '⏸ Pause';
  btn.classList.toggle('paused', paused);
  document.getElementById('pauseOvr').classList.toggle('show', paused);
}
document.getElementById('bPause').addEventListener('click', togglePause);

// ── Bounce toggle ─────────────────────────────────────────────
document.getElementById('bBounce').addEventListener('click', () => {
  bounceOn = !bounceOn;
  document.getElementById('bBounce').classList.toggle('act', bounceOn);
});

// ── Velocity vectors toggle ───────────────────────────────────
document.getElementById('bVectors').addEventListener('click', () => {
  showVectors = !showVectors;
  document.getElementById('bVectors').classList.toggle('act', showVectors);
});

// ── Simulation speed ──────────────────────────────────────────
document.getElementById('rSpeed').addEventListener('input', function () {
  simSpeed = +this.value;
  document.getElementById('spdLbl').textContent = simSpeed + '×';
});

// ── Clear ─────────────────────────────────────────────────────
document.getElementById('bClear').addEventListener('click', clearAll);

// ── Demo dropdown ─────────────────────────────────────────────
const demoBtn  = document.getElementById('bDemo');
const demoMenu = document.getElementById('demoMenu');

demoBtn.addEventListener('click', e => {
  e.stopPropagation();
  demoMenu.classList.toggle('show');
});
document.addEventListener('click', () => demoMenu.classList.remove('show'));
demoMenu.querySelectorAll('.dmi').forEach(el => {
  el.addEventListener('click', () => {
    loadDemo(el.dataset.demo);
    demoMenu.classList.remove('show');
  });
});

// ── Math panel ────────────────────────────────────────────────
document.getElementById('bMath').addEventListener('click', () =>
  document.getElementById('mathPanel').classList.add('open'));
document.getElementById('closeBtn').addEventListener('click', () =>
  document.getElementById('mathPanel').classList.remove('open'));
document.getElementById('mathPanel').addEventListener('click', e => {
  if (e.target === document.getElementById('mathPanel'))
    document.getElementById('mathPanel').classList.remove('open');
});

// ── Mouse: click-to-inspect / drag-to-launch ─────────────────

cv.addEventListener('contextmenu', e => e.preventDefault());

cv.addEventListener('mousedown', e => {
  // Right mouse button → start camera pan
  if (e.button === 2) {
    panStart = gP(e);
    panStartCam = { x: camX, y: camY };
    cv.classList.add('panning');
    return;
  }
  if (e.button !== 0) return;

  const sp = gP(e), wp = s2w(sp.x, sp.y);

  // Check if the click lands on an existing body
  let hit = null;
  for (let i = bodies.length - 1; i >= 0; i--) {
    const b  = bodies[i];
    const dx = wp.x - b.x, dy = wp.y - b.y;
    if (dx*dx + dy*dy <= (b.radius+9)**2) { hit = b; break; }
  }

  if (hit) {
    selected = (selected === hit) ? null : hit;   // toggle inspector
  } else {
    selected   = null;
    drag       = true;
    dragStart  = sp;
    mouse      = sp;
  }
});

window.addEventListener('mousemove', e => {
  if (panStart) {
    const p = gP(e);
    camX = panStartCam.x + (p.x - panStart.x);
    camY = panStartCam.y + (p.y - panStart.y);
    return;
  }
  if (drag) mouse = gP(e);
});

window.addEventListener('mouseup', e => {
  if (e.button === 2) {
    panStart = null; panStartCam = null;
    cv.classList.remove('panning');
    return;
  }
  if (!drag || !dragStart) return;
  const sp = gP(e);
  const ws = s2w(dragStart.x, dragStart.y);
  const we = s2w(sp.x, sp.y);
  bodies.push(mkB(ws.x, ws.y, (we.x-ws.x)*0.03, (we.y-ws.y)*0.03, mode));
  drag = false; dragStart = null;
});

// ── Scroll-wheel zoom (centred on cursor) ─────────────────────
cv.addEventListener('wheel', e => {
  e.preventDefault();
  const factor = e.deltaY > 0 ? 0.88 : 1.14;
  const newZ   = Math.max(0.12, Math.min(10, camZ * factor));
  const r      = newZ / camZ;
  const sp     = gP(e);
  // Keep the world point under the cursor fixed in screen space
  camX = (sp.x - W/2) * (1-r) + camX * r;
  camY = (sp.y - H/2) * (1-r) + camY * r;
  camZ = newZ;
}, { passive: false });

// ── Touch support ─────────────────────────────────────────────
cv.addEventListener('touchstart', e => {
  e.preventDefault();
  drag = true;
  const p = gP(e); dragStart = p; mouse = p;
}, { passive: false });

window.addEventListener('touchmove', e => {
  if (drag) { e.preventDefault(); mouse = gP(e); }
}, { passive: false });

window.addEventListener('touchend', e => {
  if (!drag || !dragStart || !mouse) return;
  const ws = s2w(dragStart.x, dragStart.y);
  const we = s2w(mouse.x,     mouse.y);
  bodies.push(mkB(ws.x, ws.y, (we.x-ws.x)*0.03, (we.y-ws.y)*0.03, mode));
  drag = false; dragStart = null;
});

// ── Keyboard shortcuts ────────────────────────────────────────
window.addEventListener('keydown', e => {
  if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); togglePause(); }
  if (e.code === 'KeyR')    { camX = 0; camY = 0; camZ = 1; }
  if (e.code === 'Escape')  { selected = null; }
});

// ── Utility: get pointer position relative to canvas ──────────
function gP(e) {
  const r = cv.getBoundingClientRect();
  const s = e.touches ? e.touches[0] : e;
  return { x: s.clientX - r.left, y: s.clientY - r.top };
}
