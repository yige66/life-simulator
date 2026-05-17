'use client';

import React from 'react';

interface Stats {
  智力: number;
  魅力: number;
  体力: number;
  运气: number;
}

interface Props {
  stats: Stats;
  className?: string;
}

export default function MagicCircleStats({ stats, className = '' }: Props) {
  return (
    <div className={`relative w-72 h-72 flex items-center justify-center ${className}`}>
      <div className="absolute inset-0 bg-black/5 blur-3xl rounded-full" />
      
      <svg 
        className="absolute inset-0 w-full h-full opacity-90 overflow-visible"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g className="magic-rotate-cw-1">
          <circle cx="100" cy="100" r="95" stroke="#2c1e14" strokeWidth="1.6" strokeDasharray="10 5" opacity="0.55" />
          <circle cx="100" cy="100" r="88" stroke="#2c1e14" strokeWidth="0.8" opacity="0.35" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <circle
              key={angle}
              cx={100 + 91.5 * Math.cos((angle * Math.PI) / 180)}
              cy={100 + 91.5 * Math.sin((angle * Math.PI) / 180)}
              r="2.2"
              fill="#2c1e14"
              opacity="0.6"
            />
          ))}
        </g>

        <g className="magic-rotate-ccw-2">
          <rect x="40" y="40" width="120" height="120" stroke="#2c1e14" strokeWidth="1.2" transform="rotate(45 100 100)" opacity="0.55" />
          <rect x="45" y="45" width="110" height="110" stroke="#2c1e14" strokeWidth="0.8" transform="rotate(22.5 100 100)" opacity="0.38" />
          <circle cx="100" cy="100" r="75" stroke="#2c1e14" strokeWidth="0.7" strokeDasharray="2 4" opacity="0.4" />
        </g>

        <g className="magic-rotate-cw-3-pulse">
          <circle cx="100" cy="100" r="60" stroke="#2c1e14" strokeWidth="1.2" opacity="0.55" />
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <line
              key={angle}
              x1="100"
              y1="45"
              x2="100"
              y2="57"
              stroke="#2c1e14"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.7"
              transform={`rotate(${angle} 100 100)`}
            />
          ))}
        </g>

        <path d="M100 22 L100 178 M22 100 L178 100" stroke="#2c1e14" strokeWidth="0.3" opacity="0.08" />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="grid grid-cols-2 gap-x-12 gap-y-10">
          {(Object.entries(stats) as [keyof Stats, number][]).map(([key, val]) => (
            <div key={key} className="flex flex-col items-center justify-center w-16">
              <span className="text-[12px] text-[#2c1e14] font-black tracking-widest mb-1">{key.charAt(0)}</span>
              <span className="text-4xl font-black text-[#0b0604] drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]">{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
