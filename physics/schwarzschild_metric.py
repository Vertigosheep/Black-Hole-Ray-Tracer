import numpy as np

class SchwarzschildMetric:
    """
    Schwarzschild spacetime metric for non-rotating black hole.
    Coordinates:
       (t, r, θ, φ)
    """

    def __init__(self, black_hole):
        self.black_hole = black_hole

    def metric_tensor(self, r, theta):
        """
        Returns the Schwarzschild metric tensor g_{μν} at given coordinates (r, θ).
        """
        
        R_s = self.black_hole.schwarzschild_radius

        f = 1 - R_s / r

        g = np.array([
            [-f,    0,      0,                       0],
            [ 0,  1/f,      0,                       0],
            [ 0,    0,   r**2,                       0],
            [ 0,    0,      0,  (r * np.sin(theta))**2]
        ])

        return g
    
    def inverse_metric(self, r,theta):
        """
        Returns the inverse of the Schwarzschild metric tensor 
        i.e., g^{μν} at given coordinates (r, θ).
        """
        
        g_inv = self.metric_tensor(r, theta)

        return g_inv