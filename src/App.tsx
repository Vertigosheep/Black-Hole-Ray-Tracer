/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Orbit, Compass, Sliders, AlertTriangle, HelpCircle, Activity } from 'lucide-react';
import { DEFAULT_PARAMS, SimulationParams } from './types';
import Sandbox2D from './components/Sandbox2D';
import Render3D from './components/Render3D';
import EducationPanel from './components/EducationPanel';

export default function App() {
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);
  const [activeTab, setActiveTab] = useState<'2d' | '3d'>('3d');

  const updateParams = (newParams: Partial<SimulationParams>) => {
    setParams((prev) => ({ ...prev, ...newParams }));
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#E0DED7] font-sans antialiased selection:bg-[#F27D26]/30 selection:text-white">
      {/* Background Cosmic Atmosphere */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-[#F27D26]/5 via-white/[0.01] to-transparent pointer-events-none" />

      {/* Main Header */}
      <header id="main-header" className="relative border-b border-white/10 bg-[#050505]/80 backdrop-blur-md px-6 md:px-10 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-3.5 h-3.5 rounded-full bg-[#F27D26] shadow-[0_0_12px_#F27D26] shrink-0 animate-pulse"></div>
            <div>
              <h1 className="font-serif text-2xl tracking-[0.2em] uppercase text-white leading-none">
                Stella Nova
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1.5 font-mono">
                Relativistic Schwarzschild Ray Tracer • General Relativity v4.2
              </p>
            </div>
          </div>

          {/* Elegant navigation links matching the design profile */}
          <div className="hidden lg:flex gap-8 text-[11px] uppercase tracking-[0.15em] text-[#E0DED7]/60">
            <span 
              onClick={() => setActiveTab('3d')} 
              className={`hover:text-white cursor-pointer transition-colors ${activeTab === '3d' ? 'text-[#F27D26] font-bold' : ''}`}
            >
              3D Space Lensing
            </span>
            <span 
              onClick={() => setActiveTab('2d')} 
              className={`hover:text-white cursor-pointer transition-colors ${activeTab === '2d' ? 'text-[#F27D26] font-bold' : ''}`}
            >
              2D Geodesic Sandbox
            </span>
            <span className="opacity-30">Photon Sphere</span>
            <span className="opacity-30">Redshift Metrics</span>
          </div>

          {/* Quick Stats Banner formatted in Sophisticated style */}
          <div className="flex items-center gap-3 bg-white/[0.02] border border-white/10 px-3.5 py-1.5 rounded-sm text-[11px] font-mono tracking-wider">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Activity size={12} className="text-[#F27D26]" />
              HORIZON (Rs):
            </span>
            <span className="text-white font-bold">{(params.mass * 2).toFixed(1)}M</span>
            <span className="w-[1px] h-3 bg-white/10 mx-1" />
            <span className="text-slate-400">PHOTON SPHERE:</span>
            <span className="text-[#F27D26] font-bold">{(params.mass * 3).toFixed(1)}M</span>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="max-w-7xl mx-auto px-6 py-6 md:py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
        
        {/* Left Side: Simulation Stage */}
        <section id="simulation-stage" className="lg:col-span-8 flex flex-col gap-5">
          
          {/* Tab Navigation Controls */}
          <div className="flex justify-between items-center bg-white/[0.02] border border-white/10 rounded-sm p-1">
            <div className="flex gap-1">
              <button
                id="btn-tab-3d"
                onClick={() => setActiveTab('3d')}
                className={`flex items-center gap-2 px-4 py-2 rounded-sm font-mono text-[10px] uppercase tracking-wider transition-all ${
                  activeTab === '3d'
                    ? 'bg-[#F27D26]/10 text-[#F27D26] font-bold border border-[#F27D26]/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Compass size={13} />
                3D Relativistic Render
              </button>
              <button
                id="btn-tab-2d"
                onClick={() => setActiveTab('2d')}
                className={`flex items-center gap-2 px-4 py-2 rounded-sm font-mono text-[10px] uppercase tracking-wider transition-all ${
                  activeTab === '2d'
                    ? 'bg-[#F27D26]/10 text-[#F27D26] font-bold border border-[#F27D26]/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Orbit size={13} />
                2D Geodesic Sandbox
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 font-mono text-[9px] uppercase tracking-wider text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F27D26] animate-ping" />
              <span>GPU Tensor Active</span>
            </div>
          </div>

          {/* Interactive Stage Viewports */}
          <div className="flex-1 min-h-[480px]">
            {activeTab === '3d' ? (
              <Render3D params={params} onChangeParams={updateParams} />
            ) : (
              <Sandbox2D params={params} onChangeParams={updateParams} />
            )}
          </div>
        </section>

        {/* Right Side: Global Settings & Education Panel */}
        <section id="control-panel" className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Core Black Hole Metrics Card */}
          <div className="bg-white/[0.02] border border-white/10 rounded-sm p-6 shadow-2xl backdrop-blur-sm flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] uppercase tracking-widest text-[#F27D26] font-mono">System Profile</p>
              <h2 className="text-2xl font-serif italic text-white">Schwarzschild Metric</h2>
            </div>

            {/* Slider: Mass M */}
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-mono tracking-wider text-[#E0DED7]/70">
                <span>MASS (M☉)</span>
                <span className="text-white font-bold">{params.mass.toFixed(2)}m</span>
              </div>
              <input
                id="slider-mass-global"
                type="range"
                min="0.5"
                max="3.0"
                step="0.05"
                value={params.mass}
                onChange={(e) => updateParams({ mass: parseFloat(e.target.value) })}
                className="w-full accent-[#F27D26] bg-white/10 rounded h-1 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400 leading-relaxed font-serif italic">
                Spatially warps the photon sphere (r = 3M) and event horizon (r = 2M) boundaries.
              </p>
            </div>

            {/* General Relativity Zone stats indicator */}
            <div className="border-t border-white/5 pt-4 flex justify-between items-center text-[10px] font-mono text-slate-500">
              <span>ALGORITHM</span>
              <span className="text-white">RUNGE-KUTTA 4 (RK4)</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
              <span>SINGULARITY TYPE</span>
              <span className="text-[#F27D26] tracking-widest uppercase font-bold">NON-ROTATING</span>
            </div>

            {/* Advisory Panel */}
            <div className="bg-[#F27D26]/5 border border-[#F27D26]/10 rounded-sm p-4 text-slate-300 text-xs flex gap-3">
              <AlertTriangle size={15} className="text-[#F27D26] shrink-0 mt-0.5" />
              <div>
                <strong className="text-white font-serif italic">Relativistic Warp Zone</strong>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Inside the Schwarzschild boundary, standard spacetime dimensions swap coordinate signs. Photons plunge directly into the gravitational singularity.
                </p>
              </div>
            </div>
          </div>

          {/* Education Panel */}
          <div className="flex-1">
            <EducationPanel />
          </div>

          {/* Footer Metadata */}
          <footer className="text-center py-4 border-t border-white/5">
            <p className="text-[9px] font-mono tracking-widest text-slate-600 uppercase">
              Stella Nova Raytracer • Einstein Field Equations v4.2
            </p>
          </footer>
        </section>

      </main>
    </div>
  );
}

