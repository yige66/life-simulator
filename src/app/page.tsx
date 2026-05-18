'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, Star } from 'lucide-react';
import CharacterCreation from '@/components/CharacterCreation';
import MagicCircleStats from '@/components/MagicCircleStats';
import GameStage from '@/components/GameStage';

interface Stats {
  智力: number;
  魅力: number;
  体力: number;
  运气: number;
}

const STAT_LABELS: Record<keyof Stats, string> = {
  智力: '智力',
  魅力: '魅力',
  体力: '体力',
  运气: '运气',
};

export default function HomePage() {
  const [gameState, setGameState] = useState<'creation' | 'overview' | 'playing' | 'ending'>('creation');
  const [character, setCharacter] = useState<{
    name: string;
    background: string;
    worldview: string;
    stats: Stats;
  } | null>(null);
  const [endingSummary, setEndingSummary] = useState('');
  const [endingText, setEndingText] = useState('');
  const [title, setTitle] = useState('');
  const [quote, setQuote] = useState('');
  const [fateEvents, setFateEvents] = useState<string[]>([]);
  const [evaluation, setEvaluation] = useState('');
  const [loadingEnding, setLoadingEnding] = useState(false);
  const [finalStats, setFinalStats] = useState<Stats | null>(null);

  const handleStartGame = (name: string, background: string, worldview: string, stats: Stats) => {
    setCharacter({ name, background, worldview, stats });
    setGameState('overview');
  };

  const handleConfirmOverview = () => {
    setGameState('playing');
  };

  const handleUpdateStats = (newStats: Stats) => {
    if (character) {
      setCharacter({ ...character, stats: newStats });
    }
  };

  const handleGameEnd = async (summary: string, stats: Stats, fateEventsList: string[]) => {
    setGameState('ending');
    setEndingSummary(summary);
    setFinalStats(stats);
    setFateEvents(fateEventsList);
    setLoadingEnding(true);
    
    try {
      const res = await fetch('/api/deepseek', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `你是一个轻小说作家。根据玩家信息写一个感人的结局，并生成结局卡片素材。

结局 must 呼应世界观和角色身份，字数150-200字。
再根据最终属性逐项判定角色类型并融合成一句40-60字的总结(goldenEvaluation)。

此外，为这段人生起一个标题(title, 如"深海霸主之路""流浪诗人的终章")。
为角色写一句专属人生格言(quote, 如"我以为选择了命运，其实是命运选择了我")。

判定标准：
- 智力≥15→"智者/军师"，智力≤-5→"懵懂者"
- 魅力≥15→"万人迷"，魅力≤-5→"默默无闻"
- 体力≥15→"战神"，体力≤-5→"体弱多病"
- 运气≥15→"天选之人"，运气≤-5→"倒霉蛋"
- 不高不低的项不提
- 四项都≥15为"传奇"，四项都≤-5为"平凡中的奇迹"

返回JSON：{"ending": "结局文本", "title": "人生标题", "quote": "人生格言", "evaluation": "角色总结"}`
            },
            {
              role: 'user',
              content: `名字：${character?.name}
背景：${character?.background}
世界观：${character?.worldview}
最终属性：${JSON.stringify(stats)}
命运转折事件：${JSON.stringify(fateEventsList)}
全程事件摘要：${summary}`
            }
          ]
        })
      });
      const data = await res.json();
      const content = JSON.parse(data.choices[0].message.content);
      setEndingText(content.ending || '');
      setTitle(content.title || '异世界之旅');
      setQuote(content.quote || '命运如织，故事未完。');
      setEvaluation(content.evaluation || '');
    } catch (err) {
      console.error('Failed to generate ending', err);
      setEndingText('在这个时空的尽头，你的传奇故事画上了句号。虽然没能看到未来的景象，但你在异世界的足迹将永远被星光铭记。');
      setTitle('异世界之旅');
      setQuote('命运如织，故事未完。');
      setEvaluation('一个无法被定义的人——这正是灵魂最本真的姿态。');
    } finally {
      setLoadingEnding(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <AnimatePresence mode="wait">
        {gameState === 'creation' && (
          <motion.div
            key="creation"
            initial={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
            transition={{ duration: 1, ease: "circOut" }}
            className="w-full flex justify-center z-10"
          >
            <CharacterCreation onStart={handleStartGame} />
          </motion.div>
        )}

        {gameState === 'overview' && character && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.8 }}
            className="w-full max-w-4xl z-10"
          >
            <div className="classical-frame p-6 sm:p-10 md:p-14 max-w-3xl mx-auto text-center relative">
              <div className="frame-corner frame-corner-tl" />
              <div className="frame-corner frame-corner-tr" />
              <div className="frame-corner frame-corner-bl" />
              <div className="frame-corner frame-corner-br" />
              <div className="ornament-bg" />
              <div className="relative z-10 space-y-3 sm:space-y-4">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-cyan-100 text-glow-sakura flex items-center justify-center gap-2 sm:gap-3">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
                  转生契约 · 确认
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
                </h2>
                <div className="h-px w-16 sm:w-24 bg-cyan-500/30 mx-auto" />
              </div>

              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 text-left">
                <div className="bg-black/[0.04] border border-black/10 rounded-2xl p-4 sm:p-6 space-y-3">
                  <h3 className="text-xs font-black text-parchment-text/50 uppercase tracking-[0.3em]">契约者</h3>
                  <p className="text-xl sm:text-2xl font-black text-leather-brown">{character.name}</p>
                  <div className="h-px w-full bg-black/5" />
                  <h3 className="text-xs font-black text-parchment-text/50 uppercase tracking-[0.3em]">身份背景</h3>
                  <p className="text-base sm:text-lg font-medium text-parchment-text leading-relaxed">{character.background}</p>
                </div>
                <div className="bg-black/[0.04] border border-black/10 rounded-2xl p-4 sm:p-6 space-y-3">
                  <h3 className="text-xs font-black text-parchment-text/50 uppercase tracking-[0.3em]">世界观</h3>
                  <p className="text-base sm:text-lg font-medium text-parchment-text leading-relaxed whitespace-pre-wrap">{character.worldview}</p>
                </div>
              </div>

              <div className="relative z-10 flex flex-col items-center gap-3">
                <h3 className="text-xs font-black text-parchment-text/50 uppercase tracking-[0.3em]">灵魂特质</h3>
                <MagicCircleStats stats={character.stats} className="mx-auto" />
              </div>

              <div className="relative z-10 pt-2">
                <button onClick={handleConfirmOverview}
                  className="sakura-button text-base sm:text-xl">
                  确认，踏入异世界
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'playing' && character && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="w-full z-10"
          >
            <GameStage character={character} onUpdateStats={handleUpdateStats} onGameEnd={handleGameEnd} />
          </motion.div>
        )}

        {gameState === 'ending' && (
          <motion.div
            key="ending"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "circOut" }}
            className="w-full max-w-4xl z-10"
          >
            <div className="classical-frame p-6 sm:p-10 md:p-14 max-w-3xl mx-auto text-center relative">
              <div className="frame-corner frame-corner-tl" />
              <div className="frame-corner frame-corner-tr" />
              <div className="frame-corner frame-corner-bl" />
              <div className="frame-corner frame-corner-br" />
              <div className="ornament-bg" />
              <div className="space-y-3 sm:space-y-4 relative z-10">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-cyan-100 text-glow-sakura flex items-center justify-center gap-2 sm:gap-4">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
                  物语终焉
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
                </h2>
                <div className="h-px w-16 sm:w-24 bg-cyan-500/30 mx-auto" />
              </div>

              {title && (
                <div className="relative z-10 mt-6">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-amber-100/90 tracking-wider">{title}</h3>
                </div>
              )}
              
              <div className="min-h-[100px] sm:min-h-[150px] flex items-center justify-center relative z-10 mt-4">
                {loadingEnding ? (
                  <div className="flex flex-col items-center gap-4 sm:gap-6">
                    <RefreshCw className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-400 animate-spin" />
                    <p className="text-cyan-100/70 animate-pulse tracking-widest text-sm sm:text-base">正在编织传奇的终章...</p>
                  </div>
                ) : (
                  <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-white italic font-medium">
                    {endingText}
                  </p>
                )}
              </div>

              {quote && (
                <div className="relative z-10 mt-2 mb-4">
                  <p className="text-sm sm:text-base text-amber-200/70 italic tracking-wider">「{quote}」</p>
                </div>
              )}

              {fateEvents.length > 0 && (
                <div className="relative z-10 space-y-3 my-6">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-px w-8 sm:w-12 bg-amber-500/30" />
                    <span className="text-[10px] sm:text-xs font-black text-amber-400/80 uppercase tracking-[0.2em] flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400" />命运转折
                    </span>
                    <div className="h-px w-8 sm:w-12 bg-amber-500/30" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                    {fateEvents.map((ev, i) => (
                      <div key={i} className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-left">
                        <p className="text-xs sm:text-sm text-amber-100/80 leading-relaxed">{ev}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {finalStats && (
                <div className="relative z-10 space-y-3">
                  <div className="h-px w-16 sm:w-24 bg-cyan-500/20 mx-auto" />
                  <h3 className="text-xs sm:text-sm font-black text-cyan-300/90 uppercase tracking-[0.2em]">最终能力值</h3>
                  <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-md mx-auto">
                    {Object.entries(finalStats).map(([key, val]) => (
                      <div key={key} className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-2 sm:p-3 text-center">
                        <div className="text-[10px] sm:text-xs text-cyan-300/80 font-black uppercase tracking-wider">{STAT_LABELS[key as keyof Stats]}</div>
                        <div className={`text-lg sm:text-xl font-black ${val >= 0 ? 'text-cyan-100' : 'text-red-400'}`}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {evaluation && (
                <div className="relative z-10 space-y-2 mt-4">
                  <div className="h-px w-16 sm:w-24 bg-amber-500/20 mx-auto" />
                  <h3 className="text-xs sm:text-sm font-black text-amber-300/80 uppercase tracking-[0.2em]">角色评定</h3>
                  <p className="text-base sm:text-lg leading-relaxed text-amber-100/90 italic font-medium max-w-lg mx-auto">
                    {evaluation}
                  </p>
                </div>
              )}

              <button
                onClick={() => window.location.reload()}
                className="sakura-button mx-auto text-base sm:text-xl relative z-10 mt-6"
              >
                再次踏上旅程
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
