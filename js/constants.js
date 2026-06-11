/* ============================================================
   constants.js — Simulation constants & body-type data
   ============================================================ */
'use strict';

// ── Physics constants ────────────────────────────────────
const G         = 0.5;    // Gravitational constant (scaled for simulation)
const TRAIL     = 60;     // Trail buffer length (frames stored per body)
const MAX_PARTS  = 800;   // Maximum live particles
const MAX_SHOCKS = 24;    // Maximum live shockwave rings
const MAX_NEBULAS= 16;    // Maximum live explosion nebulas

// ── Body type definitions ─────────────────────────────────
// mass    — determines gravitational pull strength
// radius  — initial visual & collision radius in pixels
// label   — displayed in the inspector panel
const TY = {
  planet:   { mass: 150,  radius: 10, label: '🪐 Planet'    },
  moon:     { mass: 20,   radius: 5,  label: '🌑 Moon'      },
  star:     { mass: 800,  radius: 14, label: '⭐ Star'       },
  black:    { mass: 6000, radius: 17, label: '⚫ Black Hole' },
  comet:    { mass: 60,   radius: 6,  label: '☄ Comet'      },
  asteroid: { mass: 35,   radius: 5,  label: '🪨 Asteroid'  },
};

// ── Planet visual schemes (5 procedural types) ────────────
// Each scheme defines:
//   base       — hex base colour used for the sphere gradient
//   trailColor — colour of the body's motion trail
//   atmo       — rgba string for the atmospheric halo (null = none)
//   mkFeatures — factory function returning an array of surface-feature
//                descriptors {dx,dy,r,col,type} — generated once at spawn
const PLANET_SCHEMES = [

  /* 0 — Oceanic (Earth-like) */
  {
    base: '#1a5a8a', trailColor: '#4a9fd4', atmo: 'rgba(80,160,255,0.28)',
    mkFeatures(r) {
      const f = [];
      const landPalette = ['#1f7a2f','#2a8640','#156030','#3a8044'];
      for (let i = 0; i < 2 + ~~(Math.random()*2); i++) {
        const a = Math.random()*Math.PI*2, d = Math.random()*r*0.42;
        f.push({ dx:Math.cos(a)*d, dy:Math.sin(a)*d, r:r*(0.22+Math.random()*0.38),
                 col:landPalette[~~(Math.random()*4)], type:'circle' });
      }
      // Polar ice caps
      f.push({ dx:0, dy:-r*0.70, r:r*0.42, col:'rgba(240,250,255,0.88)', type:'circle' });
      f.push({ dx:0, dy: r*0.72, r:r*0.36, col:'rgba(240,250,255,0.78)', type:'circle' });
      // Cloud cover
      for (let i = 0; i < 2; i++) {
        const a = Math.random()*Math.PI*2, d = Math.random()*r*0.5;
        f.push({ dx:Math.cos(a)*d, dy:Math.sin(a)*d, r:r*(0.16+Math.random()*0.20),
                 col:'rgba(255,255,255,0.5)', type:'circle' });
      }
      return f;
    }
  },

  /* 1 — Rocky (Mars-like) */
  {
    base: '#9c3522', trailColor: '#d4603a', atmo: 'rgba(200,80,40,0.18)',
    mkFeatures(r) {
      const f = [];
      for (let i = 0; i < 4 + ~~(Math.random()*3); i++) {
        const a = Math.random()*Math.PI*2, d = Math.random()*r*0.68;
        const cr = r*(0.10 + Math.random()*0.22);
        f.push({ dx:Math.cos(a)*d, dy:Math.sin(a)*d, r:cr,      col:'rgba(90,22,10,0.65)',  type:'circle' });
        f.push({ dx:Math.cos(a)*d+cr*0.1, dy:Math.sin(a)*d+cr*0.1, r:cr*0.62, col:'rgba(60,14,6,0.5)', type:'circle' });
      }
      return f;
    }
  },

  /* 2 — Desert (Venus-like) */
  {
    base: '#c07828', trailColor: '#e0a040', atmo: 'rgba(255,190,50,0.30)',
    mkFeatures(r) {
      const f = [];
      for (let i = 0; i < 3; i++) {
        f.push({ dy:(i-1)*r*0.55, h:r*(0.30+Math.random()*0.20),
                 col:`rgba(210,155,${50+i*20},0.42)`, type:'band' });
      }
      for (let i = 0; i < 2; i++) {
        const a = Math.random()*Math.PI*2, d = Math.random()*r*0.5;
        f.push({ dx:Math.cos(a)*d, dy:Math.sin(a)*d, r:r*(0.16+Math.random()*0.22),
                 col:'rgba(240,215,140,0.45)', type:'circle' });
      }
      return f;
    }
  },

  /* 3 — Ice (Europa / Pluto-like) */
  {
    base: '#b8d8ee', trailColor: '#90bcd8', atmo: 'rgba(160,220,255,0.22)',
    mkFeatures(r) {
      const f = [];
      for (let i = 0; i < 3 + ~~(Math.random()*3); i++) {
        const a = Math.random()*Math.PI*2, d = Math.random()*r*0.65;
        f.push({ dx:Math.cos(a)*d, dy:Math.sin(a)*d, r:r*(0.08+Math.random()*0.18),
                 col:'rgba(80,140,200,0.60)', type:'circle' });
      }
      f.push({ dx:0, dy:0, r:r*0.35, col:'rgba(255,255,255,0.40)', type:'circle' });
      return f;
    }
  },

  /* 4 — Gas Giant (Jupiter-like) */
  {
    base: '#c08840', trailColor: '#d4a860', atmo: 'rgba(200,140,60,0.20)',
    mkFeatures(r) {
      const f = [];
      const bands = ['rgba(200,130,60,0.55)','rgba(160,90,30,0.50)','rgba(230,170,90,0.45)','rgba(140,75,25,0.50)','rgba(210,150,70,0.40)'];
      for (let i = 0; i < 5; i++) {
        f.push({ dy:(i-2)*r*0.36, h:r*(0.22+Math.random()*0.16), col:bands[i], type:'band' });
      }
      // Great Red Spot analogue
      f.push({ dx:r*0.22, dy:r*0.12, r:r*0.20, col:'rgba(185,65,30,0.75)',  type:'circle' });
      f.push({ dx:r*0.22, dy:r*0.12, r:r*0.12, col:'rgba(215,95,50,0.60)',  type:'circle' });
      return f;
    }
  }
];

// ── Moon visual scheme ────────────────────────────────────
const MOON_SCHEME = {
  base: '#909098', trailColor: '#9ca3af', atmo: null,
  mkFeatures(r) {
    const f = [];
    for (let i = 0; i < 4 + ~~(Math.random()*4); i++) {
      const a = Math.random()*Math.PI*2, d = Math.random()*r*0.68;
      const cr = r*(0.10 + Math.random()*0.28);
      f.push({ dx:Math.cos(a)*d, dy:Math.sin(a)*d, r:cr,       col:'rgba(65,65,75,0.60)',  type:'circle' });
      f.push({ dx:Math.cos(a)*d, dy:Math.sin(a)*d, r:cr*0.65,  col:'rgba(45,45,55,0.50)',  type:'circle' });
    }
    return f;
  }
};

// ── Asteroid visual scheme ────────────────────────────────
const ASTEROID_SCHEME = {
  base: '#5a4535', trailColor: '#f97316', atmo: null,
  mkFeatures(r) {
    const f = [];
    for (let i = 0; i < 3 + ~~(Math.random()*3); i++) {
      const a = Math.random()*Math.PI*2, d = Math.random()*r*0.55;
      f.push({ dx:Math.cos(a)*d, dy:Math.sin(a)*d, r:r*(0.10+Math.random()*0.20),
               col:'rgba(40,28,18,0.55)', type:'circle' });
    }
    return f;
  }
};
