/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Orbit, Compass, AlertTriangle, Activity, Clock, Zap, Sparkles } from 'lucide-react';
import { DEFAULT_PARAMS, SimulationParams } from './types';
import Sandbox2D from './components/Sandbox2D';
import Render3D from './components/Render3D';
import EducationPanel from './components/EducationPanel';
import MagicRings from './components/MagicRings';
import StarBorder from './components/StarBorder';
import LiquidEther from './components/LiquidEther';

// ── Disk ring colour helper (hue / sat / lum / alpha) ─────────────────────
function diskRingStyle(frac: number, baseAlpha: number): [number, number, number, number] {
  if (frac < 0.25) {
    // hot inner zone: blue-white → orange
    const h = 220 - frac * 4 * 160;
    const l = 72 - frac * 4 * 20;
    return [h, 80, l, (1 - frac * 0.5) * baseAlpha];
  }
  // cooler outer zone: orange → dark crimson
  const h = 30 - ((frac - 0.25) / 0.75) * 18;
  const s = 70 - (frac - 0.25) * 30;
  const l = 50 - (frac - 0.25) * 28;
  return [h, s, l, (1 - frac) * baseAlpha];
}

export default function App() {
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);
  const [activeTab, setActiveTab] = useState<'2d' | '3d' | 'rings'>('rings');
  const updateParams = (p: Partial<SimulationParams>) =>
    setParams((prev) => ({ ...prev, ...p }));

  // ── Schwarzschild readout values (live, driven by slider) ───────────────
  const M   = params.mass;
  const rs  = 2 * M;

  // Camera observer position
  const camR    = Math.max(params.cameraDistance, rs + 0.01);
  const camF    = Math.max(0, 1 - rs / camR);
  const camZ    = camF > 0 ? 1 / Math.sqrt(camF) - 1 : Infinity;
  const camTD   = Math.sqrt(camF);

  // ISCO (6M) and photon sphere (3M) — fixed reference rows
  const iscoF   = Math.max(0, 1 - rs / (6 * M));
  const iscoZ   = iscoF > 0 ? 1 / Math.sqrt(iscoF) - 1 : Infinity;
  const iscoTD  = Math.sqrt(iscoF);

  const phF     = Math.max(0, 1 - rs / (3 * M));
  const phZ     = phF > 0 ? 1 / Math.sqrt(phF) - 1 : Infinity;
  const phTD    = Math.sqrt(phF);

  const fmt = (x: number, d = 4) => (isFinite(x) ? x.toFixed(d) : '∞');

  // ── colour helper for redshift value chip ──────────────────────────────
  const zColour = (z: number) => {
    if (!isFinite(z) || z > 1)   return 'text-[#d9614f]';
    if (z > 0.15)                 return 'text-[#e8a33d]';
    return 'text-[#bfe3ff]';
  };

  // =========================================================================
  //  RENDER
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#050505] text-[#E0DED7] font-sans antialiased selection:bg-[#F27D26]/30 selection:text-white relative">

      {/* LiquidEther background — fixed, behind everything */}
      <div className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        <LiquidEther
          colors={[ '#5227FF', '#FF9FFC', '#B497CF' ]}
          mouseForce={20}
          cursorSize={100}
          isViscous={false}
          viscous={30}
          iterationsViscous={32}
          iterationsPoisson={32}
          resolution={0.5}
          isBounce={false}
          autoDemo={true}
          autoSpeed={0.5}
          autoIntensity={2.2}
          takeoverDuration={0.25}
          autoResumeDelay={3000}
          autoRampDuration={0.6}
        />
      </div>

      {/* Subtle amber vignette at the top */}
      <div
        className="fixed top-0 left-0 right-0 h-80 bg-gradient-to-b from-[#F27D26]/5 via-white/[0.01] to-transparent pointer-events-none"
        style={{ zIndex: 1 }}
      />

      {/* ── All page content (above canvas) ── */}
      <div className="relative" style={{ zIndex: 2 }}>

        {/* ── Header ── */}
        <header className="border-b border-white/10 bg-[#050505]/80 backdrop-blur-md px-6 md:px-10 py-5">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

            <div className="flex items-center gap-4">
              <div className="w-3.5 h-3.5 rounded-full bg-[#F27D26] shadow-[0_0_12px_#F27D26] shrink-0 animate-pulse" />
              <div>
                <h1 className="font-serif text-2xl tracking-[0.2em] uppercase text-white leading-none">
                  Stella Nova
                </h1>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1.5 font-mono">
                  Relativistic Schwarzschild Ray Tracer • General Relativity v4.2
                </p>
              </div>
            </div>

            <div className="hidden lg:flex gap-8 text-[11px] uppercase tracking-[0.15em] text-[#E0DED7]/60">
              <span onClick={() => setActiveTab('3d')} className={`cursor-pointer hover:text-white transition-colors ${activeTab === '3d' ? 'text-[#F27D26] font-bold' : ''}`}>
                3D Space Lensing
              </span>
              <span onClick={() => setActiveTab('2d')} className={`cursor-pointer hover:text-white transition-colors ${activeTab === '2d' ? 'text-[#F27D26] font-bold' : ''}`}>
                2D Geodesic Sandbox
              </span>
              <span onClick={() => setActiveTab('rings')} className={`cursor-pointer hover:text-white transition-colors ${activeTab === 'rings' ? 'text-[#F27D26] font-bold' : ''}`}>
                Magic Spacetime Rings
              </span>
              <span className="opacity-30">Redshift Metrics</span>
            </div>

            {/* Live stats pill */}
            <div className="flex items-center gap-3 bg-white/[0.02] border border-white/10 px-3.5 py-1.5 rounded-sm text-[11px] font-mono tracking-wider">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Activity size={12} className="text-[#F27D26]" />
                HORIZON (Rs):
              </span>
              <span className="text-white font-bold">{rs.toFixed(1)}M</span>
              <span className="w-px h-3 bg-white/10 mx-1" />
              <span className="text-slate-400">PHOTON SPHERE:</span>
              <span className="text-[#F27D26] font-bold">{(M * 3).toFixed(1)}M</span>
            </div>
          </div>
        </header>

        {/* ── Main grid ── */}
        <main className="max-w-7xl mx-auto px-6 py-6 md:py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left: simulation stage */}
          <section className="lg:col-span-8 flex flex-col gap-5">

            {/* Tab bar */}
            <div className="flex justify-between items-center bg-white/[0.02] border border-white/10 rounded-sm p-1">
              <div className="flex gap-1">
                {activeTab === '3d' ? (
                  <StarBorder color="#F27D26" speed="4s" thickness={1} className="rounded-sm">
                    <div className="flex items-center gap-2 px-4 py-2 font-mono text-[10px] uppercase tracking-wider bg-[#F27D26]/10 text-[#F27D26] font-bold">
                      <Compass size={13} /> 3D Relativistic Render
                    </div>
                  </StarBorder>
                ) : (
                  <button
                    onClick={() => setActiveTab('3d')}
                    className="flex items-center gap-2 px-4 py-2 rounded-sm font-mono text-[10px] uppercase tracking-wider transition-all text-slate-400 hover:text-white"
                  >
                    <Compass size={13} /> 3D Relativistic Render
                  </button>
                )}
                {activeTab === '2d' ? (
                  <StarBorder color="#F27D26" speed="4s" thickness={1} className="rounded-sm">
                    <div className="flex items-center gap-2 px-4 py-2 font-mono text-[10px] uppercase tracking-wider bg-[#F27D26]/10 text-[#F27D26] font-bold">
                      <Orbit size={13} /> 2D Geodesic Sandbox
                    </div>
                  </StarBorder>
                ) : (
                  <button
                    onClick={() => setActiveTab('2d')}
                    className="flex items-center gap-2 px-4 py-2 rounded-sm font-mono text-[10px] uppercase tracking-wider transition-all text-slate-400 hover:text-white"
                  >
                    <Orbit size={13} /> 2D Geodesic Sandbox
                  </button>
                )}
                {activeTab === 'rings' ? (
                  <StarBorder color="#F27D26" speed="4s" thickness={1} className="rounded-sm">
                    <div className="flex items-center gap-2 px-4 py-2 font-mono text-[10px] uppercase tracking-wider bg-[#F27D26]/10 text-[#F27D26] font-bold">
                      <Sparkles size={13} /> Magic Rings
                    </div>
                  </StarBorder>
                ) : (
                  <button
                    onClick={() => setActiveTab('rings')}
                    className="flex items-center gap-2 px-4 py-2 rounded-sm font-mono text-[10px] uppercase tracking-wider transition-all text-slate-400 hover:text-white"
                  >
                    <Sparkles size={13} /> Magic Rings
                  </button>
                )}
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 font-mono text-[9px] uppercase tracking-wider text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F27D26] animate-ping" />
                <span>GPU Tensor Active</span>
              </div>
            </div>

            {/* Viewport */}
            <div className="flex-1 min-h-[480px] relative">
              {activeTab === '3d' && <Render3D params={params} onChangeParams={updateParams} />}
              {activeTab === '2d' && <Sandbox2D params={params} onChangeParams={updateParams} />}
              {activeTab === 'rings' && (
                <div className="w-full h-full min-h-[480px] bg-[#050505] border border-white/10 rounded-sm relative overflow-hidden flex flex-col items-center justify-center p-6 shadow-2xl">
                  <div className="absolute top-4 left-4 flex flex-col gap-1 pointer-events-none font-mono text-[10px] text-slate-400 bg-black/90 p-3 rounded-none border border-white/10 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles size={11} className="text-[#F27D26]" />
                      <span className="text-white uppercase font-bold tracking-wider">Magic Rings HUD</span>
                    </div>
                    <div>Interactive spacetime ripples</div>
                    <div>Click to burst · Drag/Hover to distort</div>
                  </div>
                  <div className="w-full h-[400px] relative">
                    <MagicRings
                      color="#F27D26"
                      colorTwo="#42fcff"
                      ringCount={6}
                      speed={1}
                      attenuation={8}
                      lineThickness={2}
                      baseRadius={0.35}
                      radiusStep={0.08}
                      scaleRate={0.12}
                      opacity={1}
                      blur={0}
                      noiseAmount={0.08}
                      rotation={30}
                      ringGap={1.4}
                      fadeIn={0.6}
                      fadeOut={0.65}
                      followMouse={true}
                      mouseInfluence={0.22}
                      hoverScale={1.15}
                      parallax={0.06}
                      clickBurst={true}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Right: control panel */}
          <section className="lg:col-span-4 flex flex-col gap-6">

            {/* ── Schwarzschild Metric card ── */}
            <div className="bg-white/[0.02] border border-white/10 rounded-sm p-6 shadow-2xl backdrop-blur-sm flex flex-col gap-5">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#F27D26] font-mono mb-1">System Profile</p>
                <h2 className="text-2xl font-serif italic text-white">Schwarzschild Metric</h2>
              </div>

              {/* Mass slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono tracking-wider text-[#E0DED7]/70">
                  <span>MASS (M☉)</span>
                  <span className="text-white font-bold">{M.toFixed(2)}m</span>
                </div>
                <input
                  type="range" min="0.5" max="3.0" step="0.05"
                  value={M}
                  onChange={(e) => updateParams({ mass: parseFloat(e.target.value) })}
                  className="w-full accent-[#F27D26] bg-white/10 rounded h-1 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 leading-relaxed font-serif italic">
                  Warps photon sphere (r = 3M) and event horizon (r = 2M).
                </p>
              </div>

              <div className="flex justify-between text-[10px] font-mono text-slate-500 border-t border-white/5 pt-4">
                <span>ALGORITHM</span><span className="text-white">RUNGE-KUTTA 4</span>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>SINGULARITY TYPE</span>
                <span className="text-[#F27D26] uppercase font-bold tracking-widest">NON-ROTATING</span>
              </div>

              <div className="bg-[#F27D26]/5 border border-[#F27D26]/10 rounded-sm p-4 text-slate-300 text-xs flex gap-3">
                <AlertTriangle size={15} className="text-[#F27D26] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white font-serif italic">Relativistic Warp Zone</strong>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Inside r = 2M, all future-pointing paths lead to the singularity.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Gravitational Redshift & Time Dilation readout ── */}
            <div className="bg-white/[0.02] border border-white/10 border-t-[#F27D26] rounded-sm shadow-2xl backdrop-blur-sm overflow-hidden"
                 style={{ borderTopColor: '#e8a33d', borderTopWidth: 2 }}>

              {/* Header */}
              <div className="px-5 pt-4 pb-3 border-b border-white/5 flex items-center gap-2">
                <Zap size={12} className="text-[#F27D26]" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#F27D26] font-bold">
                  Gravitational Readout
                </span>
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#F27D26] animate-pulse" />
              </div>

              <div className="px-5 py-4 space-y-4">

                {/* Formula line */}
                <div className="font-mono text-[9.5px] text-slate-500 leading-relaxed bg-white/[0.02] border border-white/5 rounded-sm px-3 py-2">
                  <span className="text-[#e8a33d]">z(r)</span> = 1/√(1−2M/r) − 1
                  &nbsp;&nbsp;
                  <span className="text-[#e8a33d]">τ/t</span> = √(1−2M/r)
                </div>

                {/* Camera observer row */}
                <div>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-2">
                    Observer at camera ({camR.toFixed(1)}M)
                  </p>
                  <div className="grid grid-cols-2 gap-px bg-white/5 border border-white/5">
                    <div className="bg-[#0b0d14] px-3 py-2.5">
                      <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Zap size={9} /> Redshift z
                      </div>
                      <div className={`font-mono text-lg font-medium leading-none ${zColour(camZ)}`}>
                        {fmt(camZ)}
                      </div>
                    </div>
                    <div className="bg-[#0b0d14] px-3 py-2.5">
                      <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Clock size={9} /> Time Dilation τ/t
                      </div>
                      <div className={`font-mono text-lg font-medium leading-none ${camTD < 0.85 ? 'text-[#e8a33d]' : 'text-[#bfe3ff]'}`}>
                        {fmt(camTD)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reference rows */}
                <div>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-2">
                    Reference radii (M = {M.toFixed(2)})
                  </p>
                  <div className="space-y-px">
                    {[
                      { label: 'ISCO  r = 6M',  z: iscoZ,  td: iscoTD },
                      { label: 'Photon  r = 3M', z: phZ,    td: phTD   },
                    ].map(({ label, z, td }) => (
                      <div key={label} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center bg-white/[0.015] border border-white/[0.04] px-3 py-2 text-[10px] font-mono">
                        <span className="text-slate-400">{label}</span>
                        <span className={`${zColour(z)} tabular-nums`}>z={fmt(z, 3)}</span>
                        <span className={`${td < 0.85 ? 'text-[#e8a33d]' : 'text-[#bfe3ff]'} tabular-nums`}>τ/t={fmt(td, 4)}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* ── Education Panel ── */}
            <div className="flex-1">
              <EducationPanel />
            </div>

            <footer className="text-center py-4 border-t border-white/5">
              <p className="text-[9px] font-mono tracking-widest text-slate-600 uppercase">
                Stella Nova Raytracer • Einstein Field Equations v4.2
              </p>
            </footer>
          </section>
        </main>

      </div>{/* end z-index wrapper */}
    </div>
  );
}
