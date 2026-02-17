'use client';

import { useState } from 'react';

const LOGOS: { id: number; name: string; desc: string; bg: string; svg: React.ReactNode }[] = [
  {
    id: 1,
    name: 'Ascending Ingots',
    desc: 'Gold bar shapes with trapezoidal tops rising like a chart',
    bg: 'bg-gradient-to-br from-amber-400 to-amber-600',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        <rect x="2" y="15" width="5.5" height="6" rx="0.6" fill="white" fillOpacity="0.95" />
        <path d="M2.7 15 L3.3 13.5 L6.8 13.5 L7.5 15Z" fill="white" fillOpacity="0.65" />
        <rect x="9.25" y="10" width="5.5" height="11" rx="0.6" fill="white" fillOpacity="0.95" />
        <path d="M9.95 10 L10.55 8.5 L14.05 8.5 L14.75 10Z" fill="white" fillOpacity="0.65" />
        <rect x="16.5" y="5" width="5.5" height="16" rx="0.6" fill="white" fillOpacity="0.95" />
        <path d="M17.2 5 L17.8 3.5 L21.3 3.5 L22 5Z" fill="white" fillOpacity="0.65" />
      </svg>
    ),
  },
  {
    id: 2,
    name: 'Bullion Pulse',
    desc: 'Gold bar with a market pulse / heartbeat line through it',
    bg: 'bg-gradient-to-br from-amber-400 to-amber-600',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        {/* Gold bar body */}
        <rect x="3" y="8" width="18" height="10" rx="1.2" fill="white" fillOpacity="0.9" />
        {/* Trapezoidal top bevel */}
        <path d="M4.2 8 L5.5 5.5 L18.5 5.5 L19.8 8Z" fill="white" fillOpacity="0.6" />
        {/* Pulse line */}
        <polyline
          points="1,13.5 6,13.5 8,10 10,16 12,9 14,15 16,11 18,13.5 23,13.5"
          stroke="#d97706"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    ),
  },
  {
    id: 3,
    name: 'Stacked Plates',
    desc: 'Three offset metal plates suggesting depth and data layers',
    bg: 'bg-gradient-to-br from-zinc-400 to-zinc-600',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        {/* Bottom plate */}
        <rect x="3" y="14" width="18" height="3.5" rx="0.8" fill="white" fillOpacity="0.5" />
        {/* Middle plate */}
        <rect x="3" y="10" width="18" height="3.5" rx="0.8" fill="white" fillOpacity="0.7" />
        {/* Top plate — brightest */}
        <rect x="3" y="6" width="18" height="3.5" rx="0.8" fill="white" fillOpacity="0.95" />
        {/* Shine line on top plate */}
        <line x1="5" y1="7.2" x2="12" y2="7.2" stroke="white" strokeWidth="0.6" strokeOpacity="0.5" strokeLinecap="round" />
        {/* Trend arrow overlay */}
        <line x1="5" y1="19" x2="19" y2="4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.4" />
        <polyline points="15,4 19,4 19,8" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeOpacity="0.4" />
      </svg>
    ),
  },
  {
    id: 4,
    name: 'Chart Crown',
    desc: 'A crown whose points are bar-chart heights — precious & powerful',
    bg: 'bg-gradient-to-br from-amber-400 to-yellow-500',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        {/* Crown shape with chart-like peaks */}
        <path
          d="M3 17 L3 9 L7 12 L12 5 L17 12 L21 9 L21 17Z"
          fill="white"
          fillOpacity="0.92"
        />
        {/* Crown base band */}
        <rect x="3" y="17" width="18" height="2.5" rx="0.6" fill="white" fillOpacity="0.95" />
        {/* Jewel dots */}
        <circle cx="8" cy="18.2" r="0.8" fill="#d97706" fillOpacity="0.5" />
        <circle cx="12" cy="18.2" r="0.8" fill="#d97706" fillOpacity="0.5" />
        <circle cx="16" cy="18.2" r="0.8" fill="#d97706" fillOpacity="0.5" />
      </svg>
    ),
  },
  {
    id: 5,
    name: 'Vault Shield',
    desc: 'Gold & silver split shield with ascending bars — precious metals + data',
    bg: 'bg-black',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        <defs>
          {/* Gold half (left) */}
          <linearGradient id="vs-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          {/* Silver half (right) */}
          <linearGradient id="vs-silver" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4d4d8" />
            <stop offset="100%" stopColor="#a1a1aa" />
          </linearGradient>
          {/* Clip top-left diagonal */}
          <clipPath id="vs-left">
            <polygon points="0,0 24,0 0,24" />
          </clipPath>
          {/* Clip bottom-right diagonal */}
          <clipPath id="vs-right">
            <polygon points="24,0 24,24 0,24" />
          </clipPath>
        </defs>
        {/* Shield shape — gold left half */}
        <path
          d="M12 2 L21 6 L21 12 C21 17.5 16.5 21 12 22 C7.5 21 3 17.5 3 12 L3 6Z"
          fill="url(#vs-gold)"
          clipPath="url(#vs-left)"
        />
        {/* Shield shape — silver right half */}
        <path
          d="M12 2 L21 6 L21 12 C21 17.5 16.5 21 12 22 C7.5 21 3 17.5 3 12 L3 6Z"
          fill="url(#vs-silver)"
          clipPath="url(#vs-right)"
        />
        {/* Subtle shield outline */}
        <path
          d="M12 2 L21 6 L21 12 C21 17.5 16.5 21 12 22 C7.5 21 3 17.5 3 12 L3 6Z"
          fill="none"
          stroke="white"
          strokeWidth="0.6"
          strokeOpacity="0.3"
        />
        {/* Diagonal dividing line */}
        <line x1="3.5" y1="20" x2="20.5" y2="3.5" stroke="white" strokeWidth="0.5" strokeOpacity="0.25" />
        {/* Three ascending bars inside — dark for contrast */}
        <rect x="6.5" y="14" width="2.5" height="4.5" rx="0.4" fill="white" fillOpacity="0.95" />
        <rect x="10.75" y="11" width="2.5" height="7.5" rx="0.4" fill="white" fillOpacity="0.95" />
        <rect x="15" y="7.5" width="2.5" height="11" rx="0.4" fill="white" fillOpacity="0.95" />
      </svg>
    ),
  },
  {
    id: 6,
    name: 'Coin Chart',
    desc: 'Circular coin shape with bars inside — precious metals + analytics',
    bg: 'bg-gradient-to-br from-yellow-400 to-amber-500',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        {/* Outer coin ring */}
        <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.6" strokeOpacity="0.9" fill="white" fillOpacity="0.08" />
        {/* Inner ring */}
        <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="0.6" strokeOpacity="0.4" fill="none" />
        {/* Ascending bars */}
        <rect x="6" y="14" width="2.8" height="4" rx="0.4" fill="white" fillOpacity="0.9" />
        <rect x="10.6" y="10.5" width="2.8" height="7.5" rx="0.4" fill="white" fillOpacity="0.9" />
        <rect x="15.2" y="7" width="2.8" height="11" rx="0.4" fill="white" fillOpacity="0.9" />
      </svg>
    ),
  },
  {
    id: 7,
    name: 'Anvil Mark',
    desc: 'Minimalist anvil silhouette — the classic symbol of metalwork',
    bg: 'bg-gradient-to-br from-zinc-500 to-zinc-700',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        {/* Anvil body */}
        <path
          d="M4 11 C4 9 6 8 8 8 L20 8 C21 8 22 9 21 10.5 L19 13 L17 13 L17 17 L7 17 L7 13 L4.5 13Z"
          fill="white"
          fillOpacity="0.92"
        />
        {/* Anvil base */}
        <rect x="5" y="17" width="14" height="2.5" rx="0.8" fill="white" fillOpacity="0.95" />
        {/* Shine */}
        <line x1="9" y1="10" x2="17" y2="10" stroke="white" strokeWidth="0.7" strokeOpacity="0.3" strokeLinecap="round" />
        {/* Small spark */}
        <line x1="14" y1="3.5" x2="14" y2="6" stroke="white" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.7" />
        <line x1="11" y1="4.5" x2="12.5" y2="6.5" stroke="white" strokeWidth="0.8" strokeLinecap="round" strokeOpacity="0.5" />
        <line x1="17" y1="4.5" x2="15.5" y2="6.5" stroke="white" strokeWidth="0.8" strokeLinecap="round" strokeOpacity="0.5" />
      </svg>
    ),
  },
  {
    id: 8,
    name: 'Abstract Au',
    desc: 'Stylized "Au" (gold element symbol) with a modern geometric feel',
    bg: 'bg-gradient-to-br from-amber-400 to-amber-600',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        {/* "A" shape */}
        <path
          d="M3 19 L9 4 L15 19"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeOpacity="0.95"
        />
        {/* A crossbar */}
        <line x1="5.5" y1="14" x2="12.5" y2="14" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.7" />
        {/* "u" shape */}
        <path
          d="M15 9 L15 16 C15 18 16.5 19 18 19 C19.5 19 21 18 21 16 L21 9"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeOpacity="0.95"
        />
      </svg>
    ),
  },
  {
    id: 9,
    name: 'Molten Pour',
    desc: 'Liquid metal pouring from a crucible, forming an upward trend',
    bg: 'bg-gradient-to-br from-orange-400 to-red-500',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        {/* Crucible / ladle */}
        <path
          d="M2 6 C2 4.5 3.5 3.5 5 4 L9 5.5 C10 5.8 10 7 9 7.5 L4 9 C2.5 9.5 2 8.5 2 7.5Z"
          fill="white"
          fillOpacity="0.85"
        />
        {/* Molten stream flowing down then curving into an upward trend */}
        <path
          d="M7 8 C9 11 8 14 10 16 C12 18 14 17 16 14 C18 11 19 8 21 5"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeOpacity="0.9"
        />
        {/* Droplets */}
        <circle cx="21" cy="4.5" r="1.2" fill="white" fillOpacity="0.9" />
        <circle cx="12" cy="20" r="0.9" fill="white" fillOpacity="0.5" />
        <circle cx="9" cy="19" r="0.6" fill="white" fillOpacity="0.35" />
      </svg>
    ),
  },
  {
    id: 10,
    name: 'Gem Facet',
    desc: 'Geometric diamond / gemstone with faceted interior lines',
    bg: 'bg-gradient-to-br from-cyan-400 to-blue-600',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        {/* Diamond outline */}
        <path
          d="M12 2 L22 9 L12 22 L2 9Z"
          fill="white"
          fillOpacity="0.12"
          stroke="white"
          strokeWidth="1.4"
          strokeLinejoin="round"
          strokeOpacity="0.9"
        />
        {/* Top facet line */}
        <line x1="2" y1="9" x2="22" y2="9" stroke="white" strokeWidth="1" strokeOpacity="0.6" />
        {/* Left facets */}
        <line x1="7" y1="2.8" x2="6" y2="9" stroke="white" strokeWidth="0.8" strokeOpacity="0.4" />
        <line x1="17" y1="2.8" x2="18" y2="9" stroke="white" strokeWidth="0.8" strokeOpacity="0.4" />
        {/* Center facet lines to bottom point */}
        <line x1="6" y1="9" x2="12" y2="22" stroke="white" strokeWidth="0.8" strokeOpacity="0.35" />
        <line x1="18" y1="9" x2="12" y2="22" stroke="white" strokeWidth="0.8" strokeOpacity="0.35" />
        <line x1="12" y1="2" x2="12" y2="9" stroke="white" strokeWidth="0.8" strokeOpacity="0.35" />
        {/* Shine highlight */}
        <path d="M8 6.5 L12 5 L10 9Z" fill="white" fillOpacity="0.2" />
      </svg>
    ),
  },
];

export default function LogoPreview() {
  const [selected, setSelected] = useState(0);
  const active = LOGOS[selected];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Live navbar preview */}
      <div className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl">
        <div className="w-full px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg ${active.bg} flex items-center justify-center shadow-sm p-1.5 transition-all duration-300`}>
                {active.svg}
              </div>
              <span className="text-base font-black tracking-tight text-white uppercase">
                Heavy Metal Stats
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">
              <span>Dashboard</span>
              <span>Precious Metals</span>
              <span>Learn</span>
              <span>Delivery</span>
              <span className="hidden sm:inline">API</span>
              <span className="hidden sm:inline">About</span>
            </div>
          </div>
        </div>
      </div>

      {/* Page content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-black tracking-tight mb-2">Logo Preview</h1>
        <p className="text-zinc-400 mb-10">
          Click any option to preview it live in the navbar above. Currently showing: <span className="text-amber-400 font-semibold">{active.name}</span>
        </p>

        {/* Grid of options */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {LOGOS.map((logo, i) => (
            <button
              key={logo.id}
              onClick={() => setSelected(i)}
              className={`group relative flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all duration-200 ${
                selected === i
                  ? 'border-amber-400/60 bg-amber-400/[0.06] ring-1 ring-amber-400/30'
                  : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12]'
              }`}
            >
              {/* Number badge */}
              <span className={`absolute top-2 left-2 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center ${
                selected === i ? 'bg-amber-400 text-black' : 'bg-white/10 text-zinc-500'
              }`}>
                {logo.id}
              </span>

              {/* Logo at larger size */}
              <div className={`w-14 h-14 rounded-xl ${logo.bg} flex items-center justify-center shadow-lg p-3 transition-transform duration-200 group-hover:scale-105`}>
                {logo.svg}
              </div>

              {/* Name */}
              <div className="text-center">
                <p className={`text-xs font-bold leading-tight ${selected === i ? 'text-amber-400' : 'text-zinc-300'}`}>
                  {logo.name}
                </p>
                <p className="text-[10px] text-zinc-500 mt-1 leading-snug">
                  {logo.desc}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Large preview */}
        <div className="mt-12 flex flex-col items-center gap-6">
          <h2 className="text-lg font-bold text-zinc-400 uppercase tracking-widest text-center">Selected Preview</h2>
          <div className="flex items-center gap-6">
            {/* Small size (actual navbar size) */}
            <div className="flex flex-col items-center gap-2">
              <div className={`w-8 h-8 rounded-lg ${active.bg} flex items-center justify-center shadow-lg p-1.5`}>
                {active.svg}
              </div>
              <span className="text-[10px] text-zinc-500">32px</span>
            </div>
            {/* Medium */}
            <div className="flex flex-col items-center gap-2">
              <div className={`w-12 h-12 rounded-xl ${active.bg} flex items-center justify-center shadow-lg p-2.5`}>
                {active.svg}
              </div>
              <span className="text-[10px] text-zinc-500">48px</span>
            </div>
            {/* Large */}
            <div className="flex flex-col items-center gap-2">
              <div className={`w-20 h-20 rounded-2xl ${active.bg} flex items-center justify-center shadow-lg p-4`}>
                {active.svg}
              </div>
              <span className="text-[10px] text-zinc-500">80px</span>
            </div>
            {/* XL */}
            <div className="flex flex-col items-center gap-2">
              <div className={`w-32 h-32 rounded-3xl ${active.bg} flex items-center justify-center shadow-xl p-6`}>
                {active.svg}
              </div>
              <span className="text-[10px] text-zinc-500">128px</span>
            </div>
          </div>

          {/* With site name */}
          <div className="mt-6 flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-6 py-4">
            <div className={`w-10 h-10 rounded-xl ${active.bg} flex items-center justify-center shadow-lg p-2`}>
              {active.svg}
            </div>
            <span className="text-xl font-black tracking-tight text-white uppercase">
              Heavy Metal Stats
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
