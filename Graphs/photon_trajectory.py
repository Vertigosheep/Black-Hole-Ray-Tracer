"""
Manual RK4 integrator for the Schwarzschild null-geodesic system:

    dr/dlam    = rdot
    drdot/dlam = (b^2 / r^3) * (1 - 3M/r)
    dphi/dlam  = b / r^2

Written as plain scalar math (no numpy inside the hot loop, no scipy)
so it ports directly to C/C++/GLSL: state is a 3-tuple of floats,
rhs() and rk4_step() are pure functions with no dynamic allocation.

Fixed step size dlam is scaled by a simple function of r (smaller
steps near the black hole, larger steps far away) -- deterministic,
branch-light, GPU-friendly, no adaptive error control needed.
"""

import math

# ---------------------------------------------------------------
# Physical constants (defaults; pass explicitly if you like)
# ---------------------------------------------------------------
M_DEFAULT = 1.0
R_HORIZON_DEFAULT = 2.0 * M_DEFAULT
R_INFINITY_DEFAULT = 1000.0 * M_DEFAULT


def rhs(state, b, M):
    """state = (r, rdot, phi) -> (drdlam, drdotdlam, dphidlam)"""
    r, rdot, phi = state
    drdlam = rdot
    drdotdlam = (b * b / (r * r * r)) * (1.0 - 3.0 * M / r)
    dphidlam = b / (r * r)
    return (drdlam, drdotdlam, dphidlam)


def rk4_step(state, dlam, b, M):
    """One classic 4th-order Runge-Kutta step. Pure scalar math."""
    r, rdot, phi = state

    k1 = rhs(state, b, M)
    s2 = (r + 0.5 * dlam * k1[0],
          rdot + 0.5 * dlam * k1[1],
          phi + 0.5 * dlam * k1[2])

    k2 = rhs(s2, b, M)
    s3 = (r + 0.5 * dlam * k2[0],
          rdot + 0.5 * dlam * k2[1],
          phi + 0.5 * dlam * k2[2])

    k3 = rhs(s3, b, M)
    s4 = (r + dlam * k3[0],
          rdot + dlam * k3[1],
          phi + dlam * k3[2])

    k4 = rhs(s4, b, M)

    r_new = r + (dlam / 6.0) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0])
    rdot_new = rdot + (dlam / 6.0) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])
    phi_new = phi + (dlam / 6.0) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2])

    return (r_new, rdot_new, phi_new)


def step_size(r, base_dlam, M):
    """Deterministic step scaling: shrink dlam near the black hole
    (where curvature is high and the photon sphere lives) and let it
    grow far away. Pure function of r -- no history, GPU-safe."""
    scale = (r / (3.0 * M))**2
    if scale > 5.0:
        scale = 5.0
    elif scale < 0.01:
        scale = 0.01
    return base_dlam * scale


def trace_ray_rk4(b, M=M_DEFAULT, r_start=40.0 * M_DEFAULT,
                   r_horizon=R_HORIZON_DEFAULT, r_infinity=R_INFINITY_DEFAULT,
                   base_dlam=0.05, max_steps=400_000, record_path=True):
    """
    Integrate one photon from r_start inward with impact parameter b.

    Returns dict with:
      outcome: 'captured' | 'escaped' | 'unresolved'
      phi_final, r_final
      xs, ys: path in the equatorial plane (only if record_path=True)
    """
    r_stop = r_horizon * 1.001
    inside_sqrt = 1.0 - (b * b / (r_start * r_start)) * (1.0 - 2.0 * M / r_start)
    if inside_sqrt < 0.0:
        inside_sqrt = 0.0
    rdot0 = -math.sqrt(inside_sqrt)

    state = (r_start, rdot0, 0.0)
    xs = []
    ys = []
    if record_path:
        xs.append(state[0] * math.cos(state[2]))
        ys.append(state[0] * math.sin(state[2]))

    outcome = "unresolved"
    prev_r = state[0]

    for _ in range(max_steps):
        dlam = step_size(state[0], base_dlam, M)
        new_state = rk4_step(state, dlam, b, M)
        prev_r = state[0]
        state = new_state

        if record_path:
            xs.append(state[0] * math.cos(state[2]))
            ys.append(state[0] * math.sin(state[2]))

        if state[0] <= r_stop:
            outcome = "captured"
            break
        if state[0] >= r_infinity:
            outcome = "escaped"
            break

    return {
        "outcome": outcome,
        "phi_final": state[2],
        "r_final": state[0],
        "xs": xs,
        "ys": ys,
    }


# =================================================================
# Validation: compare against the scipy solve_ivp reference solver
# =================================================================
if __name__ == "__main__":
    import numpy as np
    from scipy.integrate import solve_ivp
    import matplotlib.pyplot as plt

    M = 1.0
    b_crit = 3 * math.sqrt(3) * M
    r_start = 40.0 * M
    r_horizon = 2.0 * M
    r_infinity = 1000.0 * M

    def geodesic_rhs_np(lam, y, b):
        r, rdot, phi = y
        return [rdot, (b**2 / r**3) * (1 - 3 * M / r), b / r**2]

    def scipy_reference(b, lam_max):
        inside_sqrt = max(1 - (b**2 / r_start**2) * (1 - 2 * M / r_start), 0.0)
        y0 = [r_start, -np.sqrt(inside_sqrt), 0.0]

        def cap(lam, y, b):
            return y[0] - r_horizon * 1.001
        cap.terminal, cap.direction = True, -1

        def esc(lam, y, b):
            return y[0] - r_infinity
        esc.terminal, esc.direction = True, 1

        sol = solve_ivp(
            geodesic_rhs_np,
            [0, 10000],      # instead of [0, lam_max]
            y0,
            args=(b,),
            events=[cap, esc],
            rtol=1e-10,
            atol=1e-12,
            max_step=0.05,
            dense_output=True,
        )
        
        print(sol.status)
        print(sol.message)
        print(sol.t[-1], sol.y[0][-1])

        if sol.t_events[0].size > 0:
            outcome = "captured"
        elif sol.t_events[1].size > 0:
            outcome = "escaped"
        else:
            outcome = "unresolved"
        return sol, outcome

    test_cases = {
        "b = 3.0 M": (3.0 * M, 200),
        "b = 4.5 M": (4.5 * M, 400),
        f"b = {b_crit - 0.001:.3f} M (near-crit in)": (b_crit - 0.001, 3000),
        f"b = {b_crit + 0.001:.3f} M (near-crit out)": (b_crit + 0.001, 3000),
        "b = 6.0 M": (6.0 * M, 1500),
        "b = 10.0 M": (10.0 * M, 1500),
    }

    print(f"{'case':38s} {'rk4 outcome':12s} {'scipy outcome':14s} "
          f"{'rk4 phi':>10s} {'scipy phi':>10s}  {'d_phi':>8s}")
    print("-" * 100)

    fig, ax = plt.subplots(figsize=(8, 8))
    colors = plt.cm.viridis(np.linspace(0, 1, len(test_cases)))

    for (label, (b, lam_max)), color in zip(test_cases.items(), colors):
        rk4_result = trace_ray_rk4(b, M=M, r_start=r_start, r_horizon=r_horizon,
                                    r_infinity=r_infinity, base_dlam=0.05,
                                    max_steps=2_000_000)
        sol, sp_outcome = scipy_reference(b, lam_max)
        sp_phi_final = sol.y[2][-1]

        d_phi = abs(rk4_result["phi_final"] - sp_phi_final)
        print(f"{label:38s} {rk4_result['outcome']:12s} {sp_outcome:14s} "
              f"{rk4_result['phi_final']:10.4f} {sp_phi_final:10.4f}  {d_phi:8.5f}")

        # plot RK4 path (solid) vs scipy path (dotted), should overlay closely
        ax.plot(rk4_result["xs"], rk4_result["ys"], color=color, linewidth=1.8,
                label=f"{label} [RK4]")
        sp_x = sol.y[0] * np.cos(sol.y[2])
        sp_y = sol.y[0] * np.sin(sol.y[2])
        ax.plot(sp_x, sp_y, color=color, linewidth=1.0, linestyle=":", alpha=0.8)

    theta = np.linspace(0, 2 * np.pi, 200)
    ax.fill(r_horizon * np.cos(theta), r_horizon * np.sin(theta), color="black", zorder=5)
    ax.plot(3 * M * np.cos(theta), 3 * M * np.sin(theta), color="red",
            linestyle="-.", linewidth=1.0, zorder=4)
    ax.set_xlim(-45, 45)
    ax.set_ylim(-45, 45)
    ax.set_aspect("equal")
    ax.set_title("RK4 (solid) vs scipy solve_ivp (dotted) -- should overlay")
    ax.legend(loc="upper left", fontsize=6)
    ax.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig("rk4_vs_scipy_validation.png", dpi=150)
    print("\nSaved overlay plot to rk4_vs_scipy_validation.png")
    