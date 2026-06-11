/* ============================================================
   bodies.js — Body creation and visual assignment

   Each body is a plain object with physics state (x, y, vx, vy,
   mass, radius) and visual state (color, viz scheme, vizFeatures).
   ============================================================ */
'use strict';

// ── Colour utilities ──────────────────────────────────────────

/** Convert a number 0–255 to a 2-digit hex string (e.g. 182 → "b6"). */
function hx(n) {
  return Math.max(0, Math.min(255, ~~n)).toString(16).padStart(2, '0');
}

/**
 * Shift the brightness of a hex colour by `delta` (positive = lighter).
 * Used to build the sphere highlight / shadow gradient on planet surfaces.
 */
function shiftBright(hex, delta) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return '#' + hx(r+delta) + hx(g+delta) + hx(b+delta);
}

// ── Visual assignment ─────────────────────────────────────────

/**
 * Assign a visual scheme and generate surface features for a body.
 * This is called once at spawn — feature positions are random but
 * fixed for the body's lifetime (no re-generation on every frame).
 *
 * Sets b.viz (scheme reference) and b.vizFeatures (feature array).
 * Also sets b.color to the scheme's trail colour.
 */
function assignViz(b) {
  // Stars, black holes, and comets have bespoke draw functions.
  if (b.type === 'star' || b.type === 'black' || b.type === 'comet') return;

  if (b.type === 'moon') {
    b.viz = MOON_SCHEME;
  } else if (b.type === 'asteroid') {
    b.viz = ASTEROID_SCHEME;
  } else {
    // Pick one of the 5 planet visual variants at random
    b.viz = PLANET_SCHEMES[~~(Math.random() * PLANET_SCHEMES.length)];
  }

  b.color       = b.viz.trailColor;
  b.vizFeatures = b.viz.mkFeatures(b.radius);
}

// ── Body factory ─────────────────────────────────────────────

/**
 * Create and return a new celestial body.
 *
 * @param {number} x     World X position
 * @param {number} y     World Y position
 * @param {number} vx    Initial horizontal velocity
 * @param {number} vy    Initial vertical velocity
 * @param {string} type  One of: 'planet' | 'moon' | 'star' | 'black' | 'comet' | 'asteroid'
 */
function mkB(x, y, vx, vy, type) {
  const t = TY[type];

  // Fallback trail colours for types without a viz scheme
  const defaults = {
    planet:'#4a9fd4', moon:'#9ca3af', star:'#fbbf24',
    black:'#7c3aed',  comet:'#34d399', asteroid:'#f97316',
  };

  const b = {
    id:    _bodyId++,
    x, y, vx, vy,
    mass:   t.mass,
    radius: t.radius,
    color:  defaults[type],
    type,
    // Trail buffer — ring buffer of (x,y) pairs stored as Float32Array
    trail:  new Float32Array(TRAIL * 2),
    tHead:  0,    // write pointer into the ring buffer
    tLen:   0,    // number of valid points currently stored (0 → TRAIL)
    age:    0,    // frame counter since spawn
    alive:  true,
    // Visual scheme (set by assignViz for planet/moon/asteroid)
    viz:         null,
    vizFeatures: null,
  };

  assignViz(b);
  return b;
}
