'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, User, BookOpen, Globe, Wand2, ChevronRight, Plus, Minus, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

import MagicCircleStats from './MagicCircleStats';

interface Stats {
  智力: number;
  魅力: number;
  体力: number;
  运气: number;
}

interface Props {
  onStart: (name: string, background: string, worldview: string, stats: Stats) => void;
}

type GenStatus = 'idle' | 'loading' | 'ok' | 'err';

export default function CharacterCreation({ onStart }: Props) {
  const [name, setName] = useState('');
  const [background, setBackground] = useState('');
  const [worldview, setWorldview] = useState('');
  const [stats, setStats] = useState<Stats>({
    智力: 1,
    魅力: 1,
    体力: 1,
    运气: 1,
  });
  const [extraPoints, setExtraPoints] = useState(10);
  const [bgStatus, setBgStatus] = useState<GenStatus>('idle');
  const [wvStatus, setWvStatus] = useState<GenStatus>('idle');

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

  const fetchDeepseekRaw = async (messages: Array<{ role: string; content: string }>) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch('/api/deepseek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });
      const data = await res.json();
      return data?.choices?.[0]?.message?.content as string | undefined;
    } finally {
      clearTimeout(timer);
    }
  };

  const safeParse = (raw: unknown) => {
    if (typeof raw !== 'string') return null;
    try { return JSON.parse(raw); } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) return null;
      try { return JSON.parse(m[0]); } catch { return null; }
    }
  };

  const handleAutoGenerateBackground = async () => {
    if (!name.trim()) return;
    setBgStatus('loading');
    try {
      const raw = await fetchDeepseekRaw([
        { role: 'system', content: '你是轻小说角色设定助手。根据角色名生成一个简短的身份背景（25-40字），富有日式轻小说风味。返回JSON：{"background":"背景文本"}。不涉及政治。' },
        { role: 'user', content: `角色名：${name}` },
      ]);
      const parsed = safeParse(raw);
      if (parsed?.background) {
        setBackground(parsed.background);
        setBgStatus('ok');
      } else {
        setBgStatus('err');
      }
    } catch {
      setBgStatus('err');
    }
  };

  const handleAutoGenerateWorldview = async () => {
    if (!name.trim()) return;
    setWvStatus('loading');
    try {
      const raw = await fetchDeepseekRaw([
        { role: 'system', content: '你是轻小说世界观设定助手。根据角色名和背景，生成一个简短的异世界世界观描述（40-70字），有趣且独特。包含世界的基本法则、魔法/科技水平等。禁止涉及政治。返回JSON：{"worldview":"世界观文本"}' },
        { role: 'user', content: `角色名：${name}，背景：${background || '未知'}。请生成世界观。` },
      ]);
      const parsed = safeParse(raw);
      if (parsed?.worldview) {
        setWorldview(parsed.worldview);
        setWvStatus('ok');
      } else {
        setWvStatus('err');
      }
    } catch {
      setWvStatus('err');
    }
  };

  const isFormValid = name.trim() !== '' && background.trim() !== '' && worldview.trim() !== '';

  const genBtnBase = 'flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-[10px] sm:text-xs font-bold transition-all duration-200';

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
          <div className="flex-1 p-4 sm:p-8 lg:p-16 space-y-5 sm:space-y-8 bg-white/[0.01] overflow-y-auto max-h-[85vh] lg:max-h-none">
            <div className="space-y-2 sm:space-y-3">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-leather-brown flex items-center gap-2 sm:gap-3">
                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-sakura-deep" />
                异世界转生契约
              </h1>
              <p className="text-parchment-text/60 italic tracking-widest text-xs sm:text-sm">签订此契约，开启一段不可思议的命运旅程</p>
            </div>

            <div className="space-y-4 sm:space-y-5">
              {/* Name & Background */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between ml-1 min-h-[26px]">
                    <label className="text-[9px] sm:text-[10px] font-black text-parchment-text/60 uppercase tracking-[0.2em] sm:tracking-[0.3em]">契约者姓名</label>
                    <span className="w-16" />
                  </div>
                  <div className="relative group">
                    <User className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-parchment-text/20 group-focus-within:text-leather-brown transition-colors" />
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="请输入真名或代号"
                      className="w-full bg-black/5 border border-black/10 rounded-2xl pl-10 sm:pl-12 pr-4 sm:pr-6 py-3 sm:py-4 focus:outline-none focus:border-leather-brown/40 focus:bg-black/10 transition-all text-base sm:text-lg font-medium placeholder:text-parchment-text/20 text-leather-brown" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between ml-1 min-h-[26px]">
                    <label className="text-[9px] sm:text-[10px] font-black text-parchment-text/60 uppercase tracking-[0.2em] sm:tracking-[0.3em]">身份背景</label>
                    <button
                      onClick={handleAutoGenerateBackground}
                      disabled={bgStatus === 'loading' || !name.trim()}
                      className={`${genBtnBase} ${
                        bgStatus === 'loading'
                          ? 'bg-amber-100/60 border-amber-300/40 text-amber-700'
                          : bgStatus === 'ok'
                            ? 'bg-emerald-100/60 border-emerald-300/40 text-emerald-700'
                            : bgStatus === 'err'
                              ? 'bg-red-100/40 border-red-300/40 text-red-600'
                              : 'bg-sakura-pink/20 border-sakura-deep/30 text-sakura-deep hover:bg-sakura-pink/40 hover:border-sakura-deep/50'
                      } disabled:opacity-40`}
                    >
                      {bgStatus === 'loading' ? (
                        <><Loader2 className="w-3 h-3 animate-spin" />生成中</>
                      ) : bgStatus === 'ok' ? (
                        <><CheckCircle className="w-3 h-3" />已生成</>
                      ) : bgStatus === 'err' ? (
                        <><AlertCircle className="w-3 h-3" />重试</>
                      ) : (
                        <><Wand2 className="w-3 h-3" />AI 生成</>
                      )}
                    </button>
                  </div>
                  <div className="relative group">
                    <BookOpen className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-parchment-text/20 group-focus-within:text-leather-brown transition-colors" />
                    <input type="text" value={background} onChange={(e) => setBackground(e.target.value)} placeholder="如：落魄贵族、天才黑客..."
                      className="w-full bg-black/5 border border-black/10 rounded-2xl pl-10 sm:pl-12 pr-4 sm:pr-6 py-3 sm:py-4 focus:outline-none focus:border-leather-brown/40 focus:bg-black/10 transition-all text-base sm:text-lg font-medium placeholder:text-parchment-text/20 text-leather-brown" />
                  </div>
                </div>
              </div>

              {/* Worldview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1 min-h-[26px]">
                  <label className="text-[9px] sm:text-[10px] font-black text-parchment-text/60 uppercase tracking-[0.2em] sm:tracking-[0.3em]">世界观设定</label>
                  <button
                    onClick={handleAutoGenerateWorldview}
                    disabled={wvStatus === 'loading' || !name.trim()}
                    className={`${genBtnBase} ${
                      wvStatus === 'loading'
                        ? 'bg-amber-100/60 border-amber-300/40 text-amber-700'
                        : wvStatus === 'ok'
                          ? 'bg-emerald-100/60 border-emerald-300/40 text-emerald-700'
                          : wvStatus === 'err'
                            ? 'bg-red-100/40 border-red-300/40 text-red-600'
                            : 'bg-sakura-pink/20 border-sakura-deep/30 text-sakura-deep hover:bg-sakura-pink/40 hover:border-sakura-deep/50'
                    } disabled:opacity-40`}
                  >
                    {wvStatus === 'loading' ? (
                      <><Loader2 className="w-3 h-3 animate-spin" />生成中</>
                    ) : wvStatus === 'ok' ? (
                      <><CheckCircle className="w-3 h-3" />已生成</>
                    ) : wvStatus === 'err' ? (
                      <><AlertCircle className="w-3 h-3" />重试</>
                    ) : (
                      <><Wand2 className="w-3 h-3" />AI 生成</>
                    )}
                  </button>
                </div>
                <div className="relative group">
                  <Globe className="absolute left-3 sm:left-4 top-4 w-4 h-4 sm:w-5 sm:h-5 text-parchment-text/20 group-focus-within:text-leather-brown transition-colors" />
                  <textarea value={worldview} onChange={(e) => setWorldview(e.target.value)}
                    placeholder="描述这个世界的法则、魔法/科技水平、独特规则……也可以点「AI 生成」让AI为你创造"
                    rows={3}
                    className="w-full bg-black/5 border border-black/10 rounded-2xl pl-10 sm:pl-12 pr-4 sm:pr-6 py-3 sm:py-4 focus:outline-none focus:border-leather-brown/40 focus:bg-black/10 transition-all text-base sm:text-lg font-medium placeholder:text-parchment-text/20 text-leather-brown resize-none" />
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-4 sm:space-y-5 pt-2 border-t border-black/5">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2 sm:gap-0">
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
                        <button onClick={() => handleStatChange(stat, -1)}
                          className="flex-1 py-2 sm:py-2.5 rounded-xl bg-black/5 hover:bg-black/10 transition-all flex justify-center border border-black/5 hover:border-leather-brown/30 text-leather-brown">
                          <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                        <button onClick={() => handleStatChange(stat, 1)} disabled={extraPoints <= 0}
                          className="flex-1 py-2 sm:py-2.5 rounded-xl bg-black/5 hover:bg-black/10 disabled:opacity-20 transition-all flex justify-center border border-black/5 hover:border-leather-brown/30 text-leather-brown">
                          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => isFormValid && onStart(name, background, worldview, stats)}
              disabled={!isFormValid}
              className={`w-full sakura-button group mt-2 sm:mt-4 text-base sm:text-xl ${!isFormValid ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}>
              契约成立，开启异世界之门
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

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
