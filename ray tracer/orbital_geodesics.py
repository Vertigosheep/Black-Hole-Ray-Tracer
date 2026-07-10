import numpy as np
from scipy.integrate import solve_ivp
import matplotlib.pyplot as plt

G = 1
M = 1
L = 4

def geodesics(phi, y):
    u, up = y
    du_dphi = up
    dup_dphi = (G * M / L ** 2) - u + (3 * G * M * u ** 2)
    return [du_dphi, dup_dphi]

phi_span = (0, 50)
y0 = [0.1, 0]

sol = solve_ivp(geodesics, phi_span, y0, t_eval = np.linspace(0, 50, 5000))

u = sol.y[0]
phi = sol.t
r = 1 / u
x = r * np.cos(phi)
y = r * np.sin(phi)

plt.figure(figsize = (8, 8))
plt.plot(x, y)
plt.scatter(0, 0, color = 'black', label = 'Mass')
plt.axis('equal')
plt.legend()
plt.title("Relativistic Orbit")
plt.show()

