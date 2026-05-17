'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, X, Eye } from 'lucide-react';

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
  consequence?: string;
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

const STAT_LABELS: Record<keyof Stats, string> = {
  智力: '智力',
  魅力: '魅力',
  体力: '体力',
  运气: '运气',
};

export default function GameStage({ character, onUpdateStats, onGameEnd }: Props) {
  const [chapters, setChapters] = useState<string[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [currentEvent, setCurrentEvent] = useState<EventData | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [eventCount, setEventCount] = useState(0);
  const [showConsequence, setShowConsequence] = useState(false);
  const [lastConsequence, setLastConsequence] = useState('');
  const [lastStatChanges, setLastStatChanges] = useState<Partial<Stats>>({});
  const [showStatsModal, setShowStatsModal] = useState(false);

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

  const fetchDeepseek = async (messages: Array<{ role: string; content: string }>, timeoutMs = 15000) => {
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

  const getSystemPrompt = (hasUserAction: boolean) => `你是一个日式轻小说风格的游戏引擎。你必须保持叙事的高度连贯性，让每个事件都与前文和章节主题自然衔接，就像一本连续的轻小说。

生成事件时：
1. 回顾「历史事件」和「章节主题」，确保新事件在剧情逻辑上承接上文，不要割裂
2. 根据玩家「当前属性」来调整事件难度和选项效果
3. 选项必须与当前事件情境紧密相关，不要出现无关或跳跃的选项
4. 每次事件推进都要有因果关系——"因为玩家做了X，所以世界反馈了Y"

内容安全底线（严禁）：
- 不得涉及任何政治话题、政治隐喻、政治人物
- 不得包含色情、暴力描写或性暗示
- 不得出现歧视、侮辱性内容
- 所有事件保持在PG-13级别

返回严格 JSON：
{
  "event": "事件描述文字（中文，80-120字，承接前文剧情）",
  "options": [{"text": "选项描述", "effects": {"智力": 1}}],
  "actionEffects": {"智力": -2},
  "consequence": "这段叙述描述玩家选择后立即发生的后果和影响（约40-60字），需要解释属性为什么变化"
}

字段说明：
- consequence：必须返回，简要叙述选择带来的直接后果
- effects/actionEffects：数值可正可负，无上下限
- actionEffects 仅在提供了玩家自定义动作时返回
- 选项为3-4个，风格符合轻小说氛围`;

  useEffect(() => {
    const initChapters = async () => {
      setLoading(true);
      try {
        const raw = await fetchDeepseek([
          {
            role: 'system',
            content: '你是一个轻小说作家。根据玩家的名字和身份背景，生成2-4个富有轻小说风格、彼此关联的篇章标题。标题应有叙事递进关系。返回JSON：{"chapters": ["标题1", "标题2"]}',
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
      const recentHistory = historyForPrompt.slice(-6).join('\n');
      const userAction = context?.userAction;
      const raw = await fetchDeepseek([
        {
          role: 'system',
          content: getSystemPrompt(!!userAction),
        },
        {
          role: 'user',
          content: `名字：${character.name}
背景：${character.background}
当前篇章主题：${chapterTitle}
玩家当前属性：${JSON.stringify(statsForPrompt)}
近期历史事件：
${recentHistory || '（游戏开始）'}
${userAction ? `\n玩家自定义动作：${userAction}` : ''}
\n请生成下一个事件，确保与上述历史剧情自然衔接，体现因果逻辑。`,
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
          const changes: Partial<Stats> = {};
          Object.entries(nextEvent.actionEffects).forEach(([key, value]) => {
            const k = key as keyof Stats;
            const v = typeof value === 'number' ? value : Number(value);
            if (!Number.isFinite(v)) return;
            newStats[k] = (newStats[k] ?? 0) + v;
            changes[k] = (changes[k] ?? 0) + v;
          });
          onUpdateStats(newStats);
          setLastStatChanges(changes);
          setLastConsequence(nextEvent.consequence || `你的行动「${userAction}」在命运的织锦上留下了新的纹路。`);
          if (context?.history) {
            const effText = Object.entries(changes)
              .map(([k, v]) => `${STAT_LABELS[k as keyof Stats]}${v >= 0 ? '+' : ''}${v}`)
              .join(' ');
            setHistory([...context.history, `行动「${userAction}」→ ${nextEvent.consequence || ''} 影响：${effText}`]);
          }
        }
        const normalizedOptions = nextEvent.options
          .map((opt: any) => ({
            text: typeof opt?.text === 'string' ? opt.text : String(opt?.text ?? ''),
            effects: opt?.effects && typeof opt.effects === 'object' ? opt.effects : {},
          }))
          .filter((opt: any) => opt.text && opt.text.length > 0);
        setCurrentEvent({
          ...nextEvent,
          options: normalizedOptions.length >= 2 ? normalizedOptions : [
            { text: '稳步前行', effects: {} },
            { text: '驻足观望', effects: { 智力: 1 } },
          ],
        });
      }
      setShowConsequence(true);
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
      setShowConsequence(false);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (option: Option) => {
    const newStats = { ...character.stats };
    const changes: Partial<Stats> = {};
    Object.entries(option.effects ?? {}).forEach(([key, value]) => {
      const k = key as keyof Stats;
      const v = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(v)) return;
      newStats[k] = (newStats[k] ?? 0) + v;
      changes[k] = (changes[k] ?? 0) + v;
    });
    onUpdateStats(newStats);
    setLastStatChanges(changes);
    setLastConsequence(currentEvent?.consequence || `你选择了「${option.text}」，命运的齿轮悄然转动。`);
    const nextHistory = [...history, `事件：${currentEvent?.event} → 玩家选择：${option.text} → 后果：${currentEvent?.consequence || ''}`];
    setHistory(nextHistory);
    setShowConsequence(true);
  };

  const handleDismissConsequence = () => {
    setShowConsequence(false);
    checkProgression(character.stats, history);
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
    if (eventCount >= 5) {
      if (currentChapterIndex < chapters.length - 1) {
        setCurrentChapterIndex(prev => prev + 1);
        setEventCount(0);
        generateEvent(chapters[currentChapterIndex + 1], { stats: statsOverride, history: historyOverride });
      } else {
        onGameEnd((historyOverride ?? history).join('\n'));
      }
    } else {
      generateEvent(chapters[currentChapterIndex], { stats: statsOverride, history: historyOverride });
    }
  };

  const hasStatChanges = Object.keys(lastStatChanges).length > 0;

  const statChangesList = Object.entries(lastStatChanges)
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => ({ label: STAT_LABELS[k as keyof Stats], value: v as number }));

  return (
    <div className="w-full max-w-6xl min-h-[80vh] flex flex-col items-center justify-start pt-6 pb-12 px-3 sm:px-4 md:px-6 relative">
      {/* Mobile Stats Toggle Button */}
      <button
        onClick={() => setShowStatsModal(true)}
        className="lg:hidden fixed top-3 right-3 z-40 px-3 py-2 rounded-xl bg-[#3d1f14]/90 border border-amber-900/30 text-[#f4e4bc] text-xs font-black tracking-wider shadow-lg backdrop-blur-sm flex items-center gap-2"
      >
        <Eye className="w-3.5 h-3.5" />
        能力值
      </button>

      {/* Desktop Stats Floating Panel */}
      <div className="hidden lg:block fixed top-6 right-6 z-50 pointer-events-auto scale-[0.65] origin-top-right hover:scale-100 transition-all duration-500">
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

      {/* Stats Modal for Mobile */}
      <AnimatePresence>
        {showStatsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowStatsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative classical-frame p-6 shadow-[0_30px_70px_rgba(0,0,0,0.7)] max-w-[360px] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowStatsModal(false)}
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/10 border border-black/20 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-[#3d1f14]" />
              </button>
              <div className="flex items-center justify-center mb-3">
                <div className="px-4 py-1 rounded-full border border-black/30 bg-black/[0.06] shadow-sm">
                  <span className="text-xs font-black tracking-[0.3em] uppercase text-[#1a0f0a]">Soul Status</span>
                </div>
              </div>
              <MagicCircleStats stats={character.stats} className="mx-auto" size="sm" />
              <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                {Object.entries(character.stats).map(([key, val]) => (
                  <div key={key} className="bg-black/[0.05] rounded-xl p-2 border border-black/10">
                    <div className="text-[10px] text-[#4a3728]/60 font-black uppercase tracking-wider">{STAT_LABELS[key as keyof Stats]}</div>
                    <div className="text-xl font-black text-[#1a0f0a]">{val}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Area */}
      <div className="w-full mb-6 sm:mb-8 md:mb-12 pr-0 lg:pr-24">
        <div className="flex flex-col items-center gap-3 sm:gap-4 md:gap-6">
          <motion.div
            key={chapters[currentChapterIndex]}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative px-6 sm:px-8 md:px-12 py-3 sm:py-4 group"
          >
            <div className="absolute inset-0 bg-pink-500/10 border-y border-pink-500/30 skew-x-[-20deg] group-hover:bg-pink-500/20 transition-colors" />
            <div className="relative flex items-center gap-2 sm:gap-4 md:gap-6">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-pink-300 animate-pulse" />
              <span className="text-lg sm:text-xl md:text-3xl font-black text-pink-200 tracking-[0.2em] sm:tracking-[0.3em] md:tracking-[0.4em] uppercase text-glow-sakura text-center leading-tight">
                {chapters[currentChapterIndex] || '连接异世界中...'}
              </span>
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-pink-300 animate-pulse" />
            </div>
          </motion.div>

          <div className="flex gap-2">
            {chapters.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === currentChapterIndex ? 'w-8 sm:w-10 md:w-12 bg-pink-400 text-glow-sakura' : 'w-3 sm:w-4 bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-4xl flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {loading && !showConsequence ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20"
            >
              <div className="classical-frame p-8 sm:p-12 md:p-16 flex flex-col items-center gap-6 sm:gap-8 md:gap-10">
                <div className="frame-corner frame-corner-tl" />
                <div className="frame-corner frame-corner-tr" />
                <div className="frame-corner frame-corner-bl" />
                <div className="frame-corner frame-corner-br" />
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32">
                  <div className="absolute inset-0 border-4 border-pink-400/10 rounded-full" />
                  <div className="absolute inset-0 border-4 border-pink-400 border-t-transparent rounded-full animate-spin" />
                  <div className="absolute inset-6 bg-pink-400/5 rounded-full animate-pulse" />
                </div>
                <div className="space-y-2 text-center">
                  <p className="text-lg sm:text-xl md:text-2xl font-black text-pink-200 tracking-[0.3em] sm:tracking-[0.4em] md:tracking-[0.5em] animate-pulse text-glow-sakura">
                    命运编织中
                  </p>
                  <p className="text-[10px] sm:text-xs text-pink-100/30 uppercase tracking-[0.2em]">Intertwining Fates...</p>
                </div>
              </div>
            </motion.div>
          ) : currentEvent && (
            <motion.div
              key="event"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 sm:space-y-8 md:space-y-10"
            >
              {/* Consequence Panel */}
              <AnimatePresence>
                {showConsequence && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    className="classical-frame p-6 sm:p-8 md:p-10 text-center relative"
                  >
                    <div className="frame-corner frame-corner-tl" />
                    <div className="frame-corner frame-corner-tr" />
                    <div className="frame-corner frame-corner-bl" />
                    <div className="frame-corner frame-corner-br" />
                    <div className="relative z-10 space-y-5 sm:space-y-6">
                      <div className="flex items-center justify-center gap-2 sm:gap-3">
                        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400" />
                        <span className="text-xs sm:text-sm font-black text-pink-300/60 uppercase tracking-[0.3em]">命运的回响</span>
                        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400" />
                      </div>
                      <p className="text-lg sm:text-xl md:text-2xl leading-relaxed font-bold text-pink-50">
                        {lastConsequence}
                      </p>
                      {hasStatChanges && (
                        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                          {statChangesList.map(({ label, value }) => (
                            <span
                              key={label}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-sm sm:text-base font-black border ${
                                value > 0
                                  ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
                                  : value < 0
                                    ? 'bg-red-500/20 border-red-400/30 text-red-300'
                                    : 'bg-white/10 border-white/20 text-white/50'
                              }`}
                            >
                              {label}
                              <span>{value > 0 ? '+' : ''}{value}</span>
                            </span>
                          ))}
                        </div>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleDismissConsequence}
                        className="aurora-button !px-8 !py-3 mx-auto text-sm sm:text-base"
                      >
                        继续前行
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Scenario Display */}
              <div className="classical-frame min-h-[180px] sm:min-h-[220px] md:min-h-[280px] flex items-center justify-center p-6 sm:p-8 md:p-12 text-center relative group">
                <div className="frame-corner frame-corner-tl" />
                <div className="frame-corner frame-corner-tr" />
                <div className="frame-corner frame-corner-bl" />
                <div className="frame-corner frame-corner-br" />

                <div className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-3">
                  <div className="h-px w-6 sm:w-8 bg-pink-500/30" />
                  <span className="text-[8px] sm:text-[10px] font-black text-pink-300/40 uppercase tracking-[0.4em] sm:tracking-[0.6em]">Scenario Log</span>
                  <div className="h-px w-6 sm:w-8 bg-pink-500/30" />
                </div>

                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl leading-relaxed font-bold text-pink-50 px-2 sm:px-4">
                  {currentEvent.event}
                </p>

                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 sm:px-6 py-1 bg-night border border-pink-500/30 rounded-full text-[9px] sm:text-[10px] text-pink-300/50 uppercase tracking-widest font-black">
                  Event {eventCount} / 5
                </div>
              </div>

              {/* Interaction Area */}
              <div className="space-y-5 sm:space-y-6 md:space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {currentEvent.options.map((opt, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.02, x: 3 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleOptionSelect(opt)}
                      className="aurora-button !justify-start group text-left p-4 sm:p-5 md:p-6 min-h-[70px] sm:min-h-[80px]"
                    >
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/5 flex items-center justify-center text-xs sm:text-sm font-black text-pink-300 group-hover:bg-aurora-green group-hover:text-night transition-all duration-300 border border-white/5 shrink-0">
                        {idx + 1}
                      </div>
                      <span className="flex-1 text-sm sm:text-base md:text-lg group-hover:text-glow-aurora transition-all ml-2 sm:ml-3">{opt.text}</span>
                    </motion.button>
                  ))}
                </div>

                {/* Input Box */}
                <div className="relative group max-w-2xl mx-auto">
                  <div className="absolute -inset-1 bg-gradient-to-r from-pink-500/20 via-aurora-green/20 to-pink-500/20 rounded-[2rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />
                  <div className="relative glass-panel !rounded-[2rem] p-1.5 sm:p-2 flex items-center gap-2 sm:gap-3 border-white/10 focus-within:border-pink-500/30 transition-all">
                    <input
                      type="text"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="编织你独特的意志..."
                      className="flex-1 bg-transparent border-none focus:ring-0 px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-sm sm:text-lg font-medium placeholder:text-pink-100/20"
                      onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
                    />
                    <button
                      onClick={handleCustomSubmit}
                      className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-pink-500/10 hover:bg-pink-500/30 rounded-2xl transition-all flex items-center justify-center group/btn shrink-0"
                    >
                      <Send className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-pink-300 group-hover/btn:scale-110 group-hover/btn:rotate-12 transition-all" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
