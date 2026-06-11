/* ============================================================
   effects.js — Particles, shockwaves, nebulas, and trail management

   Three effect types:
     parts   — small glowing debris particles with friction decay
     shocks  — expanding ring shockwaves (drawn as stroked arcs)
     nebulas — expanding translucent colour blobs from explosions
   ============================================================ */
'use strict';

// ── Trail ────────────────────────────────────────────────────

/**
 * Push the body's current position into its ring-buffer trail.
 * The buffer stores the last TRAIL positions as (x, y) float pairs.
 */
function pushTrail(b) {
  const i = b.tHead * 2;
  b.trail[i]   = b.x;
  b.trail[i+1] = b.y;
  b.tHead = (b.tHead + 1) % TRAIL;
  if (b.tLen < TRAIL) b.tLen++;
}

// ── Particle spawner ─────────────────────────────────────────

/**
 * Spawn `n` debris particles at world position (x,y).
 * @param {string[]} cols  Array of CSS colour strings to pick from randomly
 * @param {number}   spd   Maximum speed of particles
 * @param {number}   life  Lifetime in simulation ticks
 */
function spP(x, y, n, cols, spd, life) {
  if (!isFinite(x) || !isFinite(y)) return;
  const room = MAX_PARTS - parts.length;
  if (room <= 0) return;
  const cnt = Math.min(n, room);
  for (let i = 0; i < cnt; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = spd * (0.3 + Math.random() * 0.7);
    parts.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life, maxLife: life,
      col: cols[~~(Math.random() * cols.length)],
      r:   1.5 + Math.random() * 2.5,
    });
  }
}

// ── Shockwave spawner ─────────────────────────────────────────

/**
 * Spawn an expanding ring shockwave at (x,y).
 * @param {string} col  CSS colour for the ring stroke
 * @param {number} mR   Maximum radius before the ring disappears
 */
function spS(x, y, col, mR) {
  if (!isFinite(x) || !isFinite(y) || shocks.length >= MAX_SHOCKS) return;
  shocks.push({ x, y, r: 8, maxR: mR || 120, color: col, life: 1 });
}

// ── Nebula spawner ────────────────────────────────────────────

/**
 * Spawn an expanding translucent colour blob at (x,y).
 * Used to create the glowing cloud left behind after a merge or supernova.
 */
function spN(x, y, col) {
  if (!isFinite(x) || !isFinite(y) || nebulas.length >= MAX_NEBULAS) return;
  nebulas.push({
    x, y, r: 1,
    maxR: 100 + Math.random() * 50,
    color: col, life: 1,
    spd: 1.2 + Math.random() * 0.9,
  });
}

// ── Kill a body ───────────────────────────────────────────────

/**
 * Mark a body as dead and spawn appropriate effects.
 * @param {string} cause  'swallow' | 'merge'
 */
function kill(b, cause) {
  if (!b.alive) return;
  b.alive = false;
  if (b === selected) selected = null;

  if (cause === 'swallow') {
    // Purple vortex effect for black-hole consumption
    spP(b.x, b.y, 40, ['#c084fc','#7c3aed','#a855f7','#e879f9','#fff'], 7, 55);
    spS(b.x, b.y, '#7c3aed', 75);
    swallowed++;
  }
  // Merge visual effects are spawned directly in physics.js step()
}

// ── Per-frame effect tick ─────────────────────────────────────

/**
 * Advance all active effects by one simulation tick.
 * Called once per frame in main.js loop(), before draw().
 */
function tickFX() {
  // Drain particles faster when there are many (performance safety valve)
  const drain = parts.length > 450 ? 3 : parts.length > 220 ? 2 : 1;

  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.x  += p.vx;  p.y  += p.vy;
    p.vx *= 0.965; p.vy *= 0.965;   // air-friction damping
    p.life -= drain;
    if (p.life <= 0) parts.splice(i, 1);
  }

  for (let i = shocks.length - 1; i >= 0; i--) {
    const s = shocks[i];
    s.r   += 8;
    s.life = 1 - s.r / s.maxR;
    if (s.r >= s.maxR) shocks.splice(i, 1);
  }

  for (let i = nebulas.length - 1; i >= 0; i--) {
    const n = nebulas[i];
    n.r   += n.spd;
    n.life = 1 - n.r / n.maxR;
    if (n.r >= n.maxR) nebulas.splice(i, 1);
  }

  for (let i = prings.length - 1; i >= 0; i--) {
    const p = prings[i];
    p.r   += 7;
    p.life = 1 - p.r / p.maxR;
    if (p.r >= p.maxR) prings.splice(i, 1);
  }
}
