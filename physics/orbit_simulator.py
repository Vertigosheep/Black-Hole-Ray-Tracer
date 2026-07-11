import numpy as np

from physics.geodesics import GeodesicEquation
from physics.integrator import RK4Integrator

class OrbitSimulator:
    """
    Simulates particle motion in Schwarzschild spacetime.
    """

    def __init__(self, black_hole):

        self.equation = GeodesicEquation(black_hole)

        self.integrator = RK4Integrator(self.equation)


    def simulate(self, initial_state, step_size, steps):

        state = initial_state.copy()

        trajectory = []


        #Each iteration does 
        # #current state -> 
        # stores it ->
        # advance one rk4 step
        # repeat  

        for _ in range(steps):

            trajectory.append(state.copy())

            state = self.integrator.step(
                state,
                step_size
            )

        return np.array(trajectory)
    
    def orbital_period(self, state):
        """
        Compute the orbital period in proper state
        """

        _, _, _, _, _, _, _, uphi = state
        
        return 2 * np.pi / uphi