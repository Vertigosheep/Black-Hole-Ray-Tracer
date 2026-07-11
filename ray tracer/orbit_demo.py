import numpy as np
import matplotlib.pyplot as plt

from models.black_hole import BlackHole
from physics.orbit_simulator import OrbitSimulator
from physics.initial_conditions import InitialConditions

#Create a blackhole
bh = BlackHole(mass = 10)

#create a simulator
simulator = OrbitSimulator(bh)

initials = InitialConditions(bh)

initial_state = initials.circular_orbit(radius = 50)

step_size = 0.005

orbital_period = simulator.orbital_period(initial_state)

total_time = 2 * orbital_period

steps = int(total_time / step_size)

trajectory = simulator.simulate(
    initial_state,
    step_size = step_size,
    steps = steps
    )

r = trajectory[:, 1]
theta = trajectory[:, 2]
phi = trajectory[:, 3]

"""
print(f"Minimum radius : {np.min(r):.6f}")
print(f"Maximum radius : {np.max(r):.6f}")
print(f"Radius change  : {np.max(r) - np.min(r):.6f}")
"""

# Convert spherical coordinates to Cartesian for plotting
x = r * np.sin(theta) * np.cos(phi)
y = r * np.sin(theta) * np.sin(phi)
z = r * np.cos(theta)


plt.figure(figsize = (8, 8))

plt.plot(x, y)

plt.scatter(
    0,
    0,
    color = "black",
    s = 150,
    label = "Black Hole"
)

plt.xlabel("x")
plt.ylabel("y")

plt.axis("equal")

plt.grid(True)

plt.legend()

plt.title("Particle Orbit around a Schwarzschild Black Hole")

plt.show()

"""
print(f"Initial phi : {phi[0]}")
print(f"Final phi   : {phi[-1]}")
print(f"Total angle : {phi[-1] - phi[0]}")
print(phi[:10])
"""