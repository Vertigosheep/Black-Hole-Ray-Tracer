# ===============================
# Schwarzschild Black Hole Model
# Phase 1: Physical Properties
# ===============================


import numpy as np

class BlackHole:

    #self means data for this particular black hole
    def __init__(self, mass, G=1.0, c=1.0):
        self.mass = mass
        self.G = G
        self.c = c

    #@property states the calculation has become the property of the function 
    #and so we will not need to call it as a function but as a property of the class
    #in app we will call it as bh.schwarzschild_radius instead of bh.schwarzschild_radius()
    @property
    def schwarzschild_radius(self):
        return 2 * self.G * self.mass / self.c**2

    @property
    def isco(self):
        return 3 * self.schwarzschild_radius

    @property
    def photon_sphere(self):
        return 1.5 * self.schwarzschild_radius

    def escape_velocity(self, radius=None):

        if radius is None:
            radius = self.schwarzschild_radius

        return np.sqrt((2*self.G*self.mass)/radius)
    
    def summary(self):
        return {
            "Mass": self.mass,
            "Gravitational Constant": self.G,
            "Speed of Light": self.c,
            "Schwarzschild Radius": self.schwarzschild_radius,
            "Photon Sphere Radius": self.photon_sphere,
            "ISCO Radius": self.isco,
            "Escape Velocity": self.escape_velocity()
    }