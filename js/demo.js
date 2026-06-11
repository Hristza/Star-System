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
    const bh = mkB(cx, cy, 0, 0, 'black');
    bodies.push(bh);

    // Circular-orbit speed around the central black hole at distance r.
    // Uses the SAME softening (+80) as physics.js, so the orbit is genuinely
    // stable instead of spiralling inward:
    //     v = √( G · M · r / (r² + 80) )
    const vCirc = r => Math.sqrt(G * bh.mass * r / (r*r + 80));

    // [orbital radius, type] — speed is COMPUTED for a stable circular orbit
    [
      [ 88, 'planet'],
      [148, 'planet'],
      [218, 'star'  ],
      [295, 'planet'],
    ].forEach(([r, t]) => {
      const a  = Math.random() * Math.PI * 2;
      const sp = vCirc(r);
      bodies.push(mkB(
        cx + Math.cos(a)*r, cy + Math.sin(a)*r,
        -Math.sin(a)*sp,     Math.cos(a)*sp, t
      ));
    });

    // Moon around the second planet — circular orbit around the PLANET's mass,
    // added on top of the planet's own velocity so it travels with it.
    const p2 = bodies[2], ma = Math.random()*Math.PI*2;
    const vMoon = Math.sqrt(G * p2.mass * 24 / (24*24 + 80));
    bodies.push(mkB(
      p2.x + Math.cos(ma)*24, p2.y + Math.sin(ma)*24,
      p2.vx - Math.sin(ma)*vMoon, p2.vy + Math.cos(ma)*vMoon, 'moon'
    ));

    // Asteroid belt — each asteroid on its own stable circular orbit
    for (let i = 0; i < 10; i++) {
      const a = Math.random()*Math.PI*2, r = 345+Math.random()*60;
      const sp = vCirc(r);
      bodies.push(mkB(cx+Math.cos(a)*r, cy+Math.sin(a)*r, -Math.sin(a)*sp, Math.cos(a)*sp, 'asteroid'));
    }

    // Long-period comet — deliberately elliptical (0.85× circular speed) so it
    // sweeps in and back out, but fast enough NOT to plunge into the black hole.
    const ca = Math.random()*Math.PI*2, rc = 430;
    const sc = vCirc(rc) * 0.85;
    bodies.push(mkB(
      cx+Math.cos(ca)*rc, cy+Math.sin(ca)*rc,
      -Math.sin(ca)*sc, Math.cos(ca)*sc, 'comet'
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
