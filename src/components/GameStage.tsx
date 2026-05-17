'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Scroll, Sparkles } from 'lucide-react';

import MagicCircleStats from './MagicCircleStats';

interface Stats {
  智力: number;
  魅力: number;
  体力: number;
  运气: number;
}

interface Option {
  text: string;
  effects: Partial<Stats>;
}

interface EventData {
  event: string;
  options: Option[];
  actionEffects?: Partial<Stats>;
}

interface Props {
  character: {
    name: string;
    background: string;
    stats: Stats;
  };
  onUpdateStats: (newStats: Stats) => void;
  onGameEnd: (summary: string) => void;
}

export default function GameStage({ character, onUpdateStats, onGameEnd }: Props) {
  const [chapters, setChapters] = useState<string[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [currentEvent, setCurrentEvent] = useState<EventData | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [eventCount, setEventCount] = useState(0);

  const safeParseJsonFromModel = (raw: unknown) => {
    if (typeof raw !== 'string') return null;
    try {
      return JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) return null;
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
  };

  const fetchDeepseek = async (messages: Array<{ role: string; content: string }>, timeoutMs = 12000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch('/api/deepseek', {
        method: 'POST',
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      return content as unknown;
    } finally {
      clearTimeout(timer);
    }
  };

  const ensureFallbackStart = () => {
    const fallbackChapters = ['序章：契约的烙印', '第一章：星海初醒', '第二章：命运的岔路'];
    setChapters(fallbackChapters);
    setCurrentChapterIndex(0);
    setCurrentEvent({
      event: '契约书在你指尖燃起微光，一道黑曜石色的魔法阵在羊皮纸上缓缓转动。你听见某个世界在呼唤你。',
      options: [
        { text: '握紧契约，踏入光门', effects: { 运气: 1 } },
        { text: '先观察周围的符文', effects: { 智力: 1 } },
        { text: '对未知世界露出微笑', effects: { 魅力: 1 } },
      ],
    });
  };

  // Initialize chapters
  useEffect(() => {
    const initChapters = async () => {
      setLoading(true);
      try {
        const raw = await fetchDeepseek([
          {
            role: 'system',
            content:
              '你是一个轻小说作家。根据玩家的名字和身份背景，生成2-4个富有轻小说风格的篇章标题。请只返回 JSON 对象，格式为 {"chapters": ["标题1", "标题2"]}',
          },
          {
            role: 'user',
            content: `名字：${character.name}，背景：${character.background}`,
          },
        ]);
        const parsed = safeParseJsonFromModel(raw);
        const nextChapters = Array.isArray(parsed?.chapters) && parsed.chapters.length > 0 ? parsed.chapters : null;
        if (!nextChapters) {
          ensureFallbackStart();
          return;
        }
        setChapters(nextChapters);
        generateEvent(nextChapters[0]);
      } catch (err) {
        console.error('Failed to init chapters', err);
        ensureFallbackStart();
      } finally {
        setLoading(false);
      }
    };
    initChapters();
  }, []);

  const generateEvent = async (
    chapterTitle: string,
    context?: {
      userAction?: string;
      stats?: Stats;
      history?: string[];
    },
  ) => {
    setLoading(true);
    try {
      const statsForPrompt = context?.stats ?? character.stats;
      const historyForPrompt = context?.history ?? history;
      const recentHistory = historyForPrompt.slice(-3).join('\n');
      const userAction = context?.userAction;
      const raw = await fetchDeepseek([
        {
          role: 'system',
          content: `你是一个二次元小游戏引擎。根据当前状态生成一个随机事件，并且必须严格考虑玩家当前属性来决定事件强度、台词与选项后果。
如果提供了"玩家动作"，请先简短描述该动作的结果，并给出该动作对属性的影响。
返回严格 JSON：
{
  "event": "描述文字",
  "options": [{"text": "选项", "effects": {"智力": 1}}],
  "actionEffects": {"智力": -1}
}
说明：
- effects/actionEffects 的数值可以为负数或正数，不需要任何上限/下限。
- actionEffects 仅在提供了玩家动作时返回；否则可以省略。
- 选项必须有3-4个，风格幽默且符合轻小说氛围。`,
        },
        {
          role: 'user',
          content: `名字：${character.name}
背景：${character.background}
当前属性：${JSON.stringify(statsForPrompt)}
当前篇章：${chapterTitle}
历史摘要：${recentHistory}
${userAction ? `玩家动作：${userAction}` : ''}`,
        },
      ]);
      const parsed = safeParseJsonFromModel(raw);
      const nextEvent: EventData | null =
        parsed && typeof parsed.event === 'string' && Array.isArray(parsed.options) ? parsed : null;
      if (!nextEvent) {
        setCurrentEvent({
          event: userAction
            ? `你尝试了「${userAction}」，空气里传来微不可闻的回响——命运似乎在重新掷骰。`
            : '魔法阵的符文短暂闪烁了一下，世界像是卡住了半拍……但你仍能继续前进。',
          options: [
            { text: '继续向前', effects: {} },
            { text: '调整呼吸，稳住心神', effects: { 体力: 1 } },
            { text: '默念咒文，试图同步', effects: { 智力: 1 } },
          ],
        });
      } else {
        if (userAction && nextEvent.actionEffects && typeof nextEvent.actionEffects === 'object') {
          const newStats = { ...statsForPrompt };
          Object.entries(nextEvent.actionEffects).forEach(([key, value]) => {
            const k = key as keyof Stats;
            const v = typeof value === 'number' ? value : Number(value);
            if (!Number.isFinite(v)) return;
            newStats[k] = (newStats[k] ?? 0) + v;
          });
          onUpdateStats(newStats);
          if (context?.history) {
            const effText = Object.entries(nextEvent.actionEffects)
              .map(([k, v]) => `${k}${v >= 0 ? '+' : ''}${v}`)
              .join(' ');
            setHistory([...context.history, `动作影响：${effText || '无'}`]);
          }
        }
        const normalizedOptions = nextEvent.options
          .map((opt: any) => ({
            text: typeof opt?.text === 'string' ? opt.text : String(opt?.text ?? ''),
            effects: opt?.effects && typeof opt.effects === 'object' ? opt.effects : {},
          }))
          .filter((opt: any) => opt.text);
        setCurrentEvent({
          ...nextEvent,
          options: normalizedOptions.length > 0 ? normalizedOptions : [{ text: '继续', effects: {} }],
        });
      }
      setEventCount(prev => prev + 1);
    } catch (err) {
      console.error('Failed to generate event', err);
      setCurrentEvent({
        event: '命运的线条被风暴短暂遮蔽，你仍能凭直觉做出选择。',
        options: [
          { text: '继续', effects: {} },
          { text: '谨慎前进', effects: { 运气: 1 } },
          { text: '强行突破', effects: { 体力: 1 } },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (option: Option) => {
    const newStats = { ...character.stats };
    Object.entries(option.effects ?? {}).forEach(([key, value]) => {
      const k = key as keyof Stats;
      const v = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(v)) return;
      newStats[k] = (newStats[k] ?? 0) + v;
    });
    onUpdateStats(newStats);
    const nextHistory = [...history, `${currentEvent?.event} -> 玩家选择了：${option.text}`];
    setHistory(nextHistory);
    checkProgression(newStats, nextHistory);
  };

  const handleCustomSubmit = async () => {
    if (!customInput.trim()) return;
    const action = customInput;
    setCustomInput('');
    const nextHistory = [...history, `玩家自定义行动：${action}`];
    setHistory(nextHistory);
    await generateEvent(chapters[currentChapterIndex], {
      userAction: action,
      stats: character.stats,
      history: nextHistory,
    });
  };

  const checkProgression = (statsOverride?: Stats, historyOverride?: string[]) => {
    if (eventCount >= 5) { // Each chapter has 5 events
      if (currentChapterIndex < chapters.length - 1) {
        setCurrentChapterIndex(prev => prev + 1);
        setEventCount(0);
        generateEvent(chapters[currentChapterIndex + 1], { stats: statsOverride, history: historyOverride });
      } else {
        // End game
        onGameEnd((historyOverride ?? history).join('\n'));
      }
    } else {
      generateEvent(chapters[currentChapterIndex], { stats: statsOverride, history: historyOverride });
    }
  };

  return (
    <div className="w-full max-w-6xl min-h-[80vh] flex flex-col items-center justify-start py-12 px-4 relative">
      {/* Stats Floating Panel - Magic Circle Style (Moved to right and refined) */}
      <div className="fixed top-6 right-6 z-50 pointer-events-auto scale-[0.7] lg:scale-90 origin-top-right hover:scale-100 transition-all duration-500">
        <div className="relative classical-frame p-4 shadow-[0_18px_45px_rgba(0,0,0,0.55)]">
          <div className="ornament-bg" />
          <div className="relative z-10">
            <div className="mb-2 flex items-center justify-center">
              <div className="px-4 py-1 rounded-full border border-black/30 bg-black/[0.06] shadow-sm">
                <span className="text-[10px] font-black tracking-[0.35em] uppercase text-[#1a0f0a]">Soul Status</span>
              </div>
            </div>
            <MagicCircleStats stats={character.stats} className="magic-floating" />
          </div>
        </div>
      </div>

      {/* Header Area */}
      <div className="w-full mb-12">
        <div className="flex flex-col items-center gap-6">
          <motion.div
            key={chapters[currentChapterIndex]}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative px-12 py-4 group"
          >
            <div className="absolute inset-0 bg-pink-500/10 border-y border-pink-500/30 skew-x-[-20deg] group-hover:bg-pink-500/20 transition-colors" />
            <div className="relative flex items-center gap-6">
              <Sparkles className="w-5 h-5 text-pink-300 animate-pulse" />
              <span className="text-3xl font-black text-pink-200 tracking-[0.4em] uppercase text-glow-sakura">
                {chapters[currentChapterIndex] || '连接异世界中...'}
              </span>
              <Sparkles className="w-5 h-5 text-pink-300 animate-pulse" />
            </div>
          </motion.div>
          
          <div className="flex gap-2">
            {chapters.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === currentChapterIndex ? 'w-12 bg-pink-400 text-glow-sakura' : 'w-4 bg-white/10'
                }`} 
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-4xl flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="classical-frame p-16 flex flex-col items-center gap-10">
                <div className="frame-corner frame-corner-tl" />
                <div className="frame-corner frame-corner-tr" />
                <div className="frame-corner frame-corner-bl" />
                <div className="frame-corner frame-corner-br" />
                <div className="relative w-32 h-32">
                  <div className="absolute inset-0 border-4 border-pink-400/10 rounded-full" />
                  <div className="absolute inset-0 border-4 border-pink-400 border-t-transparent rounded-full animate-spin" />
                  <div className="absolute inset-6 bg-pink-400/5 rounded-full animate-pulse" />
                </div>
                <div className="space-y-2 text-center">
                  <p className="text-2xl font-black text-pink-200 tracking-[0.5em] animate-pulse text-glow-sakura">
                    命运编织中
                  </p>
                  <p className="text-xs text-pink-100/30 uppercase tracking-[0.2em]">Intertwining Fates...</p>
                </div>
              </div>
            </motion.div>
          ) : (
            currentEvent && (
              <motion.div
                key="event"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-10"
              >
                {/* Scenario Display */}
                <div className="classical-frame min-h-[280px] flex items-center justify-center p-12 text-center relative group">
                  <div className="frame-corner frame-corner-tl" />
                  <div className="frame-corner frame-corner-tr" />
                  <div className="frame-corner frame-corner-bl" />
                  <div className="frame-corner frame-corner-br" />
                  
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
                    <div className="h-px w-8 bg-pink-500/30" />
                    <span className="text-[10px] font-black text-pink-300/40 uppercase tracking-[0.6em]">Scenario Log</span>
                    <div className="h-px w-8 bg-pink-500/30" />
                  </div>
                  
                  <p className="text-2xl lg:text-3xl leading-relaxed font-bold text-pink-50 px-4">
                    {currentEvent.event}
                  </p>
                  
                  {/* Decorative Elements */}
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-6 py-1 bg-night border border-pink-500/30 rounded-full text-[10px] text-pink-300/50 uppercase tracking-widest font-black">
                    Event {eventCount + 1} / 5
                  </div>
                </div>

                {/* Interaction Area */}
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentEvent.options.map((opt, idx) => (
                      <motion.button
                        key={idx}
                        whileHover={{ scale: 1.02, x: 5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleOptionSelect(opt)}
                        className="aurora-button !justify-start group text-left p-6 min-h-[80px]"
                      >
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-sm font-black text-pink-300 group-hover:bg-aurora-green group-hover:text-night transition-all duration-300 border border-white/5">
                          {idx + 1}
                        </div>
                        <span className="flex-1 text-lg group-hover:text-glow-aurora transition-all">{opt.text}</span>
                      </motion.button>
                    ))}
                  </div>

                  {/* Input Box */}
                  <div className="relative group max-w-2xl mx-auto">
                    <div className="absolute -inset-1 bg-gradient-to-r from-pink-500/20 via-aurora-green/20 to-pink-500/20 rounded-[2rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />
                    <div className="relative glass-panel !rounded-[2rem] p-2 flex items-center gap-3 border-white/10 focus-within:border-pink-500/30 transition-all">
                      <input
                        type="text"
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder="或者，在此处编织你独特的意志..."
                        className="flex-1 bg-transparent border-none focus:ring-0 px-8 py-4 text-lg font-medium placeholder:text-pink-100/20"
                        onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
                      />
                      <button
                        onClick={handleCustomSubmit}
                        className="w-14 h-14 bg-pink-500/10 hover:bg-pink-500/30 rounded-2xl transition-all flex items-center justify-center group/btn"
                      >
                        <Send className="w-6 h-6 text-pink-300 group-hover/btn:scale-110 group-hover/btn:rotate-12 transition-all" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
