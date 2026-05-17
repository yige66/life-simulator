'use client';

import React, { useState } from 'react';
import CharacterCreation from '../components/CharacterCreation';
import GameStage from '../components/GameStage';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, RefreshCw } from 'lucide-react';
import MagicCircleStats from '../components/MagicCircleStats';

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

export default function Home() {
  const [gameState, setGameState] = useState<'creation' | 'overview' | 'playing' | 'ending'>('creation');
  const [character, setCharacter] = useState<{
    name: string;
    background: string;
    worldview: string;
    stats: Stats;
  } | null>(null);
  const [endingSummary, setEndingSummary] = useState('');
  const [endingText, setEndingText] = useState('');
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

  const handleGameEnd = async (summary: string, stats: Stats) => {
    setGameState('ending');
    setEndingSummary(summary);
    setFinalStats(stats);
    setLoadingEnding(true);
    
    try {
      const res = await fetch('/api/deepseek', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: '你是一个轻小说作家。根据玩家（名字+背景+世界观+全程事件摘要+最终属性），为这段异世界经历写一个感人的结局。结局必须呼应世界观和角色身份。字数150-200字。返回JSON：{"ending": "结局文本"}'
            },
            {
              role: 'user',
              content: `名字：${character?.name}
              背景：${character?.background}
              世界观：${character?.worldview}
              最终属性：${JSON.stringify(stats)}
              全程事件摘要：${summary}`
            }
          ]
        })
      });
      const data = await res.json();
      const content = JSON.parse(data.choices[0].message.content);
      setEndingText(content.ending);
    } catch (err) {
      console.error('Failed to generate ending', err);
      setEndingText('在这个时空的尽头，你的传奇故事画上了句号。虽然没能看到未来的景象，但你在异世界的足迹将永远被星光铭记。');
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
            className="w-full max-w-4xl z-10 px-2 sm:px-0"
          >
            <div className="classical-frame p-6 sm:p-8 md:p-12 text-center space-y-6 sm:space-y-8">
              <div className="frame-corner frame-corner-tl" />
              <div className="frame-corner frame-corner-tr" />
              <div className="frame-corner frame-corner-bl" />
              <div className="frame-corner frame-corner-br" />
              <div className="ornament-bg" />
              <div className="relative z-10 space-y-3 sm:space-y-4">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-pink-200 text-glow-sakura flex items-center justify-center gap-2 sm:gap-3">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
                  转生契约 · 确认
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
                </h2>
                <div className="h-px w-16 sm:w-24 bg-pink-500/30 mx-auto" />
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
                <MagicCircleStats stats={character.stats} size="sm" className="mx-auto" />
                <div className="grid grid-cols-4 gap-2 w-full max-w-xs">
                  {Object.entries(character.stats).map(([key, val]) => (
                    <div key={key} className="bg-black/[0.05] rounded-xl p-2 border border-black/10 text-center">
                      <div className="text-[10px] text-[#4a3728]/60 font-black uppercase">{STAT_LABELS[key as keyof Stats]}</div>
                      <div className="text-lg font-black text-[#1a0f0a]">{val}</div>
                    </div>
                  ))}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleConfirmOverview}
                className="sakura-button mx-auto text-base sm:text-xl relative z-10"
              >
                确认，踏入异世界
              </motion.button>
            </div>
          </motion.div>
        )}
        
        {gameState === 'playing' && character && (
          <motion.div
            key="playing"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.8, type: "spring", damping: 20 }}
            className="w-full flex justify-center z-10"
          >
            <GameStage 
              character={character} 
              onUpdateStats={handleUpdateStats}
              onGameEnd={handleGameEnd}
            />
          </motion.div>
        )}

        {gameState === 'ending' && (
          <motion.div
            key="ending"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl z-10 px-2 sm:px-0"
          >
            <div className="classical-frame p-6 sm:p-8 md:p-12 text-center space-y-6 sm:space-y-8">
              <div className="frame-corner frame-corner-tl" />
              <div className="frame-corner frame-corner-tr" />
              <div className="frame-corner frame-corner-bl" />
              <div className="frame-corner frame-corner-br" />
              <div className="ornament-bg" />
              <div className="space-y-3 sm:space-y-4 relative z-10">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-pink-200 text-glow-sakura flex items-center justify-center gap-2 sm:gap-4">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
                  物语终焉
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
                </h2>
                <div className="h-px w-16 sm:w-24 bg-pink-500/30 mx-auto" />
              </div>
              
              <div className="min-h-[100px] sm:min-h-[150px] flex items-center justify-center relative z-10">
                {loadingEnding ? (
                  <div className="flex flex-col items-center gap-4 sm:gap-6">
                    <RefreshCw className="w-8 h-8 sm:w-10 sm:h-10 text-pink-400 animate-spin" />
                    <p className="text-pink-100/50 animate-pulse tracking-widest text-sm sm:text-base">正在编织传奇的终章...</p>
                  </div>
                ) : (
                  <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-pink-50 italic font-medium">
                    {endingText}
                  </p>
                )}
              </div>

              {finalStats && (
                <div className="relative z-10 space-y-3">
                  <div className="h-px w-16 sm:w-24 bg-pink-500/20 mx-auto" />
                  <h3 className="text-xs sm:text-sm font-black text-pink-300/50 uppercase tracking-[0.2em]">最终能力值</h3>
                  <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-md mx-auto">
                    {Object.entries(finalStats).map(([key, val]) => (
                      <div key={key} className="bg-pink-500/5 border border-pink-500/10 rounded-xl p-2 sm:p-3 text-center">
                        <div className="text-[10px] sm:text-xs text-pink-300/50 font-black uppercase tracking-wider">{STAT_LABELS[key as keyof Stats]}</div>
                        <div className={`text-lg sm:text-xl font-black ${val >= 0 ? 'text-pink-200' : 'text-red-400'}`}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => window.location.reload()}
                className="sakura-button mx-auto text-base sm:text-xl relative z-10"
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
