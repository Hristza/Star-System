/* ============================================================
   main.js — Canvas setup, main animation loop, and initialisation

   Entry point:  requestAnimationFrame(init)  at bottom of file.

   Loop cadence:
     Each animation frame (~16 ms at 60 fps):
       if not paused → run step() × simSpeed  +  tickFX()
       always        → draw()
   ============================================================ */
'use strict';

// ── Canvas resize ─────────────────────────────────────────────

/**
 * Synchronise the canvas pixel buffer to the current CSS size.
 * Multiplies by devicePixelRatio so the simulation looks sharp on
 * HiDPI / Retina displays. Invalidates background star caches so
 * they are regenerated to fill the new viewport size.
 */
function resize() {
  const wrap = document.getElementById('canvas-wrap');
  const r    = wrap.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return;
  W = r.width;
  H = r.height;
  cv.width  = Math.round(W * devicePixelRatio);
  cv.height = Math.round(H * devicePixelRatio);
  ct.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  bgStars   = null;   // force regeneration at new dimensions
  bgNebulas = null;
}

window.addEventListener('resize', resize);

// ── Main animation loop ───────────────────────────────────────

/**
 * Called by requestAnimationFrame before every screen repaint.
 * Adaptive throttle: when there are many bodies or particles,
 * only one physics step is run per frame to maintain smooth rendering.
 */
function loop() {
  if (!paused) {
    const heavy = bodies.length > 38 || parts.length > 350;
    const steps = heavy ? 1 : simSpeed;
    for (let i = 0; i < steps; i++) step();
    tickFX();
  }
  draw();
  requestAnimationFrame(loop);
}

// ── Initialisation ────────────────────────────────────────────

/**
 * One-time startup:
 *   1. Size the canvas.
 *   2. Load the Solar System demo scene.
 *   3. Start the animation loop.
 *
 * If the canvas container has zero size (not yet laid out by the browser),
 * we defer to the next frame and try again.
 */
function init() {
  resize();
  if (W === 0 || H === 0) { requestAnimationFrame(init); return; }
  loadDemo('solar');
  if (!started) { started = true; requestAnimationFrame(loop); }
}

requestAnimationFrame(init);
