import numpy as np

"""
Imagine you're walking on Earth.
If you walk due north from India, eventually you'll reach the North Pole.
Now imagine you continue walking "straight."
You start moving south.
Did you turn?
No.
The surface itself is curved.
General Relativity is exactly this idea, except instead of a curved Earth, it's curved spacetime.
Christoffel symbols tell us
"How should a vector change because the coordinate system itself is curved?"
They are not a force.
Gravity is not pulling photons.
Photons simply follow the straightest possible path in curved spacetime.
That path is called a geodesic.

The Mathematics
From the metric tensor
g
μν
we compute
Γμνλ​=21​gλσ(∂μ​gσν​+∂ν​gσμ​−∂σ​gμν​)
This equation looks intimidating, but don't worry—we're going to simplify it.

Important simplification
For a Schwarzschild black hole, most Christoffel symbols are zero.
Out of 64 possible components, only a handful are non-zero.
For our ray tracer, we only need those non-zero terms.
That makes the implementation much simpler.
"""

class ChristoffelSymbols:
    """
    Computes the non-zero Christoffel symbols 
    for Schwarzschild spacetime.
    """

    def __init__(self, black_hole):
        self.black_hole = black_hole

    def compute(self, r, theta):

        R_s = self.black_hole.schwarzschild_radius

        f = 1 - R_s / r

        #4 because we have 4 coordinates (t, r, θ, φ)
        #(0, 1, 2, 3) =( t, r, θ, φ)

        #gamma[λ][μ][ν]
        gamma = np.zeros((4, 4, 4))
        
        
        #Γ^t_tr = Γ^t_rt
        gamma[0,0,1] = R_s / (2 * r**2 * f)
        gamma[0,1,0] = gamma[0,0,1]

        #Γ^r_tt
        gamma[1,0,0] = R_s * f / (2 * r**2)

        #Γ^r_rr
        gamma[1,1,1] = -R_s / (2 * r**2 * f)

        #Γ^r_θθ
        gamma[1,2,2] = -r * f

        #Γ^r_φφ
        gamma[1,3,3] = -r * f * (np.sin(theta))**2

        #Γ^θ_rθ = Γ^θ_θr
        gamma[2,1,2] = 1 / r
        gamma[2,2,1] = gamma[2,1,2]

         # Γ^φ_rφ = Γ^φ_φr
        gamma[3,1,3] = 1 / r
        gamma[3,3,1] = gamma[3,1,3]

        # Γ^θ_φφ
        gamma[2,3,3] = -np.sin(theta) * np.cos(theta)

        # Γ^φ_θφ = Γ^φ_φθ
        gamma[3,2,3] = 1 / np.tan(theta)
        gamma[3,3,2] = gamma[3,2,3]

        return gamma