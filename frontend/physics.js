// Shared Schwarzschild physics helpers. Units: G = c = 1, mass M in arbitrary
// simulation units. Schwarzschild radius r_s = 2M, photon sphere r_ph = 3M,
// critical impact parameter b_crit = 3*sqrt(3)*M.

const Physics = {
  rs(M) { return 2 * M; },
  photonSphere(M) { return 3 * M; },
  bCrit(M) { return 3 * Math.sqrt(3) * M; },

  // Integrate the null-geodesic orbit equation in the equatorial plane using
  // u = 1/r, d^2u/dphi^2 = -u + 3*M*u^2 (RK4 in phi).
  // Returns { points: [{r, phi}], outcome: "escape" | "capture" | "orbit" }
  tracePhoton(M, b, opts = {}) {
    const dphi = opts.dphi ?? 0.01;
    const maxPhi = opts.maxPhi ?? 60;
    const rEscape = opts.rEscape ?? 60 * M;
    const rs = this.rs(M);

    let u = 1 / (opts.r0 ?? 1000 * M);
    let du = -1 / b; // incoming ray, du/dphi at large r ~ -1/b
    const points = [];
    let phi = 0;
    let outcome = "orbit";

    const deriv = (uu) => 3 * M * uu * uu - uu;

    for (let i = 0; i < maxPhi / dphi; i++) {
      const r = 1 / u;
      points.push({ r, phi });

      if (r <= rs * 1.001) { outcome = "capture"; break; }
      if (r >= rEscape && i > 5) { outcome = "escape"; break; }

      // RK4 step for the system (u, du)
      const k1u = du;
      const k1du = deriv(u);
      const k2u = du + (dphi / 2) * k1du;
      const k2du = deriv(u + (dphi / 2) * k1u);
      const k3u = du + (dphi / 2) * k2du;
      const k3du = deriv(u + (dphi / 2) * k2u);
      const k4u = du + dphi * k3du;
      const k4du = deriv(u + dphi * k3u);

      u += (dphi / 6) * (k1u + 2 * k2u + 2 * k3u + k4u);
      du += (dphi / 6) * (k1du + 2 * k2du + 2 * k3du + k4du);
      phi += dphi;

      if (u <= 0) { outcome = "escape"; break; }
    }
    return { points, outcome };
  },

  // Numeric deflection angle for a photon with impact parameter b around
  // mass M, found by tracing until escape and reading off the asymptotic
  // direction change relative to a straight line (Newtonian baseline = 0).
  deflectionAngle(M, b) {
    if (b <= this.bCrit(M) * 1.0001) return null; // captured, undefined
    const { points, outcome } = this.tracePhoton(M, b, { maxPhi: 40, dphi: 0.005 });
    if (outcome !== "escape") return null;
    const last = points[points.length - 1];
    // total turning phi minus pi is the deflection (straight line sweeps pi)
    return last.phi - Math.PI;
  },

  // Weak-field analytic approximation, valid for b >> M: alpha = 4M / b
  deflectionWeakField(M, b) {
    return (4 * M) / b;
  },
};


// ── Gravitational redshift & time dilation (Schwarzschild) ─────────────────
// All formulas assume G = c = 1, distances in units of M.
//
//   Metric factor at radius r from a BH of mass M:
//     f(r) = 1 - r_s / r  =  1 - 2M / r
//
//   Gravitational redshift  (photon emitted at r observed at infinity):
//     z(r) = 1 / sqrt(f(r))  - 1
//     Equivalently: lambda_obs / lambda_emit = 1 / sqrt(1 - 2M/r)
//
//   Proper time dilation (clock at r vs. clock at infinity):
//     tau / t = sqrt(f(r))  =  sqrt(1 - 2M/r)
//
//   Combined (emitter at r_e, observer at r_o):
//     z_12 = sqrt(f(r_o) / f(r_e)) - 1
Physics.metricFactor = function (M, r) {
  // f = 1 - 2M/r; clamps to 0 at / inside the horizon
  return Math.max(0, 1 - (2 * M) / r);
};

// Gravitational redshift as seen from infinity (r_observer → ∞)
// Returns z ≥ 0 (z → ∞ at the event horizon)
Physics.gravitationalRedshift = function (M, r) {
  const rs = this.rs(M); // 2M
  if (r <= rs) return Infinity;
  return 1 / Math.sqrt(1 - rs / r) - 1;
};

// Proper-time / coordinate-time ratio for a stationary clock at radius r
// Returns value in [0, 1]; → 0 at event horizon (time freezes)
Physics.timeDilation = function (M, r) {
  const rs = this.rs(M);
  if (r <= rs) return 0;
  return Math.sqrt(1 - rs / r);
};

// Blueshift / redshift between two radii (r_emitter → r_observer)
// Positive z → redshift (light climbing out of gravity well),
// Negative z → blueshift (light falling in)
Physics.redshiftBetween = function (M, r_emit, r_obs) {
  const f_e = this.metricFactor(M, r_emit);
  const f_o = this.metricFactor(M, r_obs);
  if (f_e <= 0) return Infinity;
  return Math.sqrt(f_o / f_e) - 1;
};

// Wavelength ratio lambda_obs / lambda_emit for a photon from r_emit → r_obs
Physics.wavelengthRatio = function (M, r_emit, r_obs) {
  return 1 + this.redshiftBetween(M, r_emit, r_obs);
};


// ═══════════════════════════════════════════════════════════════════════════
// Ported from Python ray tracer:  models/black_hole.py
// ═══════════════════════════════════════════════════════════════════════════

// Escape velocity at radius r from a black hole of mass M.
// Units: G = c = 1 → v_esc = sqrt(2M / r).  Returns fraction of c.
Physics.escapeVelocity = function (M, r) {
  if (r <= 0) return Infinity;
  return Math.sqrt((2 * M) / r);
};

// ISCO — Innermost Stable Circular Orbit = 3 × Rs = 6M
Physics.isco = function (M) {
  return 3 * this.rs(M);   // = 6M
};

// Full black-hole summary dict (mirrors BlackHole.summary() in Python)
Physics.summary = function (M) {
  return {
    mass: M,
    schwarzschildRadius: this.rs(M),
    photonSphere: this.photonSphere(M),
    isco: this.isco(M),
    escapeVelocity: this.escapeVelocity(M, this.rs(M)),
  };
};


// ═══════════════════════════════════════════════════════════════════════════
// Ported from Python ray tracer:  physics/schwarzschild_metric.py
// ═══════════════════════════════════════════════════════════════════════════

// Full Schwarzschild metric tensor g_{μν} at coordinates (r, θ).
// Returns a 4×4 nested array:
//   [0] → t,  [1] → r,  [2] → θ,  [3] → φ
Physics.metricTensor = function (M, r, theta) {
  const Rs = this.rs(M);        // 2M
  const f = 1 - Rs / r;
  const sinTh = Math.sin(theta);

  return [
    [-f,    0,      0,                     0],
    [ 0,  1/f,      0,                     0],
    [ 0,    0,   r*r,                      0],
    [ 0,    0,      0,  (r * sinTh) * (r * sinTh)]
  ];
};

// Inverse metric tensor g^{μν} (diagonal → just invert each element)
Physics.inverseMetric = function (M, r, theta) {
  const Rs = this.rs(M);
  const f = 1 - Rs / r;
  const sinTh = Math.sin(theta);
  const rSinTh = r * sinTh;

  return [
    [-1/f,  0,       0,                          0],
    [  0,   f,       0,                          0],
    [  0,   0,   1/(r*r),                        0],
    [  0,   0,       0,   1/(rSinTh * rSinTh)]
  ];
};


// ═══════════════════════════════════════════════════════════════════════════
// Ported from Python ray tracer:  physics/christoffel.py
// ═══════════════════════════════════════════════════════════════════════════

// Compute the non-zero Christoffel symbols Γ^λ_{μν} for Schwarzschild
// spacetime at coordinates (r, θ).
//
// Returns a flat Float64Array of length 64 (4×4×4), indexed as
//   gamma[λ*16 + μ*4 + ν].
// Coordinates: (0=t, 1=r, 2=θ, 3=φ).
Physics.christoffel = function (M, r, theta) {
  const Rs = this.rs(M);           // 2M
  const f = 1 - Rs / r;
  const sinTh = Math.sin(theta);
  const cosTh = Math.cos(theta);
  const tanTh = Math.tan(theta);

  const gamma = new Float64Array(64);     // all zeros

  // Helper to set gamma[lam][mu][nu]
  const set = (lam, mu, nu, val) => { gamma[lam * 16 + mu * 4 + nu] = val; };

  // Γ^t_{tr} = Γ^t_{rt}
  const g_ttr = Rs / (2 * r * r * f);
  set(0, 0, 1, g_ttr);
  set(0, 1, 0, g_ttr);

  // Γ^r_{tt}
  set(1, 0, 0, Rs * f / (2 * r * r));

  // Γ^r_{rr}
  set(1, 1, 1, -Rs / (2 * r * r * f));

  // Γ^r_{θθ}
  set(1, 2, 2, -r * f);

  // Γ^r_{φφ}
  set(1, 3, 3, -r * f * sinTh * sinTh);

  // Γ^θ_{rθ} = Γ^θ_{θr}
  set(2, 1, 2, 1 / r);
  set(2, 2, 1, 1 / r);

  // Γ^φ_{rφ} = Γ^φ_{φr}
  set(3, 1, 3, 1 / r);
  set(3, 3, 1, 1 / r);

  // Γ^θ_{φφ}
  set(2, 3, 3, -sinTh * cosTh);

  // Γ^φ_{θφ} = Γ^φ_{φθ}
  const cotTh = 1 / tanTh;
  set(3, 2, 3, cotTh);
  set(3, 3, 2, cotTh);

  return gamma;
};

// Human-readable list of non-zero Christoffel symbols.
// Returns [{lambda, mu, nu, value}, …] (coordinate names included).
Physics.christoffelNonZero = function (M, r, theta) {
  const gamma = this.christoffel(M, r, theta);
  const names = ['t', 'r', 'θ', 'φ'];
  const entries = [];

  for (let lam = 0; lam < 4; lam++) {
    for (let mu = 0; mu < 4; mu++) {
      for (let nu = 0; nu < 4; nu++) {
        const val = gamma[lam * 16 + mu * 4 + nu];
        if (Math.abs(val) > 1e-12) {
          entries.push({
            lambda: lam, mu: mu, nu: nu,
            label: `Γ[${names[lam]},${names[mu]},${names[nu]}]`,
            value: val
          });
        }
      }
    }
  }
  return entries;
};


// ═══════════════════════════════════════════════════════════════════════════
// Ported from Python ray tracer:  physics/integrator.py
// ═══════════════════════════════════════════════════════════════════════════

// Generic 4th-order Runge-Kutta step.
//   derivsFn(state) → array of derivatives (same length as state)
//   state: number[] or Float64Array
//   h: step size
// Returns a NEW array with the updated state.
Physics.rk4Step = function (derivsFn, state, h) {
  const n = state.length;

  const k1 = derivsFn(state);

  const s2 = new Float64Array(n);
  for (let i = 0; i < n; i++) s2[i] = state[i] + 0.5 * h * k1[i];
  const k2 = derivsFn(s2);

  const s3 = new Float64Array(n);
  for (let i = 0; i < n; i++) s3[i] = state[i] + 0.5 * h * k2[i];
  const k3 = derivsFn(s3);

  const s4 = new Float64Array(n);
  for (let i = 0; i < n; i++) s4[i] = state[i] + h * k3[i];
  const k4 = derivsFn(s4);

  const result = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    result[i] = state[i] + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  }
  return result;
};


// ═══════════════════════════════════════════════════════════════════════════
// Ported from Python ray tracer:  physics/geodesics.py
// ═══════════════════════════════════════════════════════════════════════════

// Full geodesic equation derivatives for an 8-component state vector
//   state = [t, r, θ, φ, ut, ur, uθ, uφ]
//   first 4 = coordinates, last 4 = 4-velocities (dx/dτ)
//
// Returns 8-component derivative array:
//   [ut, ur, uθ, uφ, d²t/dτ², d²r/dτ², d²θ/dτ², d²φ/dτ²]
// where accelerations come from  a^λ = −Γ^λ_{μν} u^μ u^ν
Physics.geodesicDerivatives = function (M, state) {
  const r     = state[1];
  const theta = state[2];
  const vel   = [state[4], state[5], state[6], state[7]];

  const gamma = this.christoffel(M, r, theta);

  const accel = [0, 0, 0, 0];
  for (let lam = 0; lam < 4; lam++) {
    let sum = 0;
    for (let mu = 0; mu < 4; mu++) {
      for (let nu = 0; nu < 4; nu++) {
        sum += gamma[lam * 16 + mu * 4 + nu] * vel[mu] * vel[nu];
      }
    }
    accel[lam] = -sum;
  }

  return [
    vel[0], vel[1], vel[2], vel[3],        // dx^μ/dτ = u^μ
    accel[0], accel[1], accel[2], accel[3]  // du^μ/dτ = −Γ^μ_{αβ} u^α u^β
  ];
};


// ═══════════════════════════════════════════════════════════════════════════
// Ported from Python ray tracer:  physics/initial_conditions.py
// ═══════════════════════════════════════════════════════════════════════════

// Generate initial state for a stable circular orbit at given radius.
//   ω = sqrt(M_param / r³)  where M_param = Rs/2 = M (in G=c=1 units)
//   ut = 1 / sqrt(1 − 3·M_param / r)
//   uφ = ω · ut
//
// Returns 8-component state: [t, r, θ, φ, ut, ur, uθ, uφ]
// Throws if radius is too small for a stable orbit (r ≤ 3·Rs = ISCO).
Physics.circularOrbit = function (M, radius) {
  const Rs = this.rs(M);
  const massParam = Rs / 2;   // = M in G=c=1 units

  if (radius <= 3 * massParam) {
    throw new Error(
      `Stable circular orbits require radius > 6M (3 × Rs). Got r=${radius}, ISCO=${3 * massParam}.`
    );
  }

  const omega = Math.sqrt(massParam / (radius * radius * radius));
  const ut    = 1 / Math.sqrt(1 - 3 * massParam / radius);
  const uphi  = omega * ut;

  return new Float64Array([
    0.0,            // t
    radius,         // r
    Math.PI / 2,    // θ  (equatorial plane)
    0.0,            // φ
    ut,             // u^t
    0.0,            // u^r  (circular → zero radial velocity)
    0.0,            // u^θ
    uphi            // u^φ
  ]);
};


// ═══════════════════════════════════════════════════════════════════════════
// Ported from Python ray tracer:  physics/orbit_simulator.py
// ═══════════════════════════════════════════════════════════════════════════

// Simulate a particle/photon trajectory in Schwarzschild spacetime using
// the full geodesic equation + RK4 integration.
//
// Parameters:
//   M            – black hole mass
//   initialState – 8-component Float64Array [t, r, θ, φ, ut, ur, uθ, uφ]
//   stepSize     – proper-time step Δτ
//   steps        – number of integration steps
//
// Returns an array of 8-component state snapshots (the trajectory).
Physics.simulateOrbit = function (M, initialState, stepSize, steps) {
  const derivsFn = (s) => this.geodesicDerivatives(M, s);

  let state = Float64Array.from(initialState);
  const trajectory = [Float64Array.from(state)];

  for (let i = 0; i < steps; i++) {
    state = this.rk4Step(derivsFn, state, stepSize);
    trajectory.push(Float64Array.from(state));

    // Bail out if the particle has crossed the event horizon
    if (state[1] <= this.rs(M)) break;
  }

  return trajectory;
};

// Orbital period in proper time:  T = 2π / u^φ
Physics.orbitalPeriod = function (state) {
  const uphi = state[7];
  if (Math.abs(uphi) < 1e-15) return Infinity;
  return (2 * Math.PI) / uphi;
};


// ═══════════════════════════════════════════════════════════════════════════
// Reduced (1D) massive-particle orbit equation — fast equatorial integrator
// ═══════════════════════════════════════════════════════════════════════════
// d²u/dφ² = M/h² − u + 3Mu²   where u = 1/r, h = angular momentum per unit mass
// This is the fast path used by the orbit visualisation; the full geodesic
// integrator above is the general path.

Physics.traceMassive = function (M, h, u0, du0, opts = {}) {
  const dphi   = opts.dphi   ?? 0.01;
  const maxPhi = opts.maxPhi ?? 60;
  const rs     = this.rs(M);

  let u = u0, du = du0, phi = 0;
  const points = [];

  const deriv = (uu) => M / (h * h) + 3 * M * uu * uu - uu;

  for (let i = 0; i < maxPhi / dphi; i++) {
    const r = 1 / u;
    points.push({ r, phi });

    if (r <= rs * 1.01) break;
    if (r > 60 * M) break;

    // RK4 step via the reusable helper
    const state = [u, du];
    const stepped = this.rk4Step(
      (s) => [s[1], deriv(s[0])],
      state,
      dphi
    );
    u   = stepped[0];
    du  = stepped[1];
    phi += dphi;

    if (u <= 0) break;
  }

  return points;
};
