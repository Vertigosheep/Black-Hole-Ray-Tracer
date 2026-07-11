import numpy as np

class InitialConditions:

    """
    Generates physically consistent initial states
    for particle and photons in Schwarzschild spacetime
    """

    def __init__(self, black_hole):
        self.black_hole = black_hole

    
    def circular_orbit(self, radius):
        R_s = self.black_hole.schwarzschild_radius

        mass_parameter = R_s / 2

        if radius <= 3 * mass_parameter:
            raise ValueError(
                "Stable circular orbits require radius > 6M (3 * Schwarzschild radius)."
            )
        

        

        omega = np.sqrt(mass_parameter / radius**3)

        ut = 1 / np.sqrt(1 - 3 * mass_parameter / radius)

        uphi = omega * ut

        return np.array([
            0.0,
            radius,
            np.pi / 2,
            0.0,

            ut,
            0.0,
            0.0,
            uphi
        ])