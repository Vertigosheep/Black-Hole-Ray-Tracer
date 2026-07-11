import numpy as np

from models.black_hole import BlackHole
from physics.geodesics import GeodesicEquation

bh = BlackHole(mass = 10)

geodesic = GeodesicEquation(bh)

state = np.array([
    0.0,  # t
    50.0, # r
    np.pi / 2, # θ
    0.0,  # φ

    1.0,  # ut
    0.0,  # ur
    0.0,  # uθ
    0.1   # uφ
])

derivatives = geodesic.derivatives(state)

names = [
    "dt/dτ",
    "dr/dτ",
    "dθ/dτ",
    "dφ/dτ",

    "d²t/dτ²",
    "d²r/dτ²",
    "d²θ/dτ²",
    "d²φ/dτ²"
]

print("\n======================================")
print("      GEODESIC EQUATION")
print("======================================")

for name, value in zip(names, derivatives):
    print(f"{name:<12}: {value:.6f}")


