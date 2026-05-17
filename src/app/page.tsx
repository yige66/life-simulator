'use client';

import React, { useState } from 'react';
import CharacterCreation from '../components/CharacterCreation';
import GameStage from '../components/GameStage';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, RefreshCw } from 'lucide-react';

interface Stats {
  智力: number;
  魅力: number;
  体力: number;
  运气: number;
}

export default function Home() {
  const [gameState, setGameState] = useState<'creation' | 'playing' | 'ending'>('creation');
  const [character, setCharacter] = useState<{
    name: string;
    background: string;
    stats: Stats;
  } | null>(null);
  const [endingSummary, setEndingSummary] = useState('');
  const [endingText, setEndingText] = useState('');
  const [loadingEnding, setLoadingEnding] = useState(false);

  const handleStartGame = (name: string, background: string, stats: Stats) => {
    setCharacter({ name, background, stats });
    setGameState('playing');
  };

  const handleUpdateStats = (newStats: Stats) => {
    if (character) {
      setCharacter({ ...character, stats: newStats });
    }
  };

  const handleGameEnd = async (summary: string) => {
    setGameState('ending');
    setEndingSummary(summary);
    setLoadingEnding(true);
    
    try {
      const res = await fetch('/api/deepseek', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: '你是一个轻小说作家。根据玩家的全程摘要和最终属性，为这段异世界模拟人生写一个感人的结局。字数150-200字左右。返回 JSON 格式：{"ending": "结局文本"}'
            },
            {
              role: 'user',
              content: `名字：${character?.name}
              背景：${character?.background}
              最终属性：${JSON.stringify(character?.stats)}
              全程摘要：${summary}`
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
            className="w-full max-w-4xl z-10"
          >
            <div className="classical-frame p-12 text-center space-y-10">
              <div className="frame-corner frame-corner-tl" />
              <div className="frame-corner frame-corner-tr" />
              <div className="frame-corner frame-corner-bl" />
              <div className="frame-corner frame-corner-br" />
              <div className="space-y-4 relative z-10">
                <h2 className="text-4xl font-black text-pink-200 text-glow-sakura flex items-center justify-center gap-4">
                  <Sparkles className="w-8 h-8" />
                  物语终焉
                  <Sparkles className="w-8 h-8" />
                </h2>
                <div className="h-px w-24 bg-pink-500/30 mx-auto" />
              </div>
              
              <div className="min-h-[200px] flex items-center justify-center">
                {loadingEnding ? (
                  <div className="flex flex-col items-center gap-6">
                    <RefreshCw className="w-10 h-10 text-pink-400 animate-spin" />
                    <p className="text-pink-100/50 animate-pulse tracking-widest">正在编织传奇的终章...</p>
                  </div>
                ) : (
                  <p className="text-2xl leading-relaxed text-pink-50 italic font-medium">
                    {endingText}
                  </p>
                )}
              </div>

              <button
                onClick={() => window.location.reload()}
                className="sakura-button mx-auto"
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
