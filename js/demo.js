/* ============================================================
   demo.js — Pre-built demo scenes

   Each scene places a carefully chosen set of bodies with
   velocities calculated so that most orbits start stable:
     v_circular = √(G × M_central / r)   (Newtonian circular orbit)
   The actual values are tuned empirically for G = 0.5.
   ============================================================ */
'use strict';

/** Reset all simulation state to empty. */
function clearAll() {
  bodies  = []; parts  = []; shocks = []; nebulas = []; prings = [];
  merges  = 0;  swallowed = 0;
  selected = null;
  camX = 0; camY = 0; camZ = 1;
}

/**
 * Load one of four pre-built scenarios.
 * @param {string} name  'solar' | 'binary' | 'cluster' | 'galaxy'
 */
function loadDemo(name = 'solar') {
  clearAll();
  const cx = W/2, cy = H/2;   // world centre

  // ── Solar System ────────────────────────────────────────────
  // Central black hole with four orbiting bodies, one moon,
  // an asteroid belt, and a long-period comet.
  if (name === 'solar') {
    bodies.push(mkB(cx, cy, 0, 0, 'black'));

    // [orbital radius, speed, type]
    [
      [ 88, 2.25, 'planet'],
      [148, 1.68, 'planet'],
      [218, 1.32, 'star'  ],
      [295, 1.08, 'planet'],
    ].forEach(([r, sp, t]) => {
      const a = Math.random() * Math.PI * 2;
      bodies.push(mkB(
        cx + Math.cos(a)*r, cy + Math.sin(a)*r,
        -Math.sin(a)*sp,     Math.cos(a)*sp, t
      ));
    });

    // Moon around the second planet
    const p2 = bodies[2], ma = Math.random()*Math.PI*2;
    bodies.push(mkB(
      p2.x + Math.cos(ma)*24, p2.y + Math.sin(ma)*24,
      p2.vx - Math.sin(ma)*1.1, p2.vy + Math.cos(ma)*1.1, 'moon'
    ));

    // Asteroid belt
    for (let i = 0; i < 10; i++) {
      const a = Math.random()*Math.PI*2, r = 345+Math.random()*60;
      bodies.push(mkB(cx+Math.cos(a)*r, cy+Math.sin(a)*r, -Math.sin(a)*0.86, Math.cos(a)*0.86, 'asteroid'));
    }

    // Long-period comet
    const ca = Math.random()*Math.PI*2;
    bodies.push(mkB(
      cx+Math.cos(ca)*430, cy+Math.sin(ca)*430,
      -Math.sin(ca)*1.50+0.30, Math.cos(ca)*1.50-0.25, 'comet'
    ));

  // ── Binary Black Holes ──────────────────────────────────────
  } else if (name === 'binary') {
    bodies.push(mkB(cx-130, cy,  0, -1.42, 'black'));
    bodies.push(mkB(cx+130, cy,  0,  1.42, 'black'));
    for (let i = 0; i < 14; i++) {
      const a = Math.random()*Math.PI*2, r = 290+Math.random()*100;
      const t = ['planet','asteroid','comet','moon'][~~(Math.random()*4)];
      bodies.push(mkB(cx+Math.cos(a)*r, cy+Math.sin(a)*r, -Math.sin(a)*1.1, Math.cos(a)*1.1, t));
    }

  // ── Star Cluster ─────────────────────────────────────────────
  } else if (name === 'cluster') {
    for (let i = 0; i < 8; i++) {
      const a = Math.random()*Math.PI*2, r = 50+Math.random()*160;
      const sp = 0.4+Math.random()*0.95, dir = Math.random()>0.5 ? 1 : -1;
      bodies.push(mkB(cx+Math.cos(a)*r, cy+Math.sin(a)*r, -Math.sin(a)*sp*dir, Math.cos(a)*sp*dir, 'star'));
    }
    for (let i = 0; i < 16; i++) {
      const a = Math.random()*Math.PI*2, r = 30+Math.random()*220;
      const sp = 0.3+Math.random()*1.30, dir = Math.random()>0.5 ? 1 : -1;
      const t = Math.random()>0.5 ? 'planet' : 'moon';
      bodies.push(mkB(cx+Math.cos(a)*r, cy+Math.sin(a)*r, -Math.sin(a)*sp*dir, Math.cos(a)*sp*dir, t));
    }

  // ── Galaxy Collision ─────────────────────────────────────────
  } else if (name === 'galaxy') {
    const off = Math.min(W,H)*0.27, v = 0.52;

    // Galaxy A — approaching from the left
    bodies.push(mkB(cx-off, cy, v, 0, 'star'));
    for (let i = 0; i < 10; i++) {
      const a = (i/10)*Math.PI*2, r = 40+Math.random()*55;
      const t = Math.random()>0.5 ? 'planet' : 'asteroid';
      bodies.push(mkB(cx-off+Math.cos(a)*r, cy+Math.sin(a)*r, v-Math.sin(a)*1.15, Math.cos(a)*1.15, t));
    }

    // Galaxy B — approaching from the right
    bodies.push(mkB(cx+off, cy, -v, 0, 'star'));
    for (let i = 0; i < 10; i++) {
      const a = (i/10)*Math.PI*2, r = 40+Math.random()*55;
      const t = Math.random()>0.5 ? 'planet' : 'asteroid';
      bodies.push(mkB(cx+off+Math.cos(a)*r, cy+Math.sin(a)*r, -v-Math.sin(a)*1.15, Math.cos(a)*1.15, t));
    }
  }
}
