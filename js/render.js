/* ============================================================
   render.js — All Canvas 2D drawing functions

   Draw call order each frame:
     1. Background: space black fill, Milky Way gradient, nebula patches, stars
     2. [camera transform applied]
     3. Bounce border dashes
     4. Explosion effects: nebulas → shockwaves → pulsar rings
     5. Particles (colour-batched for performance)
     6. Bodies: trail → body shape → selection ring → velocity vector
     7. Drag preview (new body indicator)
     8. [camera transform restored]
     9. DOM stats update
   ============================================================ */
'use strict';

// ── Helpers ───────────────────────────────────────────────────

/**
 * Create a radial gradient centred at (x,y) with outer radius r.
 * Returns null if the canvas API rejects the arguments.
 */
function safeG(x, y, r) {
  if (!isFinite(x) || !isFinite(y) || r <= 0) return null;
  try   { return ct.createRadialGradient(x, y, 0, x, y, r); }
  catch { return null; }
}

/**
 * Return the nearest live Star body to body b, or null if none exist.
 * Used to compute the shadow direction for planet surface lighting.
 */
function nearestStar(b) {
  let best = null, bestD = Infinity;
  for (let i = 0; i < bodies.length; i++) {
    const s = bodies[i];
    if (s === b || !s.alive || s.type !== 'star') continue;
    const dx = s.x - b.x, dy = s.y - b.y, d = dx*dx + dy*dy;
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}

// ── Trail rendering ───────────────────────────────────────────

/**
 * Draw the body's motion trail as 3 opacity bands, creating a
 * fade-and-taper effect without per-segment draw calls.
 *
 * Index formula: (tHead - tLen + k + TRAIL) % TRAIL
 * This maps k=0 → oldest stored point and k=tLen-1 → newest.
 * The +1 that caused the "frozen ray" bug has been removed here.
 */
function drawTrail(b) {
  if (b.tLen < 2) return;
  const len = b.tLen;
  const baseW = b.type==='comet' ? 2.8 : b.type==='black' ? 2.2 : b.type==='star' ? 2.2 : 1.8;
  const BANDS = 3;

  for (let band = 0; band < BANDS; band++) {
    const t0   = band / BANDS;
    const t1   = (band + 1) / BANDS;
    const tmid = (t0 + t1) * 0.5;
    const i0   = Math.floor(t0 * (len - 1));
    const i1   = Math.floor(t1 * (len - 1));
    if (i0 === i1) continue;

    ct.beginPath();
    for (let k = i0; k <= i1; k++) {
      const idx = (b.tHead - len + k + TRAIL) % TRAIL;   // ← corrected index
      const px  = b.trail[idx*2], py = b.trail[idx*2+1];
      k === i0 ? ct.moveTo(px, py) : ct.lineTo(px, py);
    }
    ct.strokeStyle = b.color + hx(tmid * tmid * 165);
    ct.lineWidth   = Math.max(0.2, tmid * baseW);
    ct.lineCap     = 'round';
    ct.stroke();
  }
}

// ── Body-specific draw functions ──────────────────────────────

/**
 * Draw a planet or moon using its procedurally generated viz scheme.
 * The body is drawn in three passes clipped to a circle:
 *   1. Sphere gradient base (simulates a 3-D sphere)
 *   2. Surface features (craters, continents, bands, etc.)
 *   3. Shadow gradient overlay (directional from nearest star)
 * A thin atmospheric halo is drawn outside the clip after.
 */
function drawTexturedBody(b) {
  const { x, y, radius: r, viz, vizFeatures } = b;
  if (!viz) return;

  ct.save();
  ct.beginPath(); ct.arc(x, y, r, 0, Math.PI*2); ct.clip();

  // Sphere gradient: highlight top-left, shadow bottom-right
  const sg = ct.createRadialGradient(x-r*0.32, y-r*0.36, r*0.04, x, y, r);
  sg.addColorStop(0,   shiftBright(viz.base,  55));
  sg.addColorStop(0.5, viz.base);
  sg.addColorStop(1,   shiftBright(viz.base, -60));
  ct.fillStyle = sg;
  ct.fillRect(x-r, y-r, r*2, r*2);

  // Surface features (circles and horizontal bands)
  for (const f of vizFeatures) {
    if (f.type === 'band') {
      ct.fillStyle = f.col;
      ct.fillRect(x - r, y + f.dy - f.h*0.5, r*2, f.h);
    } else {
      ct.beginPath(); ct.arc(x + f.dx, y + f.dy, f.r, 0, Math.PI*2);
      ct.fillStyle = f.col; ct.fill();
    }
  }
  ct.restore();

  // Directional shadow from nearest star (or default top-right ambient)
  const star  = nearestStar(b);
  const dist  = star ? Math.sqrt((star.x-x)**2+(star.y-y)**2) : 1;
  const lnx   = star ? (star.x-x)/dist : 0.55;
  const lny   = star ? (star.y-y)/dist : -0.60;
  drawShadow(b, lnx, lny);

  // Atmospheric halo ring
  if (viz.atmo) {
    const ag = safeG(x, y, r*1.45);
    if (ag) {
      ag.addColorStop(0.55, 'rgba(0,0,0,0)');
      ag.addColorStop(0.80, viz.atmo);
      ag.addColorStop(1,    'rgba(0,0,0,0)');
      ct.beginPath(); ct.arc(x, y, r*1.45, 0, Math.PI*2);
      ct.fillStyle = ag; ct.fill();
    }
  }
}

/**
 * Apply a linear shadow gradient over the dark hemisphere of a body.
 * lnx, lny is the normalised direction vector toward the light source.
 */
function drawShadow(b, lnx, lny) {
  const { x, y, radius: r } = b;
  const sx = x - lnx*r, sy = y - lny*r;   // shadow side centre
  const lx = x + lnx*r, ly = y + lny*r;   // lit side centre

  const grad = ct.createLinearGradient(lx, ly, sx, sy);
  grad.addColorStop(0,    'rgba(0,0,0,0)');
  grad.addColorStop(0.42, 'rgba(0,0,0,0.08)');
  grad.addColorStop(0.72, 'rgba(0,0,0,0.52)');
  grad.addColorStop(1,    'rgba(0,0,0,0.88)');

  ct.save();
  ct.beginPath(); ct.arc(x, y, r, 0, Math.PI*2); ct.clip();
  ct.fillStyle = grad;
  ct.fillRect(x-r-1, y-r-1, r*2+2, r*2+2);
  ct.restore();
}

/** Draw a black hole: outer glow, rotating accretion disk, event horizon, pulsing ring. */
function drawBlackHole(b) {
  const { x, y, radius: r } = b;

  // Outer purple glow
  const g1 = safeG(x, y, r*8);
  if (g1) {
    g1.addColorStop(0,   'rgba(124,58,237,0.28)');
    g1.addColorStop(0.5, 'rgba(88,28,220,0.07)');
    g1.addColorStop(1,   'rgba(0,0,0,0)');
    ct.beginPath(); ct.arc(x, y, r*8, 0, Math.PI*2);
    ct.fillStyle = g1; ct.fill();
  }

  // Rotating accretion disk — three nested ellipses
  ct.save(); ct.translate(x, y); ct.rotate(b.age * 0.022);
  [
    { rx:r*3.2, ry:r*0.62, col:'rgba(255,140,20,',  a:0.58, lw:2.2 },
    { rx:r*4.4, ry:r*0.52, col:'rgba(255,200,50,',  a:0.38, lw:1.5 },
    { rx:r*5.5, ry:r*0.38, col:'rgba(210,120,255,', a:0.22, lw:1.0 },
  ].forEach(d => {
    ct.beginPath(); ct.ellipse(0, 0, d.rx, d.ry, 0, 0, Math.PI*2);
    ct.strokeStyle = d.col + d.a + ')'; ct.lineWidth = d.lw; ct.stroke();
  });
  ct.restore();

  // Event horizon (perfect black circle)
  ct.beginPath(); ct.arc(x, y, r, 0, Math.PI*2);
  ct.fillStyle = '#000'; ct.fill();

  // Pulsing photon ring
  const pulse = 1.5 + Math.sin(b.age * 0.11) * 0.9;
  ct.beginPath(); ct.arc(x, y, r+2.5, 0, Math.PI*2);
  ct.strokeStyle = '#7c3aed'; ct.lineWidth = pulse; ct.stroke();
}

/** Draw a star: layered corona, animated rays, gradient core. */
function drawStar(b) {
  const { x, y, radius: r } = b;

  // Two corona layers
  for (let layer = 2; layer >= 1; layer--) {
    const g = safeG(x, y, r * (1 + layer*1.8));
    if (g) {
      const al = layer === 2 ? 0.10 : 0.20;
      g.addColorStop(0,    `rgba(251,191,36,${al*3})`);
      g.addColorStop(0.45, `rgba(251,191,36,${al})`);
      g.addColorStop(1,    'rgba(251,191,36,0)');
      ct.beginPath(); ct.arc(x, y, r*(1+layer*1.8), 0, Math.PI*2);
      ct.fillStyle = g; ct.fill();
    }
  }

  // Eight animated solar-flare rays, slowly rotating
  ct.save(); ct.translate(x, y); ct.rotate(b.age * 0.016);
  for (let i = 0; i < 8; i++) {
    const a   = (i / 8) * Math.PI * 2;
    const len = r * (2.3 + 0.55 * Math.sin(b.age*0.04 + i*1.4));
    const al  = 0.22 + 0.12 * Math.sin(b.age*0.04 + i);
    ct.beginPath();
    ct.moveTo(Math.cos(a)*r*0.7, Math.sin(a)*r*0.7);
    ct.lineTo(Math.cos(a)*len,   Math.sin(a)*len);
    ct.strokeStyle = `rgba(251,191,36,${al})`; ct.lineWidth = 1.2; ct.stroke();
  }
  ct.restore();

  // White-hot core with orange edge gradient
  const cg = safeG(x, y, r);
  if (cg) {
    cg.addColorStop(0,   '#fffde7');
    cg.addColorStop(0.4, '#fbbf24');
    cg.addColorStop(1,   '#f97316');
    ct.beginPath(); ct.arc(x, y, r, 0, Math.PI*2);
    ct.fillStyle = cg; ct.fill();
  }
}

/** Draw a comet: dust tail + ion tail + nucleus glow. */
function drawComet(b) {
  const { x, y, radius: r } = b;
  const spd = Math.sqrt(b.vx*b.vx + b.vy*b.vy);

  if (spd > 0.06) {
    const nx = -b.vx/spd, ny = -b.vy/spd;   // tail direction (opposite to velocity)
    const tlen = Math.min(spd * 20, 160);

    // Dust tail — wide, green, tapering to transparent
    const tg = ct.createLinearGradient(x, y, x+nx*tlen, y+ny*tlen);
    tg.addColorStop(0, 'rgba(52,211,153,0.72)');
    tg.addColorStop(0.5, 'rgba(52,211,153,0.22)');
    tg.addColorStop(1, 'rgba(52,211,153,0)');
    ct.beginPath(); ct.moveTo(x, y); ct.lineTo(x+nx*tlen, y+ny*tlen);
    ct.strokeStyle = tg; ct.lineWidth = r*1.2; ct.lineCap = 'round'; ct.stroke();

    // Ion tail — thinner, slightly offset, blue tint
    const ia = Math.atan2(ny, nx) + 0.18;
    ct.beginPath(); ct.moveTo(x, y);
    ct.lineTo(x+Math.cos(ia)*tlen*0.6, y+Math.sin(ia)*tlen*0.6);
    ct.strokeStyle = 'rgba(125,211,252,0.35)'; ct.lineWidth = r*0.5; ct.stroke();
  }

  // Coma glow
  const g = safeG(x, y, r*2.8);
  if (g) {
    g.addColorStop(0, 'rgba(52,211,153,0.60)');
    g.addColorStop(1, 'rgba(52,211,153,0)');
    ct.beginPath(); ct.arc(x, y, r*2.8, 0, Math.PI*2);
    ct.fillStyle = g; ct.fill();
  }

  // Icy nucleus
  const cg = safeG(x, y, r);
  if (cg) { cg.addColorStop(0, '#fff'); cg.addColorStop(1, '#34d399'); }
  ct.beginPath(); ct.arc(x, y, r, 0, Math.PI*2);
  ct.fillStyle = cg || '#34d399'; ct.fill();
}

/** Draw an asteroid: faint glow + rocky textured disc. */
function drawAsteroid(b) {
  const { x, y, radius: r } = b;
  const g = safeG(x, y, r*2.2);
  if (g) {
    g.addColorStop(0, 'rgba(180,120,70,0.3)');
    g.addColorStop(1, 'rgba(180,120,70,0)');
    ct.beginPath(); ct.arc(x, y, r*2.2, 0, Math.PI*2);
    ct.fillStyle = g; ct.fill();
  }
  if (b.viz) drawTexturedBody(b);
  else { ct.beginPath(); ct.arc(x, y, r, 0, Math.PI*2); ct.fillStyle = '#7a6050'; ct.fill(); }
}

/** Dispatch drawing to the correct body-specific function. */
function drawBody(b) {
  if      (b.type === 'black')    drawBlackHole(b);
  else if (b.type === 'star')     drawStar(b);
  else if (b.type === 'comet')    drawComet(b);
  else if (b.type === 'asteroid') drawAsteroid(b);
  else                            drawTexturedBody(b);  // planet, moon

  // Velocity vector arrow
  if (showVectors && b.type !== 'black') {
    const speed = Math.sqrt(b.vx*b.vx + b.vy*b.vy);
    if (speed > 0.05) {
      const scale = Math.min(speed*14, 80);
      const ex = b.x + b.vx/speed*scale, ey = b.y + b.vy/speed*scale;
      ct.beginPath(); ct.moveTo(b.x, b.y); ct.lineTo(ex, ey);
      ct.strokeStyle = 'rgba(255,255,255,0.35)'; ct.lineWidth = 1; ct.stroke();
      ct.beginPath(); ct.arc(ex, ey, 2, 0, Math.PI*2);
      ct.fillStyle = 'rgba(255,255,255,0.45)'; ct.fill();
    }
  }

  // Dashed selection ring
  if (b === selected) {
    ct.beginPath(); ct.arc(b.x, b.y, b.radius+7, 0, Math.PI*2);
    ct.strokeStyle = 'rgba(255,255,255,0.50)'; ct.lineWidth = 1;
    ct.setLineDash([4,4]); ct.stroke(); ct.setLineDash([]);
  }
}

// ── Batch particle draw ───────────────────────────────────────

/**
 * Draw all live particles in a single pass, grouped by colour.
 * Batching means one fillStyle assignment per colour bucket
 * instead of one per particle — critical for performance.
 */
function drawParts() {
  if (!parts.length) return;
  const groups = {};
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i], a = p.life / p.maxLife;
    const key = p.col + Math.round(a*5);
    if (!groups[key]) groups[key] = { col:p.col, a, pts:[] };
    groups[key].pts.push(p.x, p.y, Math.max(0.4, p.r*a));
  }
  for (const k in groups) {
    const g = groups[k];
    ct.fillStyle = g.col + hx(g.a * 215);
    ct.beginPath();
    const pts = g.pts;
    for (let i = 0; i < pts.length; i += 3) {
      ct.moveTo(pts[i]+pts[i+2], pts[i+1]);
      ct.arc(pts[i], pts[i+1], pts[i+2], 0, Math.PI*2);
    }
    ct.fill();
  }
}

// ── Main draw function ────────────────────────────────────────

function draw() {
  if (W === 0 || H === 0) return;

  // 1. Background: space black
  ct.fillStyle = '#020408'; ct.fillRect(0, 0, W, H);

  // 2. Milky Way gradient + static nebula patches (generated once)
  if (!bgNebulas) {
    const mw = ct.createLinearGradient(0, H*0.2, W, H*0.8);
    mw.addColorStop(0,   'rgba(0,0,0,0)');
    mw.addColorStop(0.4, 'rgba(30,40,80,0.12)');
    mw.addColorStop(0.5, 'rgba(40,55,100,0.18)');
    mw.addColorStop(0.6, 'rgba(30,40,80,0.12)');
    mw.addColorStop(1,   'rgba(0,0,0,0)');
    ct.fillStyle = mw; ct.fillRect(0, 0, W, H);

    bgNebulas = [];
    const nebPalette = ['rgba(60,0,120,','rgba(0,40,100,','rgba(80,20,60,','rgba(0,60,80,'];
    for (let i = 0; i < 8; i++) {
      bgNebulas.push({
        x: Math.random()*W, y: Math.random()*H,
        r: 80+Math.random()*200,
        col: nebPalette[~~(Math.random()*nebPalette.length)],
      });
    }
  }
  for (const n of bgNebulas) {
    const g = safeG(n.x, n.y, n.r); if (!g) continue;
    g.addColorStop(0, n.col+'0.08)'); g.addColorStop(1, n.col+'0)');
    ct.beginPath(); ct.arc(n.x, n.y, n.r, 0, Math.PI*2);
    ct.fillStyle = g; ct.fill();
  }

  // 3. Twinkling background stars (6 colour types)
  if (!bgStars) {
    const pal=[[255,255,255],[220,235,255],[255,220,155],[180,200,255],[215,170,255],[255,200,150]];
    bgStars = [];
    for (let i = 0; i < 220; i++) {
      const c = pal[~~(Math.random()*pal.length)];
      bgStars.push({ x:Math.random()*W, y:Math.random()*H, r:0.2+Math.random()*1.2,
        a:0.08+Math.random()*0.55, tw:Math.random()*Math.PI*2, ts:0.008+Math.random()*0.02,
        r0:c[0], g0:c[1], b0:c[2] });
    }
  }
  for (const s of bgStars) {
    s.tw += s.ts;
    const al = s.a * (0.5 + 0.5*Math.sin(s.tw));
    ct.fillStyle = `rgba(${s.r0},${s.g0},${s.b0},${al})`;
    ct.beginPath(); ct.arc(s.x, s.y, s.r, 0, Math.PI*2); ct.fill();
  }

  // 4. World-space content under camera transform
  ct.save(); applyCam();

  if (bounceOn) {
    ct.strokeStyle = 'rgba(55,138,221,0.10)'; ct.lineWidth = 1.5/camZ;
    ct.setLineDash([8/camZ, 8/camZ]); ct.strokeRect(2,2,W-4,H-4); ct.setLineDash([]);
  }

  // Explosion nebulas
  for (const n of nebulas) {
    const g = safeG(n.x, n.y, n.r); if (!g) continue;
    g.addColorStop(0, n.color + hx(n.life*38)); g.addColorStop(1, n.color+'00');
    ct.beginPath(); ct.arc(n.x, n.y, n.r, 0, Math.PI*2); ct.fillStyle = g; ct.fill();
  }
  // Shockwave rings
  for (const s of shocks) {
    ct.beginPath(); ct.arc(s.x, s.y, s.r, 0, Math.PI*2);
    ct.strokeStyle = s.color + hx(s.life*200);
    ct.lineWidth   = Math.max(0.1, 1.5 + s.life*5); ct.stroke();
  }
  // Pulsar rings
  for (const p of prings) {
    ct.beginPath(); ct.arc(p.x, p.y, p.r, 0, Math.PI*2);
    ct.strokeStyle = `rgba(147,197,253,${Math.max(0,p.life*0.6)})`;
    ct.lineWidth   = Math.max(0.1, 2*p.life); ct.stroke();
  }

  // Particles (batched)
  drawParts();

  // Bodies: trail first, then body on top
  for (const b of bodies) { drawTrail(b); drawBody(b); }

  // Drag-to-launch preview
  if (drag && dragStart && mouse) {
    const ws = s2w(dragStart.x, dragStart.y), wm = s2w(mouse.x, mouse.y);
    const dx = wm.x - ws.x, dy = wm.y - ws.y;
    const speedPreview = Math.sqrt(dx*dx+dy*dy);
    const modeColors = { planet:'#4a9fd4', moon:'#9ca3af', star:'#fbbf24',
                         black:'#7c3aed', comet:'#34d399', asteroid:'#f97316' };

    ct.beginPath(); ct.moveTo(ws.x, ws.y); ct.lineTo(wm.x, wm.y);
    ct.strokeStyle='rgba(255,255,255,0.18)'; ct.lineWidth=1.5/camZ;
    ct.setLineDash([5/camZ,5/camZ]); ct.stroke(); ct.setLineDash([]);

    ct.beginPath(); ct.arc(ws.x, ws.y, TY[mode].radius+6, 0, Math.PI*2);
    ct.fillStyle='rgba(255,255,255,0.10)'; ct.fill();
    ct.beginPath(); ct.arc(ws.x, ws.y, TY[mode].radius, 0, Math.PI*2);
    ct.fillStyle=modeColors[mode]+'cc'; ct.fill();

    ct.fillStyle='rgba(255,255,255,0.55)';
    ct.font=`bold ${11/camZ}px monospace`;
    ct.fillText('v='+(Math.round(speedPreview*0.03*10)/10), wm.x+10/camZ, wm.y-5/camZ);
  }

  ct.restore();   // end camera transform

  // 5. DOM stats
  document.getElementById('sBodies').textContent = bodies.length;
  document.getElementById('sMerge').textContent  = merges;
  document.getElementById('sSwallow').textContent= swallowed;
  document.getElementById('sZoom').textContent   = camZ.toFixed(2)+'×';

  // 6. Selected body inspector
  if (selected && selected.alive) {
    const spd = Math.sqrt(selected.vx**2 + selected.vy**2);
    document.getElementById('biType').textContent   = TY[selected.type].label;
    document.getElementById('biMass').textContent   = Math.round(selected.mass);
    document.getElementById('biSpeed').textContent  = Math.round(spd*100)/100;
    document.getElementById('biRadius').textContent = Math.round(selected.radius*10)/10;
    document.getElementById('biAge').textContent    = selected.age+'f';
    document.getElementById('bodyInfo').classList.add('show');
  } else {
    selected = null;
    document.getElementById('bodyInfo').classList.remove('show');
  }
}
