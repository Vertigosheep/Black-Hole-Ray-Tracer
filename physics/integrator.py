#integrating RK4 Runge - Kutta 4th order method

import numpy as np

class RK4Integrator:
    """
    Fourth-order Runge-Kutta integrating
    """

    def __init__(self, equation):
        self.equation = equation

    def step(self, state, h):
        """
        Perform one RK4 integration step.

        Parameters 
        ----------
        state : ndarray
            Current state vector

        h: float
            Step size

        Returns
        -------
        ndarray
            Updated state vector after one integration step.    
        """

        k1 = self.equation.derivatives(state)

        k2 = self.equation.derivatives(state + 0.5 * h * k1)

        k3 = self.equation.derivatives(state + 0.5 * h * k2)

        k4 = self.equation.derivatives(state + h * k3)

        return state + (h/6) * (
            k1 + 
            2 * k2 + 
            2 * k3 + 
            k4
        )

