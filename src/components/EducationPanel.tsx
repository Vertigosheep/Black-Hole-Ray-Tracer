import React, { useState } from 'react';
import { BookOpen, Sparkles, Orbit, AlertCircle, HelpCircle } from 'lucide-react';

export default function EducationPanel() {
  const [activeTab, setActiveTab] = useState<'lensing' | 'sphere' | 'horizon' | 'doppler' | 'isco'>('lensing');

  const tabs = [
    {
      id: 'lensing' as const,
      label: 'Gravitational Lensing',
      icon: <Sparkles size={13} />,
      title: 'Light Deflection & Einstein Rings',
      content: (
        <>
          <p className="mb-3">
            In Albert Einstein's theory of <strong className="text-white font-serif italic">General Relativity</strong>, mass curves the fabric of spacetime. Light always travels along the shortest path between two points (a geodesic). Near a massive object like a black hole, these geodesics bend toward the center of gravity.
          </p>
          <p className="mb-3">
            This creates <strong className="text-white">gravitational lensing</strong>: background stars have their light focused and bent around the black hole. When a star is located directly behind the black hole, its lensed light is warped into a perfect circle called an <strong className="text-white font-serif italic">Einstein Ring</strong>.
          </p>
          <div className="bg-white/[0.02] rounded-sm p-3 border border-white/10 font-mono text-[10px] text-slate-300">
            <span className="text-[#F27D26] font-bold uppercase tracking-wider">Deflection Formula:</span><br />
            &alpha; &approx; 4GM / (c² * b)<br />
            <span className="text-slate-500 text-[9px] block mt-1">where b is the impact parameter (distance of closest approach).</span>
          </div>
        </>
      ),
    },
    {
      id: 'sphere' as const,
      label: 'Photon Sphere',
      icon: <Orbit size={13} />,
      title: 'The Photon Sphere (r = 3M)',
      content: (
        <>
          <p className="mb-3">
            The <strong className="text-white font-serif italic">Photon Sphere</strong> is a spherical region of space at a radius of exactly <strong className="text-white font-mono">3M</strong>. At this boundary, gravity is so intense that photons are forced to travel in unstable circular orbits!
          </p>
          <p className="mb-3">
            These orbits are highly unstable: any tiny microscopic deviation or vibration will cause the photon to either plunge into the event horizon or escape out to infinity.
          </p>
          <div className="bg-[#F27D26]/5 rounded-sm p-3 border border-[#F27D26]/20 text-slate-300 text-xs flex gap-2">
            <AlertCircle size={15} className="text-[#F27D26] shrink-0 mt-0.5" />
            <span>
              <strong className="text-white font-serif italic">Astrophysics Mind-bender:</strong> If you stood on the photon sphere and pointed a flashlight horizontally, the emitted photons would orbit the black hole and strike you in the back of your head!
            </span>
          </div>
        </>
      ),
    },
    {
      id: 'horizon' as const,
      label: 'Event Horizon',
      icon: <AlertCircle size={13} />,
      title: 'The Schwarzschild Radius (r = 2M)',
      content: (
        <>
          <p className="mb-3">
            The <strong className="text-white font-serif italic">Event Horizon</strong> is the boundary of no return. Its radius is called the <strong className="text-white">Schwarzschild Radius (R_s)</strong>, defined as:
          </p>
          <div className="bg-white/[0.03] rounded-sm p-3 text-center border border-white/10 font-mono text-sm text-[#F27D26] mb-3 font-bold tracking-wider">
            R_s = 2GM / c²
          </div>
          <p className="mb-3">
            Inside this horizon, the curvature of spacetime is so extreme that all physical paths point inward toward the singularity. To escape, an object would need to travel faster than the speed of light, which is physically impossible.
          </p>
          <p>
            This is why the black hole is a black shadow in our ray tracer—any light ray crossing <strong className="text-white font-mono">r &le; 2M</strong> is permanently captured and can never reach the observer.
          </p>
        </>
      ),
    },
    {
      id: 'doppler' as const,
      label: 'Doppler Beaming',
      icon: <HelpCircle size={13} />,
      title: 'Relativistic Doppler Beaming',
      content: (
        <>
          <p className="mb-3">
            The accretion disk of a black hole rotates at high relativistic speeds. Because of this, we observe an asymmetrical brightness distribution known as <strong className="text-white">Doppler beaming</strong> or <strong className="text-white font-serif italic">relativistic beaming</strong>.
          </p>
          <p className="mb-3">
            The gas rotating <strong className="text-[#F27D26] font-bold">toward</strong> the observer (the left side, in our standard counter-clockwise configuration) emits light that is blueshifted, making it look hotter, brighter, and more energetic.
          </p>
          <p>
            Conversely, the gas rotating <strong className="text-slate-400 font-bold">away</strong> from us (the right side) is redshifted, appearing cooler, dimmer, and highly faded. This is why realistic accretion disks are highly asymmetrical!
          </p>
        </>
      ),
    },
    {
      id: 'isco' as const,
      label: 'ISCO Bound',
      icon: <BookOpen size={13} />,
      title: 'Innermost Stable Circular Orbit (r = 6M)',
      content: (
        <>
          <p className="mb-3">
            For matter with mass (like the gas in an accretion disk), the closest distance they can orbit stably around a Schwarzschild black hole is the <strong className="text-white">Innermost Stable Circular Orbit (ISCO)</strong> at <strong className="text-white font-mono">r = 6M</strong>.
          </p>
          <p className="mb-3">
            Any gas that wanders closer than 6M loses its orbital stability and begins a rapid, inevitable spiral plunge into the event horizon.
          </p>
          <p>
            This explains why accretion disks typically fade out or have an empty "hole" inside the ISCO boundary before reaching the event horizon!
          </p>
        </>
      ),
    },
  ];

  const activeTabObj = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-sm p-5 shadow-2xl backdrop-blur-sm flex flex-col h-full">
      <div className="flex items-center gap-2.5 mb-4">
        <BookOpen size={15} className="text-[#F27D26]" />
        <h3 className="font-mono text-xs font-bold text-white uppercase tracking-widest">Astrophysics Reference</h3>
      </div>

      {/* Tabs navigation */}
      <div className="grid grid-cols-5 gap-1 border-b border-white/5 pb-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-2 px-1 rounded-none flex flex-col items-center gap-1.5 text-[9px] font-mono transition-all text-center leading-tight ${
              activeTab === tab.id
                ? 'bg-[#F27D26]/10 text-[#F27D26] font-bold border border-[#F27D26]/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Active Tab Content */}
      <div className="flex-1 overflow-y-auto pr-1">
        <h4 className="font-serif italic text-base text-white mb-2.5">{activeTabObj.title}</h4>
        <div className="text-xs text-[#E0DED7]/80 leading-relaxed space-y-2">
          {activeTabObj.content}
        </div>
      </div>
    </div>
  );
}

