import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Star, Compass, Info, Eye, EyeOff } from 'lucide-react';
import { SimulationParams } from '../types';

interface Render3DProps {
  params: SimulationParams;
  onChangeParams: (newParams: Partial<SimulationParams>) => void;
}

export default function Render3D({ params, onChangeParams }: Render3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const [showExplanation, setShowExplanation] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [fps, setFps] = useState(0);

  // Dragging states for OrbitControls
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const anglesStartRef = useRef({ inclination: 0, azimuth: 0 });

  // Compile shaders and initialize WebGL
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use standard WebGL 1.0 for maximum compatibility
    const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }
    glRef.current = gl;

    // Vertex Shader: simple full-screen pass-through
    const vsSource = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_position * 0.5 + 0.5;
      }
    `;

    // Fragment Shader: Relativistic black hole ray tracer
    const fsSource = `
      precision highp float;
      varying vec2 v_texCoord;

      // Uniforms
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform float u_mass;
      uniform float u_disk_inner;
      uniform float u_disk_outer;
      uniform float u_disk_brightness;
      uniform float u_doppler_beaming;
      uniform float u_background_type; // 0: starfield, 1: grid, 2: cosmic

      // Camera Uniforms
      uniform float u_camera_distance;
      uniform float u_camera_inclination; // in radians
      uniform float u_camera_azimuth;     // in radians
      uniform float u_camera_fov;

      // Simple procedural 3D noise for accretion disk structure
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                   mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
      }

      // Procedural Starfield
      vec3 getStarfield(vec3 rayDir) {
        // High frequency procedural stars using direction vector
        float n = hash(floor(rayDir.xy * 240.0) + floor(rayDir.yz * 240.0));
        float starIntensity = step(0.994, n) * fract(n * 531.0);
        
        // Add a bit of blue-white color variation to stars
        vec3 starColor = vec3(0.85, 0.9, 1.0) * starIntensity;
        
        // Milky Way nebulous background glow
        float nebula = noise(rayDir.xy * 2.5) * 0.15 + noise(rayDir.yz * 5.0) * 0.05;
        vec3 nebulaColor = vec3(0.05, 0.02, 0.1) * nebula;
        
        return starColor + nebulaColor;
      }

      // Procedural Reference Grid
      vec3 getGrid(vec3 rayDir) {
        // Find spherical coordinates of final ray direction
        float theta = acos(rayDir.y); // 0 to pi
        float phi = atan(rayDir.z, rayDir.x); // -pi to pi

        float gridX = abs(sin(phi * 18.0));
        float gridY = abs(sin(theta * 18.0));
        
        float gridFactor = step(0.97, gridX) + step(0.97, gridY);
        gridFactor = clamp(gridFactor, 0.0, 1.0);

        vec3 gridColor = mix(vec3(0.02, 0.05, 0.1), vec3(0.12, 0.3, 0.5), gridFactor);
        
        // Add a faint red horizon line
        float horizonFactor = step(0.995, abs(rayDir.y));
        gridColor = mix(gridColor, vec3(0.8, 0.1, 0.1), horizonFactor);

        return gridColor;
      }

      // Cosmic space background
      vec3 getCosmic(vec3 rayDir) {
        float glow = noise(rayDir.xz * 3.0 + vec2(u_time * 0.05)) * 0.3;
        vec3 color = vec3(0.01, 0.005, 0.02);
        
        // Dynamic gaseous colors
        color += vec3(0.4, 0.1, 0.5) * noise(rayDir.xy * 1.5 + vec2(u_time * 0.01)) * 0.12;
        color += vec3(0.1, 0.3, 0.6) * noise(rayDir.yz * 2.0 - vec2(u_time * 0.015)) * 0.15;
        
        return color + vec3(glow * 0.15);
      }

      // Helper to compute hot plasma accretion disk color based on temperature (radius)
      vec3 getTemperatureColor(float r) {
        // Accretion temperature is hotter on the inner edge and falls off: T ~ r^(-3/4)
        float normalizedR = (r - u_disk_inner) / (u_disk_outer - u_disk_inner);
        normalizedR = clamp(normalizedR, 0.0, 1.0);

        // Core / Inner: blueish white
        vec3 hotColor = vec3(0.85, 0.92, 1.0);
        // Middle: bright orange-yellow
        vec3 midColor = vec3(1.0, 0.55, 0.12);
        // Outer: cooler dark crimson
        vec3 coolColor = vec3(0.72, 0.08, 0.02);

        if (normalizedR < 0.25) {
          return mix(hotColor, midColor, normalizedR / 0.25);
        } else {
          return mix(midColor, coolColor, (normalizedR - 0.25) / 0.75);
        }
      }

      void main() {
        // 1. Normalized screen coordinates (-1 to 1)
        vec2 uv = (v_texCoord * 2.0 - 1.0);
        float aspect = u_resolution.x / u_resolution.y;
        uv.x *= aspect;

        // 2. Derive camera coordinate vectors from spherical coordinates
        float theta = u_camera_inclination;
        float phi = u_camera_azimuth;

        vec3 camPos = vec3(
          u_camera_distance * sin(theta) * cos(phi),
          u_camera_distance * cos(theta),
          u_camera_distance * sin(theta) * sin(phi)
        );

        vec3 target = vec3(0.0, 0.0, 0.0);
        vec3 forward = normalize(target - camPos);
        vec3 upVec = vec3(0.0, 1.0, 0.0);
        if (abs(cos(theta)) > 0.99) {
          // Prevent gimbal lock when viewing directly from top/bottom
          upVec = vec3(0.0, 0.0, -1.0 * sign(cos(theta)));
        }
        vec3 right = normalize(cross(forward, upVec));
        vec3 trueUp = cross(right, forward);

        // Compute starting camera ray direction
        vec3 rayDir = normalize(forward + uv.x * right * u_camera_fov + uv.y * trueUp * u_camera_fov);
        vec3 rayPos = camPos;

        // 3. Raymarching / Geodesic Integration Loop
        const int MAX_STEPS = 140;
        float dt = 0.08;

        vec3 finalColor = vec3(0.0);
        float accumulatedAlpha = 0.0;
        bool fellIn = false;

        vec3 prevPos = rayPos;

        for (int i = 0; i < MAX_STEPS; i++) {
          float r2 = dot(rayPos, rayPos);
          float r = sqrt(r2);

          // Boundary checks
          if (r < 2.0 * u_mass + 0.02) {
            // Light rays captured by event horizon
            fellIn = true;
            break;
          }
          if (r > 40.0) {
            // Escaped the system boundaries
            break;
          }

          // Adaptive step size: take smaller steps near the high curvature region
          float step_dt = dt * clamp(r * 0.18, 0.05, 1.0);

          // CHECK ACCRETION DISK INTERSECTION (plane y = 0)
          if (prevPos.y * rayPos.y <= 0.0 && r < u_disk_outer && r > u_disk_inner) {
            // Find accurate intersection point on the plane y=0 using interpolation
            float t = -prevPos.y / (rayPos.y - prevPos.y);
            vec3 intersectPt = prevPos + t * (rayPos - prevPos);
            float rIntersect = length(intersectPt);

            if (rIntersect >= u_disk_inner && rIntersect <= u_disk_outer) {
              // Calculate gas density/texture pattern
              float angle = atan(intersectPt.z, intersectPt.x);
              
              // Keplerian orbital angular velocity omega = sqrt(M/R^3)
              float omega = sqrt(u_mass / (rIntersect * rIntersect * rIntersect));
              
              // Animated spiral arm structures
              float spiral = angle - rIntersect * 0.8 + u_time * 1.8;
              float gasDensity = noise(vec2(rIntersect * 1.5, spiral * 1.2)) * 0.6 + 0.4;
              
              // Finer dust noise
              float dustNoise = noise(vec2(intersectPt.x * 4.0, intersectPt.z * 4.0 + u_time * 0.5));
              gasDensity *= mix(0.7, 1.3, dustNoise);

              // Accretion disk glow profile: brighter at inner edge, falls off sharply outward
              float glowProfile = exp(-2.0 * (rIntersect - u_disk_inner) / (u_disk_outer - u_disk_inner));
              float alpha = gasDensity * glowProfile * 0.45 * u_disk_brightness;
              alpha = clamp(alpha, 0.0, 1.0);

              // Calculate base hot plasma color
              vec3 diskBaseColor = getTemperatureColor(rIntersect);

              // RELATIVISTIC DOPPLER BEAMING (asymmetry due to disk rotation)
              float doppler = 1.0;
              if (u_doppler_beaming > 0.5) {
                // Disk velocity at intersect pt (rotates around y-axis)
                vec3 diskVelDir = normalize(vec3(-intersectPt.z, 0.0, intersectPt.x));
                float beta = sqrt(u_mass / rIntersect); // orbital velocity
                float gamma = 1.0 / sqrt(1.0 - beta * beta);
                
                // Angle between photon direction and disk velocity
                float cosAngle = dot(rayDir, diskVelDir);
                
                // Relativistic Doppler formula
                doppler = 1.0 / (gamma * (1.0 - beta * cosAngle));
                
                // Beaming intensity scales with pow(doppler, 3.5)
                float beamingFactor = pow(doppler, 3.5);
                alpha *= beamingFactor;
                
                // Doppler shift shifts color temperature (blueshift vs redshift)
                diskBaseColor = getTemperatureColor(rIntersect / doppler);
              }

              // Accumulate colors (support semi-transparency so we can see front and back parts!)
              vec3 contrib = diskBaseColor * alpha;
              finalColor += (1.0 - accumulatedAlpha) * contrib;
              accumulatedAlpha += (1.0 - accumulatedAlpha) * alpha;

              if (accumulatedAlpha > 0.98) {
                accumulatedAlpha = 1.0;
                // If nearly opaque, we can break to optimize
                // But letting it continue allows lensing of background or secondary disks!
              }
            }
          }

          // GENERAL RELATIVISTIC GEODESIC UPDATE
          // L = x cross v
          vec3 L_vec = cross(rayPos, rayDir);
          float L2 = dot(L_vec, L_vec);

          // Geodesic acceleration vector: a = -3 * M * L^2 / r^5 * pos
          float r5 = r2 * r2 * r;
          float accFactor = -(3.0 * u_mass * L2) / r5;
          vec3 acc = accFactor * rayPos;

          // Perform symplectic-like integration step
          prevPos = rayPos;
          rayPos += rayDir * step_dt;
          rayDir += acc * step_dt;

          // Renormalize ray velocity vector to strictly maintain speed of light c=1
          rayDir = normalize(rayDir);
        }

        // 4. Blend background texture if the ray escaped
        if (!fellIn && accumulatedAlpha < 1.0) {
          vec3 bg;
          if (u_background_type < 0.5) {
            bg = getStarfield(rayDir);
          } else if (u_background_type < 1.5) {
            bg = getGrid(rayDir);
          } else {
            bg = getCosmic(rayDir);
          }
          finalColor += (1.0 - accumulatedAlpha) * bg;
        }

        // Output final lensed pixel color
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    // Shader compiler helper
    const compileShader = (type: number, source: string): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);

    if (!vs || !fs) return;

    // Program link
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }
    programRef.current = program;

    // Define vertices for full-screen quad (two triangles)
    const vertices = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0,
    ]);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  }, []);

  // Frame Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = glRef.current;
    const program = programRef.current;

    if (!canvas || !gl || !program) return;

    let lastTime = performance.now();
    let frameCount = 0;
    let fpsInterval = lastTime;

    const render = (timeMs: number) => {
      // Calculate FPS
      frameCount++;
      const currentMs = performance.now();
      if (currentMs - fpsInterval >= 1000) {
        setFps(Math.round((frameCount * 1000) / (currentMs - fpsInterval)));
        frameCount = 0;
        fpsInterval = currentMs;
      }

      // Handle canvas resizing gracefully
      const dpr = Math.min(2, window.devicePixelRatio || 1); // limit to dpr 2 for high WebGL performance
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

      gl.useProgram(program);

      // Pass common uniforms
      gl.uniform2f(
        gl.getUniformLocation(program, 'u_resolution'),
        canvas.width,
        canvas.height
      );
      gl.uniform1f(
        gl.getUniformLocation(program, 'u_time'),
        timeMs / 1000.0 // elapsed time in seconds
      );
      gl.uniform1f(gl.getUniformLocation(program, 'u_mass'), params.mass);
      gl.uniform1f(
        gl.getUniformLocation(program, 'u_disk_inner'),
        params.diskInner
      );
      gl.uniform1f(
        gl.getUniformLocation(program, 'u_disk_outer'),
        params.diskOuter
      );
      gl.uniform1f(
        gl.getUniformLocation(program, 'u_disk_brightness'),
        params.diskBrightness
      );
      gl.uniform1f(
        gl.getUniformLocation(program, 'u_doppler_beaming'),
        params.dopplerBeaming ? 1.0 : 0.0
      );

      let bgVal = 0.0;
      if (params.backgroundType === 'grid') bgVal = 1.0;
      else if (params.backgroundType === 'cosmic') bgVal = 2.0;
      gl.uniform1f(gl.getUniformLocation(program, 'u_background_type'), bgVal);

      // Pass camera uniforms (convert degrees to radians)
      const incRad = (params.cameraInclination * Math.PI) / 180;
      const azRad = (params.cameraAzimuth * Math.PI) / 180;

      gl.uniform1f(
        gl.getUniformLocation(program, 'u_camera_distance'),
        params.cameraDistance
      );
      gl.uniform1f(
        gl.getUniformLocation(program, 'u_camera_inclination'),
        incRad
      );
      gl.uniform1f(gl.getUniformLocation(program, 'u_camera_azimuth'), azRad);
      gl.uniform1f(
        gl.getUniformLocation(program, 'u_camera_fov'),
        params.cameraFov
      );

      // Draw full screen triangle quad
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [params]);

  // Handle Dragging for Orbit Camera Control
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    anglesStartRef.current = {
      inclination: params.cameraInclination,
      azimuth: params.cameraAzimuth,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    // Adjust angles based on mouse movement speed
    const sensitivity = 0.28;
    let newAzimuth = (anglesStartRef.current.azimuth - dx * sensitivity) % 360;
    if (newAzimuth < 0) newAzimuth += 360;

    // Clamp inclination to avoid crossing the poles completely
    const newInclination = Math.max(
      1.5,
      Math.min(178.5, anglesStartRef.current.inclination + dy * sensitivity)
    );

    onChangeParams({
      cameraAzimuth: newAzimuth,
      cameraInclination: newInclination,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY * 0.006;
    const newDistance = Math.max(
      6.0,
      Math.min(35.0, params.cameraDistance + zoomFactor)
    );
    onChangeParams({ cameraDistance: newDistance });
  };

  // Camera presets
  const applyCameraPreset = (preset: 'equatorial' | 'tilted' | 'polar') => {
    if (preset === 'equatorial') {
      onChangeParams({ cameraInclination: 90.0, cameraDistance: 16.0 });
    } else if (preset === 'tilted') {
      onChangeParams({ cameraInclination: 15.0, cameraDistance: 16.0 });
    } else if (preset === 'polar') {
      onChangeParams({ cameraInclination: 1.5, cameraDistance: 16.0 });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-[#E0DED7] font-sans rounded-sm overflow-hidden border border-white/10 shadow-2xl">
      {/* 3D WebGL Canvas Area */}
      <div
        className="relative flex-1 min-h-[400px] md:min-h-[500px]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsDragging(false);
        }}
      >
        <canvas
          id="canvas-3d"
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-full block cursor-grab active:cursor-grabbing"
          title="Drag to rotate camera, scroll to zoom"
        />

        {/* Orbit Control Indicator HUD overlay */}
        <div className="absolute top-4 left-4 flex flex-col gap-1 pointer-events-none font-mono text-[10px] text-slate-400 bg-black/90 p-3 rounded-none border border-white/10 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Compass size={11} className="text-[#F27D26]" />
            <span className="text-white uppercase font-bold tracking-wider">Camera HUD</span>
          </div>
          <div>Dist: {params.cameraDistance.toFixed(1)} units</div>
          <div>Lat (Inc): {params.cameraInclination.toFixed(0)}°</div>
          <div>Lng (Az): {params.cameraAzimuth.toFixed(0)}°</div>
          <div className="text-[#F27D26] font-bold mt-1">{fps} FPS</div>
        </div>

        {/* Camera Control Presets floating */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
          <div className="flex flex-col bg-black/90 border border-white/10 p-1 rounded-none gap-1 shadow-xl backdrop-blur-sm">
            <span className="text-[9px] font-mono font-bold text-center text-slate-500 py-0.5 border-b border-white/5 mb-1 uppercase tracking-wider">
              CAMERA
            </span>
            <button
              id="btn-preset-eq"
              onClick={() => applyCameraPreset('equatorial')}
              className="px-2 py-1.5 text-[10px] font-mono hover:bg-white/10 rounded-none text-left flex items-center gap-1.5 transition-colors"
            >
              <Camera size={11} className="text-[#F27D26]" />
              Equatorial
            </button>
            <button
              id="btn-preset-tilted"
              onClick={() => applyCameraPreset('tilted')}
              className="px-2 py-1.5 text-[10px] font-mono hover:bg-white/10 rounded-none text-left flex items-center gap-1.5 transition-colors"
            >
              <Camera size={11} className="text-[#F27D26]" />
              Accretion Tilt
            </button>
            <button
              id="btn-preset-polar"
              onClick={() => applyCameraPreset('polar')}
              className="px-2 py-1.5 text-[10px] font-mono hover:bg-white/10 rounded-none text-left flex items-center gap-1.5 transition-colors"
            >
              <Camera size={11} className="text-[#F27D26]" />
              Polar Orbit
            </button>
          </div>

          <button
            id="btn-info-toggle-3d"
            onClick={() => setShowExplanation(!showExplanation)}
            className="flex items-center justify-center bg-white/[0.04] backdrop-blur-md border border-white/10 hover:bg-white/10 px-3 py-1.5 rounded-none text-xs gap-1.5 shadow-lg transition-all"
          >
            {showExplanation ? <EyeOff size={13} /> : <Eye size={13} />}
            <span className="font-mono text-[10px] uppercase tracking-wider">{showExplanation ? 'Hide Legend' : 'Show Legend'}</span>
          </button>
        </div>

        {/* Legend Overlay */}
        {showExplanation && (
          <div className="absolute bottom-4 left-4 right-4 md:right-auto md:max-w-sm bg-black/95 backdrop-blur-md border border-white/10 rounded-sm p-4 shadow-2xl z-10 text-xs">
            <h4 className="font-serif italic text-white text-sm mb-1.5 flex items-center gap-1.5">
              <Info size={14} className="text-[#F27D26]" /> Relativistic 3D Lensing Guide
            </h4>
            <p className="text-slate-300 leading-relaxed mb-3">
              This executes real-time <strong>General Relativistic (GR) Ray Tracing</strong> inside a WebGL pixel shader, solving the geodesic path for each screen pixel.
            </p>
            <ul className="space-y-1.5 text-[11px] text-slate-400">
              <li className="flex items-start gap-1">
                <span className="text-[#F27D26] font-bold">•</span>
                <span><strong className="text-white">Einstein Ring:</strong> The circular distortion of the background starfield near the event horizon.</span>
              </li>
              <li className="flex items-start gap-1">
                <span className="text-[#F27D26] font-bold">•</span>
                <span><strong className="text-white">Accretion Disk Halos:</strong> The disk is flat ($y=0$), but gravity bends rays around the back, making the rear edge appear to halo both above and below the hole!</span>
              </li>
              <li className="flex items-start gap-1">
                <span className="text-[#F27D26] font-bold">•</span>
                <span><strong className="text-white">Doppler Beaming:</strong> Relativistic velocities make the gas moving <em>towards</em> us (left side) brighter and bluer, and gas moving <em>away</em> (right side) dimmer and redder.</span>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Control Area for 3D params */}
      <div className="bg-white/[0.02] border-t border-white/10 p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Accretion Disk Dimensions */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-slate-400 font-mono tracking-widest uppercase text-[#F27D26]">ACCRETION DISK BOUNDS</label>
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span>Inner Edge (R_in):</span>
              <span className="text-[#F27D26] font-bold">{params.diskInner.toFixed(1)} M</span>
            </div>
            <input
              id="slider-disk-inner"
              type="range"
              min="2.1"
              max="5.5"
              step="0.1"
              value={params.diskInner}
              onChange={(e) => onChangeParams({ diskInner: parseFloat(e.target.value) })}
              className="w-full accent-[#F27D26] bg-white/10 rounded h-1 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span>Outer Edge (R_out):</span>
              <span className="text-[#F27D26] font-bold">{params.diskOuter.toFixed(1)} M</span>
            </div>
            <input
              id="slider-disk-outer"
              type="range"
              min="6.0"
              max="15.0"
              step="0.1"
              value={params.diskOuter}
              onChange={(e) => onChangeParams({ diskOuter: parseFloat(e.target.value) })}
              className="w-full accent-[#F27D26] bg-white/10 rounded h-1 cursor-pointer"
            />
          </div>
        </div>

        {/* Accretion Disk Aesthetics */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-slate-400 font-mono tracking-widest uppercase text-[#F27D26]">PLASMA GLOW & OPTICS</label>
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span>Disk Brightness:</span>
              <span className="text-[#F27D26] font-bold">{params.diskBrightness.toFixed(1)}x</span>
            </div>
            <input
              id="slider-disk-brightness"
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={params.diskBrightness}
              onChange={(e) => onChangeParams({ diskBrightness: parseFloat(e.target.value) })}
              className="w-full accent-[#F27D26] bg-white/10 rounded h-1 cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1.5 pt-1">
            <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer hover:text-white">
              <input
                id="checkbox-doppler"
                type="checkbox"
                checked={params.dopplerBeaming}
                onChange={(e) => onChangeParams({ dopplerBeaming: e.target.checked })}
                className="rounded-none accent-[#F27D26] bg-white/[0.02] border-white/10"
              />
              Doppler Beaming (Asymmetry)
            </label>
          </div>
        </div>

        {/* Space Background select */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-slate-400 font-mono tracking-widest uppercase text-[#F27D26]">COSMIC BACKGROUND</label>
          <div className="grid grid-cols-3 gap-1 bg-white/5 border border-white/5 rounded-none p-1">
            <button
              id="btn-bg-starfield"
              onClick={() => onChangeParams({ backgroundType: 'starfield' })}
              className={`px-2 py-1 rounded-none text-[10px] font-mono transition-colors text-center ${
                params.backgroundType === 'starfield' ? 'bg-[#F27D26]/15 text-[#F27D26] font-bold border border-[#F27D26]/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Starfield
            </button>
            <button
              id="btn-bg-grid"
              onClick={() => onChangeParams({ backgroundType: 'grid' })}
              className={`px-2 py-1 rounded-none text-[10px] font-mono transition-colors text-center ${
                params.backgroundType === 'grid' ? 'bg-[#F27D26]/15 text-[#F27D26] font-bold border border-[#F27D26]/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Metric Grid
            </button>
            <button
              id="btn-bg-cosmic"
              onClick={() => onChangeParams({ backgroundType: 'cosmic' })}
              className={`px-2 py-1 rounded-none text-[10px] font-mono transition-colors text-center ${
                params.backgroundType === 'cosmic' ? 'bg-[#F27D26]/15 text-[#F27D26] font-bold border border-[#F27D26]/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Gaseous
            </button>
          </div>

          <div className="pt-1">
            <div className="flex justify-between text-xs font-mono mb-1">
              <span>FOV / Lens Zoom:</span>
              <span className="text-[#F27D26] font-bold">{(1.0 / params.cameraFov).toFixed(1)}x</span>
            </div>
            <input
              id="slider-camera-fov"
              type="range"
              min="0.4"
              max="1.5"
              step="0.05"
              value={params.cameraFov}
              onChange={(e) => onChangeParams({ cameraFov: parseFloat(e.target.value) })}
              className="w-full accent-[#F27D26] bg-white/10 rounded h-1 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
