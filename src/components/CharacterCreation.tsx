'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, User, BookOpen, ChevronRight, Plus, Minus } from 'lucide-react';

import MagicCircleStats from './MagicCircleStats';

interface Stats {
  智力: number;
  魅力: number;
  体力: number;
  运气: number;
}

interface Props {
  onStart: (name: string, background: string, stats: Stats) => void;
}

export default function CharacterCreation({ onStart }: Props) {
  const [name, setName] = useState('');
  const [background, setBackground] = useState('');
  const [stats, setStats] = useState<Stats>({
    智力: 1,
    魅力: 1,
    体力: 1,
    运气: 1,
  });
  const [extraPoints, setExtraPoints] = useState(10);

  const handleStatChange = (stat: keyof Stats, delta: number) => {
    if (delta > 0) {
      if (extraPoints <= 0) return;
      setStats({ ...stats, [stat]: stats[stat] + 1 });
      setExtraPoints(extraPoints - 1);
      return;
    }

    setStats({ ...stats, [stat]: stats[stat] - 1 });
    setExtraPoints(extraPoints + 1);
  };

  const isFormValid = name.trim() !== '' && background.trim() !== '';

  return (
    <div className="w-full max-w-6xl px-2 sm:px-4 py-4 sm:py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="classical-frame overflow-hidden shadow-2xl min-h-[600px] sm:min-h-[700px]"
      >
        <div className="ornament-bg" />

        <div className="frame-corner frame-corner-tl" />
        <div className="frame-corner frame-corner-tr" />
        <div className="frame-corner frame-corner-bl" />
        <div className="frame-corner frame-corner-br" />

        <div className="grimoire-spine hidden lg:block" />

        <div className="flex flex-col lg:flex-row items-stretch relative z-10 h-full">
          {/* Left Side: Form Controls */}
          <div className="flex-1 p-4 sm:p-8 lg:p-16 space-y-6 sm:space-y-10 bg-white/[0.01]">
            <div className="space-y-3 sm:space-y-4">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-leather-brown flex items-center gap-2 sm:gap-3">
                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-sakura-deep" />
                异世界转生契约
              </h1>
              <p className="text-parchment-text/60 italic tracking-widest text-xs sm:text-sm">签订此契约，开启一段不可思议的命运旅程</p>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[9px] sm:text-[10px] font-black text-parchment-text/60 uppercase tracking-[0.2em] sm:tracking-[0.3em] ml-1">
                    契约者姓名
                  </label>
                  <div className="relative group">
                    <User className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-parchment-text/20 group-focus-within:text-leather-brown transition-colors" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="请输入真名或代号"
                      className="w-full bg-black/5 border border-black/10 rounded-2xl pl-10 sm:pl-12 pr-4 sm:pr-6 py-3 sm:py-4 focus:outline-none focus:border-leather-brown/40 focus:bg-black/10 transition-all text-base sm:text-lg font-medium placeholder:text-parchment-text/20 text-leather-brown"
                    />
                  </div>
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[9px] sm:text-[10px] font-black text-parchment-text/60 uppercase tracking-[0.2em] sm:tracking-[0.3em] ml-1">
                    身份背景
                  </label>
                  <div className="relative group">
                    <BookOpen className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-parchment-text/20 group-focus-within:text-leather-brown transition-colors" />
                    <input
                      type="text"
                      value={background}
                      onChange={(e) => setBackground(e.target.value)}
                      placeholder="如：落魄贵族、天才黑客..."
                      className="w-full bg-black/5 border border-black/10 rounded-2xl pl-10 sm:pl-12 pr-4 sm:pr-6 py-3 sm:py-4 focus:outline-none focus:border-leather-brown/40 focus:bg-black/10 transition-all text-base sm:text-lg font-medium placeholder:text-parchment-text/20 text-leather-brown"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 sm:space-y-6 pt-3 sm:pt-4 border-t border-black/5">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 sm:gap-0">
                  <div className="space-y-1">
                    <h2 className="text-lg sm:text-xl font-bold text-leather-brown">灵魂特质分配</h2>
                    <p className="text-[10px] sm:text-xs text-parchment-text/40">属性变动将实时同步至右侧灵魂投影</p>
                  </div>
                  <div className="bg-black/5 border border-black/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl backdrop-blur-md self-start sm:self-auto">
                    <span className="text-[9px] sm:text-[10px] font-bold text-parchment-text/60 uppercase tracking-wider">可用点数: </span>
                    <span className="text-xl sm:text-2xl font-black text-leather-brown ml-1 sm:ml-2">{extraPoints}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  {(Object.keys(stats) as Array<keyof Stats>).map((stat) => (
                    <div key={stat} className="stat-card group !p-3 sm:!p-4">
                      <div className="flex justify-between items-center mb-3 sm:mb-4">
                        <span className="text-[10px] sm:text-xs font-black text-parchment-text/40 tracking-widest">{stat}</span>
                        <span className="text-xl sm:text-2xl font-black text-leather-brown">{stats[stat]}</span>
                      </div>
                      <div className="flex gap-1.5 sm:gap-2">
                        <button
                          onClick={() => handleStatChange(stat, -1)}
                          className="flex-1 py-2 sm:py-2.5 rounded-xl bg-black/5 hover:bg-black/10 transition-all flex justify-center border border-black/5 hover:border-leather-brown/30 text-leather-brown"
                        >
                          <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => handleStatChange(stat, 1)}
                          disabled={extraPoints <= 0}
                          className="flex-1 py-2 sm:py-2.5 rounded-xl bg-black/5 hover:bg-black/10 disabled:opacity-20 transition-all flex justify-center border border-black/5 hover:border-leather-brown/30 text-leather-brown"
                        >
                          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => isFormValid && onStart(name, background, stats)}
              disabled={!isFormValid}
              className={`w-full sakura-button group mt-2 sm:mt-4 text-base sm:text-xl ${!isFormValid ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
            >
              契约成立，开启异世界之门
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Right Side: Soul Projection - The Magic Circle */}
          <div className="lg:w-[500px] p-4 sm:p-8 lg:p-16 flex flex-col items-center justify-center bg-black/[0.01] relative overflow-hidden min-h-[300px] sm:min-h-[400px] lg:min-h-[500px]">
            <div className="absolute inset-0 bg-radial-glow opacity-[0.03] pointer-events-none" />

            <div className="relative z-10 scale-90 sm:scale-100 lg:scale-[1.4] transition-transform duration-700">
              <MagicCircleStats stats={stats} className="magic-floating" size="md" />
            </div>

            <div className="mt-10 sm:mt-16 lg:mt-20 text-center space-y-2 sm:space-y-3 relative z-10">
              <p className="text-[9px] sm:text-[10px] font-black text-parchment-text/30 uppercase tracking-[0.5em] sm:tracking-[0.8em] animate-pulse">Soul Projection</p>
              <div className="h-[1px] w-12 sm:w-16 bg-gradient-to-r from-transparent via-leather-brown/30 to-transparent mx-auto" />
              <p className="text-[10px] sm:text-[11px] text-parchment-text/40 max-w-[180px] sm:max-w-[220px] leading-relaxed italic">
                "灵魂的律动已镌刻在魔法阵中，等待着命运的召唤。"
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
