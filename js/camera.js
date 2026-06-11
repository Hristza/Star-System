/* ============================================================
   camera.js — Zoom & pan camera system

   World coordinate system: (0,0) → (W,H), same as body positions.
   Screen coordinate system: what the user sees on their display.

   Transformations:
     Screen → World : s2w(sx, sy)
     World  → Screen: sx = (wx - W/2 + camX)*camZ + W/2
   ============================================================ */
'use strict';

// ── Camera state ─────────────────────────────────────────────
let camX = 0;   // horizontal pan offset in screen pixels
let camY = 0;   // vertical   pan offset in screen pixels
let camZ = 1;   // zoom scale  (1.0 = 100%, range 0.12 – 10)

/**
 * Convert screen-space coordinates to world-space.
 * Used when translating mouse/touch input into body spawn positions.
 */
function s2w(sx, sy) {
  return {
    x: (sx - W/2 - camX) / camZ + W/2,
    y: (sy - H/2 - camY) / camZ + H/2,
  };
}

/**
 * Apply the camera transform to the 2D rendering context.
 * Call ct.save() before and ct.restore() after all world-space drawing.
 *
 * Transform order (applied right-to-left by Canvas API):
 *   1. Translate by (-W/2, -H/2)           — move world origin to screen centre
 *   2. Scale by camZ                        — zoom
 *   3. Translate by (W/2 + camX, H/2 + camY) — pan + re-centre
 */
function applyCam() {
  ct.translate(W/2 + camX, H/2 + camY);
  ct.scale(camZ, camZ);
  ct.translate(-W/2, -H/2);
}
