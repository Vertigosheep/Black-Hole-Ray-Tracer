import numpy as np

from models.black_hole import BlackHole
from physics.schwarzschild_metric import SchwarzschildMetric
bh = BlackHole(mass = 10)

metric = SchwarzschildMetric(bh)

r = 50
theta = np.pi / 2

print(metric.metric_tensor(r, theta))