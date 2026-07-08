import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, HelpCircle, Eye, EyeOff } from 'lucide-react';
import { SimulationParams } from '../types';

interface Sandbox2DProps {
  params: SimulationParams;
  onChangeParams: (newParams: Partial<SimulationParams>) => void;
}

interface Point2D {
  x: number;
  y: number;
}

interface RayPath {
  points: Point2D[];
  status: 'escaped' | 'captured' | 'orbiting';
  deflection: number; // in degrees
}

export default function Sandbox2D({ params, onChangeParams }: Sandbox2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showExplanation, setShowExplanation] = useState(true);
  const [animationOffset, setAnimationOffset] = useState(0);

  const mass = params.mass;
  const eventHorizonRadius = 2.0 * mass;
  const photonSphereRadius = 3.0 * mass;
  const iscoRadius = 6.0 * mass; // Innermost Stable Circular Orbit for matter

  // Scale: pixels per unit distance
  const [scale, setScale] = useState(20);

  // Compute source position in Cartesian coordinates
  const sourceRad = (params.sourceAngle * Math.PI) / 180;
  const sourcePos: Point2D = {
    x: params.sourceDistance * Math.cos(sourceRad),
    y: params.sourceDistance * Math.sin(sourceRad),
  };

  // Run the physics integration for all rays
  const calculateRays = (): RayPath[] => {
    const rays: RayPath[] = [];
    const N = params.rayCount;
    const centralAngleRad = (params.rayAngle * Math.PI) / 180;
    const spreadAngleRad = (params.raySpread * Math.PI) / 180;

    // Direction vector of the source
    const dirX = Math.cos(centralAngleRad);
    const dirY = Math.sin(centralAngleRad);

    // Perpendicular vector for parallel source offsets
    const perpX = -dirY;
    const perpY = dirX;

    for (let i = 0; i < N; i++) {
      let posX = sourcePos.x;
      let posY = sourcePos.y;
      let velX = 0;
      let velY = 0;

      if (params.sourceType === 'point') {
        // Rays fan out from the source point
        let rayAngle = centralAngleRad;
        if (N > 1) {
          const t = i / (N - 1); // 0 to 1
          rayAngle = centralAngleRad + (t - 0.5) * spreadAngleRad;
        }
        velX = Math.cos(rayAngle);
        velY = Math.sin(rayAngle);
      } else {
        // Parallel beam: rays start offset perpendicular to propagation direction
        let offset = 0;
        if (N > 1) {
          const t = i / (N - 1); // 0 to 1
          const maxOffset = params.raySpread * 0.15; // scaled spread
          offset = (t - 0.5) * maxOffset * 10;
        }
        posX = sourcePos.x + offset * perpX;
        posY = sourcePos.y + offset * perpY;
        velX = dirX;
        velY = dirY;
      }

      // Initial ray state
      const points: Point2D[] = [{ x: posX, y: posY }];
      let status: 'escaped' | 'captured' | 'orbiting' = 'escaped';
      
      const initialVelX = velX;
      const initialVelY = velY;

      let rPrev = Math.sqrt(posX * posX + posY * posY);

      // Simple RK4 integration step
      const dt = params.stepSize2D;
      const maxSteps = params.maxSteps2D;

      for (let step = 0; step < maxSteps; step++) {
        const r2 = posX * posX + posY * posY;
        const r = Math.sqrt(r2);

        // Check for capture by event horizon
        if (r < eventHorizonRadius) {
          status = 'captured';
          // Interpolate point right on the horizon
          const ratio = eventHorizonRadius / rPrev;
          const lastPt = points[points.length - 1];
          const intersectX = lastPt.x * ratio;
          const intersectY = lastPt.y * ratio;
          points.push({ x: intersectX, y: intersectY });
          break;
        }

        // Check for escape (gone far away)
        if (r > 40.0) {
          status = 'escaped';
          break;
        }

        // General relativistic geodesic equations of motion
        // L = x * v_y - y * v_x
        const L = posX * velY - posY * velX;
        const L2 = L * L;

        // Gravitational deflection acceleration
        // a = -3 * M * L^2 / r^5 * pos
        const r5 = r2 * r2 * r;
        const accFactor = -(3.0 * mass * L2) / r5;
        const accX = accFactor * posX;
        const accY = accFactor * posY;

        // Update step (Euler-Maruyama / Semi-implicit Euler for simplicity and speed)
        velX += accX * dt;
        velY += accY * dt;

        // Relativistic constraint: light speed is always constant (c=1)
        // Re-normalize velocity to maintain light speed
        const speed = Math.sqrt(velX * velX + velY * velY);
        if (speed > 0) {
          velX /= speed;
          velY /= speed;
        }

        posX += velX * dt;
        posY += velY * dt;

        points.push({ x: posX, y: posY });
        rPrev = r;
      }

      // If finished and still near, mark as orbiting
      const finalR = Math.sqrt(posX * posX + posY * posY);
      if (status === 'escaped' && points.length === maxSteps && finalR < 15.0) {
        status = 'orbiting';
      }

      // Compute deflection angle
      const finalVelX = velX;
      const finalVelY = velY;
      const cosAngle = (initialVelX * finalVelX + initialVelY * finalVelY);
      const deflectionRad = Math.acos(Math.min(1.0, Math.max(-1.0, cosAngle)));
      let deflectionDeg = (deflectionRad * 180) / Math.PI;
      
      // Determine direction of deflection (sign) using cross product
      const cross = initialVelX * finalVelY - initialVelY * finalVelX;
      if (cross < 0) deflectionDeg = -deflectionDeg;

      rays.push({
        points,
        status,
        deflection: deflectionDeg,
      });
    }

    return rays;
  };

  const rays = calculateRays();

  // Animate photon particles along the rays
  useEffect(() => {
    if (params.isPaused) return;

    let animFrame: number;
    const update = () => {
      setAnimationOffset((prev) => (prev + 0.15) % 10.0);
      animFrame = requestAnimationFrame(update);
    };
    animFrame = requestAnimationFrame(update);

    return () => cancelAnimationFrame(animFrame);
  }, [params.isPaused]);

  // Handle Canvas Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and set sizing
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    ctx.scale(dpr, dpr);

    // Canvas background - dark space
    ctx.fillStyle = '#000000'; // Pure elegant pitch black
    ctx.fillRect(0, 0, width, height);

    // Center of canvas
    const cx = width / 2;
    const cy = height / 2;

    // Draw background grid lines (relativistic spatial coordinates)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    const gridSpacing = 2 * scale;
    for (let x = cx % gridSpacing; x < width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = cy % gridSpacing; y < height; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Helper to map math units to canvas coordinates
    const toCanvas = (p: Point2D): Point2D => ({
      x: cx + p.x * scale,
      y: cy - p.y * scale, // invert Y for standard math orientation
    });

    // Draw reference orbits: Stable Orbit (ISCO) at 6M
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; 
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(cx, cy, iscoRadius * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Photon Sphere at 3M
    if (params.showPhotonSphere) {
      ctx.strokeStyle = 'rgba(242, 125, 38, 0.45)'; // elegant copper orange
      ctx.lineWidth = 1.2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(cx, cy, photonSphereRadius * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Label for Photon Sphere
      ctx.fillStyle = 'rgba(242, 125, 38, 0.75)';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText('PHOTON SPHERE (3M)', cx + photonSphereRadius * scale + 5, cy - 5);
    }

    // Draw Event Horizon at 2M
    if (params.showEventHorizon) {
      // Draw outer horizon glow
      const rEH = eventHorizonRadius * scale;
      const gradient = ctx.createRadialGradient(cx, cy, rEH * 0.8, cx, cy, rEH * 1.5);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
      gradient.addColorStop(0.5, 'rgba(242, 125, 38, 0.25)'); // orange glow
      gradient.addColorStop(1, 'rgba(242, 125, 38, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, rEH * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Inner solid black horizon
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(cx, cy, rEH, 0, Math.PI * 2);
      ctx.fill();

      // Outline the event horizon
      ctx.strokeStyle = '#F27D26';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, rEH, 0, Math.PI * 2);
      ctx.stroke();

      // Label for Event Horizon
      ctx.fillStyle = 'rgba(242, 125, 38, 0.85)';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText('EVENT HORIZON (2M)', cx + eventHorizonRadius * scale + 5, cy + 12);
    }

    // Draw Light Rays
    rays.forEach((ray) => {
      if (ray.points.length < 2) return;

      // Select color based on status
      let rayColor = 'rgba(224, 222, 215, 0.3)'; // elegant off-white/cream for escaped
      if (ray.status === 'captured') {
        rayColor = 'rgba(239, 68, 68, 0.3)'; // red/crimson for captured
      } else if (ray.status === 'orbiting') {
        rayColor = 'rgba(242, 125, 38, 0.55)'; // copper orange for orbiting
      }

      ctx.strokeStyle = rayColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      const start = toCanvas(ray.points[0]);
      ctx.moveTo(start.x, start.y);

      for (let i = 1; i < ray.points.length; i++) {
        const pt = toCanvas(ray.points[i]);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();

      // Draw deflection angle overlays if enabled
      if (params.showDeflectionAngles && ray.status === 'escaped' && ray.points.length > 50) {
        // Draw dashed original trajectory line
        const initPt = ray.points[0];
        const initAngle = (params.rayAngle * Math.PI) / 180;
        const pFar = {
          x: initPt.x + Math.cos(initAngle) * 30,
          y: initPt.y + Math.sin(initAngle) * 30,
        };
        const cStart = toCanvas(initPt);
        const cFar = toCanvas(pFar);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(cStart.x, cStart.y);
        ctx.lineTo(cFar.x, cFar.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // Draw Animated Photons flowing along the rays
    if (!params.isPaused) {
      rays.forEach((ray) => {
        const points = ray.points;
        if (points.length < 2) return;

        // Draw multiple photons along each path
        const spacing = Math.floor(points.length / 4);
        for (let i = 0; i < 4; i++) {
          const index = Math.floor((animationOffset * 2.0 + i * spacing) % points.length);
          if (index < points.length) {
            const pt = toCanvas(points[index]);
            
            // Neon glowing particles
            ctx.fillStyle = ray.status === 'captured' ? '#ef4444' : ray.status === 'orbiting' ? '#F27D26' : '#FFC58E';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0; // reset
          }
        }
      });
    }

    // Draw Light Source
    const cSource = toCanvas(sourcePos);
    const sourceGlow = ctx.createRadialGradient(
      cSource.x,
      cSource.y,
      0,
      cSource.x,
      cSource.y,
      12
    );
    sourceGlow.addColorStop(0, 'rgba(255, 255, 255, 1)');
    sourceGlow.addColorStop(0.3, 'rgba(242, 125, 38, 0.8)');
    sourceGlow.addColorStop(1, 'rgba(242, 125, 38, 0)');

    ctx.fillStyle = sourceGlow;
    ctx.beginPath();
    ctx.arc(cSource.x, cSource.y, 12, 0, Math.PI * 2);
    ctx.fill();

    // Core of source
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#F27D26';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cSource.x, cSource.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Source direction indicator (draw a small pointing arrow)
    const initAngle = (params.rayAngle * Math.PI) / 180;
    const arrowLen = 18;
    const arrowHead = 5;
    const arrowX = cSource.x + Math.cos(initAngle) * arrowLen;
    const arrowY = cSource.y - Math.sin(initAngle) * arrowLen;

    ctx.strokeStyle = '#F27D26';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cSource.x, cSource.y);
    ctx.lineTo(arrowX, arrowY);
    ctx.stroke();

    // Arrowhead
    const angle = Math.atan2(arrowY - cSource.y, arrowX - cSource.x);
    ctx.fillStyle = '#F27D26';
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(
      arrowX - arrowHead * Math.cos(angle - Math.PI / 6),
      arrowY - arrowHead * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      arrowX - arrowHead * Math.cos(angle + Math.PI / 6),
      arrowY - arrowHead * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    // HUD Text Overlay
    ctx.fillStyle = 'rgba(224, 222, 215, 0.4)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(`Scale: 1 unit = ${scale}px`, 15, height - 15);
    ctx.fillText(`M = ${mass.toFixed(1)} solar masses`, 15, 20);
    ctx.fillText(`Rs = ${eventHorizonRadius.toFixed(1)} units`, 15, 32);
    ctx.fillText(`Source: r = ${params.sourceDistance.toFixed(1)}, θ = ${params.sourceAngle}°`, 15, 44);

    // Escape/Capture Stats
    const capturedCount = rays.filter((r) => r.status === 'captured').length;
    const escapedCount = rays.length - capturedCount;
    const capturedPercent = ((capturedCount / rays.length) * 100).toFixed(0);

    ctx.fillStyle = '#ef4444';
    ctx.fillText(`Captured: ${capturedPercent}% (${capturedCount}/${rays.length})`, width - 160, 20);
    ctx.fillStyle = '#E0DED7';
    ctx.fillText(`Escaped: ${(100 - parseFloat(capturedPercent))}% (${escapedCount}/${rays.length})`, width - 160, 32);

  }, [
    params,
    scale,
    sourcePos.x,
    sourcePos.y,
    rays,
    animationOffset,
    iscoRadius,
    photonSphereRadius,
    eventHorizonRadius,
    mass,
  ]);

  // Handle Dragging / Resizing
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert mouse to math coordinates
    const mx = (x - cx) / scale;
    const my = (cy - y) / scale; // invert Y

    // Distance to source
    const dist = Math.sqrt((mx - sourcePos.x) ** 2 + (my - sourcePos.y) ** 2);
    if (dist < 1.5) {
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert mouse to math coordinates
    const mx = (x - cx) / scale;
    const my = (cy - y) / scale;

    const dist = Math.max(2.5, Math.sqrt(mx * mx + my * my));
    let angleRad = Math.atan2(my, mx);
    if (angleRad < 0) angleRad += Math.PI * 2;
    const angleDeg = (angleRad * 180) / Math.PI;

    onChangeParams({
      sourceDistance: Math.min(30.0, dist),
      sourceAngle: Math.round(angleDeg),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom controls
  const handleZoomIn = () => setScale((prev) => Math.min(60, prev + 2));
  const handleZoomOut = () => setScale((prev) => Math.max(8, prev - 2));

  return (
    <div className="flex flex-col h-full bg-[#050505] text-[#E0DED7] font-sans rounded-sm overflow-hidden border border-white/10 shadow-2xl">
      {/* Simulation Area */}
      <div className="relative flex-1 min-h-[350px] md:min-h-[450px]" ref={containerRef}>
        <canvas
          id="canvas-2d"
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-full block cursor-grab active:cursor-grabbing"
        />

        {/* Floating Canvas Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
          <div className="flex bg-white/[0.04] backdrop-blur-md rounded-none border border-white/10 p-1 shadow-lg">
            <button
              id="btn-play-pause-2d"
              onClick={() => onChangeParams({ isPaused: !params.isPaused })}
              className="p-1.5 hover:bg-white/10 rounded-none transition-colors text-slate-300 hover:text-white"
              title={params.isPaused ? 'Resume Simulation' : 'Pause Simulation'}
            >
              {params.isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button
              id="btn-reset-2d"
              onClick={() => onChangeParams({ rayAngle: 0, sourceDistance: 12, sourceAngle: 180, mass: 1.5 })}
              className="p-1.5 hover:bg-white/10 rounded-none transition-colors text-slate-300 hover:text-white"
              title="Reset View"
            >
              <RotateCcw size={16} />
            </button>
            <div className="w-[1px] bg-white/10 mx-1" />
            <button
              id="btn-zoom-in-2d"
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-white/10 rounded-none transition-colors font-mono text-xs text-slate-300 hover:text-white"
              title="Zoom In"
            >
              +
            </button>
            <button
              id="btn-zoom-out-2d"
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-white/10 rounded-none transition-colors font-mono text-xs text-slate-300 hover:text-white"
              title="Zoom Out"
            >
              -
            </button>
          </div>

          <button
            id="btn-info-toggle-2d"
            onClick={() => setShowExplanation(!showExplanation)}
            className="flex items-center justify-center bg-white/[0.04] backdrop-blur-md border border-white/10 hover:bg-white/10 px-3 py-1.5 rounded-none text-xs gap-1.5 shadow-lg transition-all"
          >
            {showExplanation ? <EyeOff size={13} /> : <Eye size={13} />}
            <span className="font-mono text-[10px] uppercase tracking-wider">{showExplanation ? 'Hide Guide' : 'Show Guide'}</span>
          </button>
        </div>

        {/* Explanation Overlay */}
        {showExplanation && (
          <div className="absolute bottom-4 left-4 right-4 md:right-auto md:max-w-md bg-black/90 backdrop-blur-md border border-white/10 rounded-sm p-4 shadow-2xl z-10 text-xs">
            <h4 className="font-serif italic text-white text-sm mb-1.5 flex items-center gap-1.5">
              <HelpCircle size={14} className="text-[#F27D26]" /> 2D Spacetime Sandbox Guide
            </h4>
            <p className="text-slate-300 leading-relaxed mb-3">
              Drag the <span className="text-[#F27D26] font-semibold">Light Source</span> to reposition it. Adjust the sliders in the control panel to inspect general relativity's gravitational light bending.
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                <span className="text-slate-300">Captured (Fall in)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E0DED7]" />
                <span className="text-slate-300">Escaped (Deflected)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F27D26]" />
                <span className="text-slate-300">Orbital Trajectory</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 border-t border-dashed border-[#F27D26]" />
                <span className="text-slate-400">Photon Sphere (3M)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Area for 2D params */}
      <div className="bg-white/[0.02] border-t border-white/10 p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Ray controls */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-slate-400 font-mono tracking-widest uppercase">RAY BEAM SOURCE</label>
            <div className="flex bg-white/5 border border-white/5 rounded-none p-0.5">
              <button
                id="btn-source-parallel"
                onClick={() => onChangeParams({ sourceType: 'parallel' })}
                className={`px-2 py-0.5 rounded-none text-[10px] font-mono transition-colors ${
                  params.sourceType === 'parallel' ? 'bg-[#F27D26]/15 text-[#F27D26] font-bold border border-[#F27D26]/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                Parallel
              </button>
              <button
                id="btn-source-point"
                onClick={() => onChangeParams({ sourceType: 'point' })}
                className={`px-2 py-0.5 rounded-none text-[10px] font-mono transition-colors ${
                  params.sourceType === 'point' ? 'bg-[#F27D26]/15 text-[#F27D26] font-bold border border-[#F27D26]/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                Point
              </button>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span>Ray Count:</span>
              <span className="text-[#F27D26] font-bold">{params.rayCount}</span>
            </div>
            <input
              id="slider-ray-count-2d"
              type="range"
              min="1"
              max="100"
              value={params.rayCount}
              onChange={(e) => onChangeParams({ rayCount: parseInt(e.target.value) })}
              className="w-full accent-[#F27D26] bg-white/10 rounded h-1 cursor-pointer"
            />
          </div>
        </div>

        {/* Angle / spread */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span>Source Heading Angle:</span>
              <span className="text-[#F27D26] font-bold">{params.rayAngle}°</span>
            </div>
            <input
              id="slider-ray-angle-2d"
              type="range"
              min="-180"
              max="180"
              value={params.rayAngle}
              onChange={(e) => onChangeParams({ rayAngle: parseInt(e.target.value) })}
              className="w-full accent-[#F27D26] bg-white/10 rounded h-1 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span>{params.sourceType === 'point' ? 'Beam Spread Angle:' : 'Beam Spacing:'}</span>
              <span className="text-[#F27D26] font-bold">
                {params.sourceType === 'point' ? `${params.raySpread}°` : (params.raySpread * 0.15).toFixed(1)}
              </span>
            </div>
            <input
              id="slider-ray-spread-2d"
              type="range"
              min="2"
              max="120"
              value={params.raySpread}
              onChange={(e) => onChangeParams({ raySpread: parseInt(e.target.value) })}
              className="w-full accent-[#F27D26] bg-white/10 rounded h-1 cursor-pointer"
            />
          </div>
        </div>

        {/* Physics rendering options */}
        <div className="flex flex-col justify-center gap-2">
          <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer hover:text-white">
            <input
              id="checkbox-photon-sphere-2d"
              type="checkbox"
              checked={params.showPhotonSphere}
              onChange={(e) => onChangeParams({ showPhotonSphere: e.target.checked })}
              className="rounded-none accent-[#F27D26] bg-white/[0.02] border-white/10"
            />
            Show Photon Sphere (r = 3M)
          </label>
          <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer hover:text-white">
            <input
              id="checkbox-event-horizon-2d"
              type="checkbox"
              checked={params.showEventHorizon}
              onChange={(e) => onChangeParams({ showEventHorizon: e.target.checked })}
              className="rounded-none accent-[#F27D26] bg-white/[0.02] border-white/10"
            />
            Show Event Horizon (r = 2M)
          </label>
          <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer hover:text-white">
            <input
              id="checkbox-deflection-2d"
              type="checkbox"
              checked={params.showDeflectionAngles}
              onChange={(e) => onChangeParams({ showDeflectionAngles: e.target.checked })}
              className="rounded-none accent-[#F27D26] bg-white/[0.02] border-white/10"
            />
            Show Flat Space Reference
          </label>
        </div>
      </div>
    </div>
  );
}
