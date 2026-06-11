/* ============================================================
   physics.js — N-body gravity, collision detection, and movement

   Algorithm overview (one call to step()):
     1. Gravity pass  — compute net acceleration on every live body
                        using Newton's law: F = G·m₁·m₂ / (d²+ε)
                        ε = 80  (softening factor prevents ∞ at d≈0)
     2. Velocity pass — apply accumulated acceleration to velocity
     3. Collision pass — detect overlapping pairs and resolve:
                          • black hole → swallow smaller body
                          • anything else → merge (conserve momentum)
     4. Movement pass — integrate velocity into position, bounce off
                        walls if enabled, push current position to trail

   Complexity: O(n²) — acceptable for the expected body count (< 50).
   Optimisation: body pairs with d > 700 px are skipped unless one
   is a black hole or star (which have unlimited gravitational range).
   ============================================================ */
'use strict';

function step() {
  const n = bodies.length;
  if (n === 0) return;

  // Pre-allocate acceleration accumulators (zeroed by Float64Array)
  const ax = new Float64Array(n);
  const ay = new Float64Array(n);

  const CUT2 = 700 * 700;   // squared distance cutoff for non-massive pairs

  // ── 1. Gravity pass ────────────────────────────────────────
  for (let i = 0; i < n; i++) {
    if (!bodies[i].alive) continue;
    for (let j = i + 1; j < n; j++) {
      if (!bodies[j].alive) continue;

      const bi = bodies[i], bj = bodies[j];
      const dx = bj.x - bi.x, dy = bj.y - bi.y;
      const d2 = dx*dx + dy*dy;

      // Skip distant pairs unless at least one body has unlimited range
      const massive = bi.type==='black' || bj.type==='black' ||
                      bi.type==='star'  || bj.type==='star';
      if (d2 > CUT2 && !massive) continue;

      const d = Math.sqrt(d2) || 1;
      if (d < bi.radius + bj.radius) continue;  // will be handled in collision pass

      // Newton: F/m = G·m_other / (d²+softening)
      const Fij = G * bj.mass / (d2 + 80);
      ax[i] += Fij * dx/d;  ay[i] += Fij * dy/d;

      const Fji = G * bi.mass / (d2 + 80);
      ax[j] -= Fji * dx/d;  ay[j] -= Fji * dy/d;
    }
  }

  // ── 2. Velocity pass ───────────────────────────────────────
  for (let i = 0; i < n; i++) {
    if (!bodies[i].alive) continue;
    bodies[i].vx += ax[i];
    bodies[i].vy += ay[i];
  }

  // ── 3. Collision pass ──────────────────────────────────────
  for (let i = 0; i < n; i++) {
    if (!bodies[i].alive) continue;
    for (let j = i + 1; j < n; j++) {
      if (!bodies[j].alive) continue;

      const bi = bodies[i], bj = bodies[j];
      const dx = bj.x - bi.x, dy = bj.y - bi.y;
      const d  = Math.sqrt(dx*dx + dy*dy) || 1;
      if (d >= bi.radius + bj.radius) continue;   // no overlap → skip

      const bigFirst = bi.mass >= bj.mass;
      const big = bigFirst ? bi : bj;
      const sml = bigFirst ? bj : bi;

      if (big.type === 'black' || sml.type === 'black') {
        // Black hole swallows the other body regardless of mass
        kill(big.type === 'black' ? sml : big, 'swallow');

      } else {
        // Regular merge — conservation of momentum:
        //   p_total = m1·v1 + m2·v2  →  v_new = p_total / (m1+m2)
        const m1 = big.mass, m2 = sml.mass, mt = m1 + m2;
        big.vx = (big.vx*m1 + sml.vx*m2) / mt;
        big.vy = (big.vy*m1 + sml.vy*m2) / mt;
        big.mass   = mt;
        // New radius — volume is conserved: V ∝ r³  →  r_new = ∛(r1³ + r2³)
        big.radius = Math.min(48, Math.cbrt(big.radius**3 + sml.radius**3));

        // Spawn effects
        if (sml.type === 'star' || big.type === 'star') {
          // Supernova!
          spP(sml.x,sml.y, 55, ['#fff','#fbbf24','#f97316','#fff9c4','#fed7aa'], 11, 75);
          spS(sml.x,sml.y, '#fbbf24', 200);
          spN(sml.x,sml.y, '#fbbf24');
          spN(sml.x,sml.y, '#f97316');
        } else {
          spP(sml.x,sml.y, 18, ['#fff', big.color, sml.color], 5, 34);
          spS(sml.x,sml.y, big.color, 100);
          spN(sml.x,sml.y, big.color);
        }

        kill(sml, 'merge');
        merges++;
      }
    }
  }

  // ── 4. Movement pass ───────────────────────────────────────
  for (let i = 0; i < n; i++) {
    const b = bodies[i];
    if (!b.alive) continue;

    // Euler integration: x += vx, y += vy
    pushTrail(b);
    b.x += b.vx;  b.y += b.vy;
    b.age++;

    // Wall bounce with damping coefficient 0.75
    if (bounceOn) {
      if (b.x - b.radius < 0) { b.x = b.radius;   b.vx =  Math.abs(b.vx)*0.75; spP(b.x,b.y,3,[b.color],2,10); }
      if (b.x + b.radius > W) { b.x = W-b.radius;  b.vx = -Math.abs(b.vx)*0.75; spP(b.x,b.y,3,[b.color],2,10); }
      if (b.y - b.radius < 0) { b.y = b.radius;   b.vy =  Math.abs(b.vy)*0.75; spP(b.x,b.y,3,[b.color],2,10); }
      if (b.y + b.radius > H) { b.y = H-b.radius;  b.vy = -Math.abs(b.vy)*0.75; spP(b.x,b.y,3,[b.color],2,10); }
    }
  }

  // Remove dead bodies at the end of the step to keep indices stable above
  bodies = bodies.filter(b => b.alive);
}
