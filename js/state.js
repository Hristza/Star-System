/* ============================================================
   state.js — All mutable global state for the simulation
   All variables here are read/written by multiple modules.
   ============================================================ */
'use strict';

// ── Canvas references (assigned in main.js after DOM ready) ──
let cv = document.getElementById('c');
let ct = cv.getContext('2d');

// ── Viewport dimensions (updated by resize in main.js) ───────
let W = 0, H = 0;
let started = false;

// ── Cached background assets (invalidated on resize/clear) ───
let bgStars   = null;   // array of star descriptors
let bgNebulas = null;   // array of background nebula patches

// ── Simulation object arrays ──────────────────────────────────
let bodies  = [];   // active celestial bodies
let parts   = [];   // explosion / collision particles
let shocks  = [];   // expanding shockwave rings
let nebulas = [];   // explosion nebula clouds
let prings  = [];   // pulsar rings (unused slot for future effects)

// ── Scoreboard counters ───────────────────────────────────────
let merges    = 0;
let swallowed = 0;

// ── Interaction state ─────────────────────────────────────────
let mode      = 'planet';  // currently selected body type
let drag      = false;     // true while user is dragging to launch a body
let dragStart = null;      // {x,y} screen coords where drag began
let mouse     = null;      // {x,y} current mouse/touch screen coords
let selected  = null;      // currently inspected body (or null)
let _bodyId   = 0;         // auto-increment ID counter for bodies

// ── Simulation settings ───────────────────────────────────────
let bounceOn    = true;   // whether bodies bounce off viewport walls
let simSpeed    = 1;      // physics steps per animation frame (1–4)
let paused      = false;  // whether the simulation is frozen
let showVectors = false;  // whether velocity arrows are drawn

// ── Pan state (used by controls.js) ──────────────────────────
let panStart    = null;   // {x,y} screen coords where right-drag started
let panStartCam = null;   // {x,y} camera pan values at drag start
