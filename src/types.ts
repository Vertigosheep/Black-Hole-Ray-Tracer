export interface SimulationParams {
  // Common params
  mass: number; // GM / c^2, controls Schwarzschild radius (Rs = 2M)
  
  // 2D Sandbox params
  rayCount: number;
  raySpread: number; // spread angle in degrees
  rayAngle: number; // central direction angle of rays in degrees
  sourceDistance: number; // distance of light source from black hole
  sourceAngle: number; // angular position of light source
  stepSize2D: number;
  maxSteps2D: number;
  sourceType: 'parallel' | 'point';
  showPhotonSphere: boolean;
  showEventHorizon: boolean;
  showDeflectionAngles: boolean;
  isPaused: boolean;

  // 3D Render params
  diskInner: number; // inner radius of accretion disk in units of M
  diskOuter: number; // outer radius of accretion disk in units of M
  diskBrightness: number;
  diskNoiseScale: number; // complexity of disk dust pattern
  dopplerBeaming: boolean; // toggle relativistic Doppler beaming
  backgroundType: 'starfield' | 'grid' | 'cosmic';
  cameraDistance: number;
  cameraInclination: number; // latitude in degrees
  cameraAzimuth: number; // longitude in degrees
  cameraFov: number; // field of view
}

export const DEFAULT_PARAMS: SimulationParams = {
  mass: 1.5,
  rayCount: 25,
  raySpread: 40,
  rayAngle: 0,
  sourceDistance: 12,
  sourceAngle: 180, // left side
  stepSize2D: 0.1,
  maxSteps2D: 400,
  sourceType: 'parallel',
  showPhotonSphere: true,
  showEventHorizon: true,
  showDeflectionAngles: false,
  isPaused: false,

  diskInner: 3.0, // starts at photon sphere (or ISCO at 6M)
  diskOuter: 10.0,
  diskBrightness: 1.2,
  diskNoiseScale: 1.5,
  dopplerBeaming: true,
  backgroundType: 'starfield',
  cameraDistance: 15.0,
  cameraInclination: 12.0, // slightly tilted down to see the accretion disk shape
  cameraAzimuth: 0.0,
  cameraFov: 0.9, // radians or scaled FOV
};
