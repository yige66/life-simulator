'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, X, Eye, Star } from 'lucide-react';

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
  isSpecial?: boolean;
}

interface Props {
  character: {
    name: string;
    background: string;
    worldview: string;
    stats: Stats;
  };
  onUpdateStats: (newStats: Stats) => void;
  onGameEnd: (summary: string, stats: Stats) => void;
}

const STAT_LABELS: Record<keyof Stats, string> = {
  智力: '智力',
  魅力: '魅力',
  体力: '体力',
  运气: '运气',
};

const SPECIAL_CHANCE = 0.15;

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
  const [isSpecialEvent, setIsSpecialEvent] = useState(false);
  const statsRef = useRef(character.stats);
  const historyRef = useRef<string[]>([]);

  useEffect(() => { statsRef.current = character.stats; }, [character.stats]);
  useEffect(() => { historyRef.current = history; }, [history]);

  const safeParseJsonFromModel = (raw: unknown) => {
    if (typeof raw !== 'string') return null;
    try { return JSON.parse(raw); } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) return null;
      try { return JSON.parse(match[0]); } catch { return null; }
    }
  };

  const fetchDeepseek = async (messages: Array<{ role: string; content: string }>, timeoutMs = 18000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch('/api/deepseek', {
        method: 'POST', body: JSON.stringify({ messages }), signal: controller.signal,
      });
      const data = await res.json();
      return data?.choices?.[0]?.message?.content as unknown;
    } finally { clearTimeout(timer); }
  };

  const getStatScaleHint = (stats: Stats) => {
    const maxVal = Math.max(...Object.values(stats));
    const minVal = Math.min(...Object.values(stats));
    const absMax = Math.max(Math.abs(maxVal), Math.abs(minVal));
    if (absMax >= 50) return `该角色某项属性数值极端（绝对值≥50），应生成极度夸张、传奇甚至荒诞级别的事件和后果，effect数值幅度±5~±15。${maxVal >= 50 ? '超高属性方向：展现神级能力或传说级存在感。' : '极低属性方向（≤-50）：展现灾难性短板带来的荒谬或戏剧性局面。'}`;
    if (absMax >= 20) return '该角色属性显著偏离常轨（绝对值≥20），事件应有一定规模和戏剧性，effect幅度适中（±3~±8）。';
    if (absMax >= 10) return '该角色属性略高于或低于常人，事件可有一定起伏，effect幅度±1~±4。';
    return '';
  };

  const getSystemPrompt = (hasUserAction: boolean, isSpecial: boolean, stats: Stats) => {
    const typeLabel = isSpecial ? '★特殊事件★' : '普通事件';
    const scaleHint = getStatScaleHint(stats);
    return `你是一个日式轻小说风格的游戏引擎。保持叙事高度连贯，每个事件都与前文、章节主题、世界观和角色身份自然衔接。

当前事件类型：${typeLabel}
${isSpecial ? '特殊事件规则：事件更加戏剧化、高张力，影响更大；effect数值幅度在±3~±12之间；事件描述更具视觉冲击力。' : '普通事件规则：保持日常冒险节奏，effect数值幅度在±1~±3之间；事件轻松有趣。'}
${scaleHint}

生成规则：
1. 事件必须扎根于「世界观」与「角色身份背景」，不可脱离这些设定
2. 每次事件推进都要有因果关系
3. 选项必须与当前事件情境紧密相关
4. 不得涉及任何政治话题、政治人物、政治隐喻
5. 不得包含色情、暴力描写，保持在PG-13
6. 不得出现歧视、侮辱性内容

返回严格JSON：
{
  "event": "事件描述（80-120字，承接前文）",
  "options": [{"text": "选项", "effects": {"智力": 1}}],
  "actionEffects": {"智力": -2},
  "consequence": "选择后的直接后果叙述（40-60字），解释属性为何变化"
}`;
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

  useEffect(() => {
    const initChapters = async () => {
      setLoading(true);
      try {
        const raw = await fetchDeepseek([
          { role: 'system', content: `你是轻小说作家。根据玩家信息生成2-4个篇章标题，标题必须呼应世界观和角色身份，叙事有递进关系。返回JSON：{"chapters": ["标题1", "标题2"]}` },
          { role: 'user', content: `名字：${character.name}，背景：${character.background}，世界观：${character.worldview}` },
        ]);
        const parsed = safeParseJsonFromModel(raw);
        const nextChapters = Array.isArray(parsed?.chapters) && parsed.chapters.length > 0 ? parsed.chapters : null;
        if (!nextChapters) { ensureFallbackStart(); return; }
        setChapters(nextChapters);
        generateEvent(nextChapters[0]);
      } catch (err) { console.error('Failed to init chapters', err); ensureFallbackStart(); }
      finally { setLoading(false); }
    };
    initChapters();
  }, []);

  const generateEvent = async (
    chapterTitle: string,
    context?: { userAction?: string; stats?: Stats; history?: string[] },
  ) => {
    setLoading(true);
    try {
      const statsForPrompt = context?.stats ?? statsRef.current;
      const historyForPrompt = context?.history ?? historyRef.current;
      const recentHistory = historyForPrompt.slice(-8).join('\n');
      const userAction = context?.userAction;
      const isSpecial = Math.random() < SPECIAL_CHANCE;
      setIsSpecialEvent(isSpecial);

      const raw = await fetchDeepseek([
        { role: 'system', content: getSystemPrompt(!!userAction, isSpecial, statsForPrompt) },
        {
          role: 'user',
          content: `角色名：${character.name}
身份背景：${character.background}
世界观：${character.worldview}
当前篇章：${chapterTitle}
当前属性：${JSON.stringify(statsForPrompt)}
近期事件历史：
${recentHistory || '（游戏开始）'}
${userAction ? `\n玩家自定义动作：${userAction}` : ''}
\n请生成下一个${isSpecial ? '★特殊★' : ''}事件，必须与世界观和角色身份紧密相关。`,
        },
      ]);

      const parsed = safeParseJsonFromModel(raw);
      const nextEvent: EventData | null =
        parsed && typeof parsed.event === 'string' && Array.isArray(parsed.options) ? { ...parsed, isSpecial } : null;

      if (!nextEvent) {
        setCurrentEvent({
          event: userAction
            ? `你尝试了「${userAction}」，空气里传来微不可闻的回响。`
            : '魔法阵的符文短暂闪烁了一下……但你仍能继续前进。',
          options: [{ text: '继续向前', effects: {} }, { text: '稳住心神', effects: { 体力: 1 } }, { text: '默念咒文', effects: { 智力: 1 } }],
        });
        setIsSpecialEvent(false);
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
            const effText = Object.entries(changes).map(([k, v]) => `${STAT_LABELS[k as keyof Stats]}${v >= 0 ? '+' : ''}${v}`).join(' ');
            setHistory([...context.history, `行动「${userAction}」→ ${nextEvent.consequence || ''} 影响：${effText}`]);
          }
        }
        const normalizedOptions = (nextEvent.options || []).map((opt: any) => ({
          text: typeof opt?.text === 'string' ? opt.text : String(opt?.text ?? ''),
          effects: opt?.effects && typeof opt.effects === 'object' ? opt.effects : {},
        })).filter((opt: any) => opt.text && opt.text.length > 0);
        setCurrentEvent({
          ...nextEvent,
          options: normalizedOptions.length >= 2 ? normalizedOptions : [{ text: '稳步前行', effects: {} }, { text: '驻足观望', effects: { 智力: 1 } }],
          isSpecial,
        });
      }
      setShowConsequence(true);
      setEventCount(prev => prev + 1);
    } catch (err) {
      console.error('Failed to generate event', err);
      setCurrentEvent({
        event: '命运的线条被风暴短暂遮蔽，你仍能凭直觉做出选择。',
        options: [{ text: '继续', effects: {} }, { text: '谨慎前进', effects: { 运气: 1 } }, { text: '强行突破', effects: { 体力: 1 } }],
      });
      setIsSpecialEvent(false);
      setShowConsequence(false);
    } finally { setLoading(false); }
  };

  const handleOptionSelect = (option: Option) => {
    const newStats = { ...statsRef.current };
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
    const nextHistory = [...historyRef.current, `事件：${currentEvent?.event} → 选择：${option.text} → ${currentEvent?.consequence || ''}`];
    setHistory(nextHistory);
    setShowConsequence(true);
  };

  const handleDismissConsequence = () => {
    setShowConsequence(false);
    checkProgression(statsRef.current, historyRef.current);
  };

  const handleCustomSubmit = async () => {
    if (!customInput.trim()) return;
    const action = customInput;
    setCustomInput('');
    const nextHistory = [...historyRef.current, `玩家自定义行动：${action}`];
    setHistory(nextHistory);
    await generateEvent(chapters[currentChapterIndex], { userAction: action, stats: statsRef.current, history: nextHistory });
  };

  const checkProgression = (statsOverride?: Stats, historyOverride?: string[]) => {
    if (eventCount >= 5) {
      if (currentChapterIndex < chapters.length - 1) {
        setCurrentChapterIndex(prev => prev + 1);
        setEventCount(0);
        generateEvent(chapters[currentChapterIndex + 1], { stats: statsOverride, history: historyOverride });
      } else {
        onGameEnd((historyOverride ?? historyRef.current).join('\n'), statsOverride ?? statsRef.current);
      }
    } else {
      generateEvent(chapters[currentChapterIndex], { stats: statsOverride, history: historyOverride });
    }
  };

  const hasStatChanges = Object.keys(lastStatChanges).length > 0;
  const statChangesList = Object.entries(lastStatChanges).filter(([, v]) => v !== 0)
    .map(([k, v]) => ({ label: STAT_LABELS[k as keyof Stats], value: v as number }));

  const eventFrameClass = isSpecialEvent
    ? 'special-event-frame min-h-[180px] sm:min-h-[220px] md:min-h-[280px] flex items-center justify-center p-6 sm:p-8 md:p-12 text-center relative group'
    : 'classical-frame min-h-[180px] sm:min-h-[220px] md:min-h-[280px] flex items-center justify-center p-6 sm:p-8 md:p-12 text-center relative group';

  return (
    <div className="w-full max-w-6xl min-h-[80vh] flex flex-col items-center justify-start pt-6 pb-12 px-3 sm:px-4 md:px-6 relative">
      <button onClick={() => setShowStatsModal(true)}
        className="lg:hidden fixed top-3 right-3 z-40 px-3 py-2 rounded-xl bg-[#3d1f14]/90 border border-amber-900/30 text-[#f4e4bc] text-xs font-black tracking-wider shadow-lg backdrop-blur-sm flex items-center gap-2">
        <Eye className="w-3.5 h-3.5" />能力值
      </button>

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

      <AnimatePresence>
        {showStatsModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowStatsModal(false)}>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
              className="relative classical-frame p-6 shadow-[0_30px_70px_rgba(0,0,0,0.7)] max-w-[360px] w-full"
              onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowStatsModal(false)}
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/10 border border-black/20 flex items-center justify-center">
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

      <div className="w-full mb-6 sm:mb-8 md:mb-12 pr-0 lg:pr-24">
        <div className="flex flex-col items-center gap-3 sm:gap-4 md:gap-6">
          <motion.div key={chapters[currentChapterIndex]} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="relative px-6 sm:px-8 md:px-12 py-3 sm:py-4 group">
            <div className={`absolute inset-0 border-y ${isSpecialEvent ? 'bg-amber-500/15 border-amber-400/40' : 'bg-pink-500/10 border-pink-500/30'} skew-x-[-20deg] group-hover:bg-pink-500/20 transition-colors`} />
            <div className="relative flex items-center gap-2 sm:gap-4 md:gap-6">
              {isSpecialEvent ? <Star className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 animate-pulse" /> : <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-pink-300 animate-pulse" />}
              <span className={`text-lg sm:text-xl md:text-3xl font-black tracking-[0.2em] sm:tracking-[0.3em] md:tracking-[0.4em] uppercase text-center leading-tight ${isSpecialEvent ? 'text-amber-200 text-glow-gold' : 'text-pink-200 text-glow-sakura'}`}>
                {chapters[currentChapterIndex] || '连接异世界中...'}
              </span>
              {isSpecialEvent ? <Star className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 animate-pulse" /> : <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-pink-300 animate-pulse" />}
            </div>
          </motion.div>
          <div className="flex gap-2">
            {chapters.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === currentChapterIndex ? 'w-8 sm:w-10 md:w-12 bg-pink-400 text-glow-sakura' : 'w-3 sm:w-4 bg-white/10'}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="w-full max-w-4xl flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {loading && !showConsequence ? (
            <motion.div key="loading" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }}
              className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20">
              <div className="classical-frame p-8 sm:p-12 md:p-16 flex flex-col items-center gap-6 sm:gap-8 md:gap-10">
                <div className="frame-corner frame-corner-tl" /><div className="frame-corner frame-corner-tr" />
                <div className="frame-corner frame-corner-bl" /><div className="frame-corner frame-corner-br" />
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32">
                  <div className="absolute inset-0 border-4 border-pink-400/10 rounded-full" />
                  <div className="absolute inset-0 border-4 border-pink-400 border-t-transparent rounded-full animate-spin" />
                  <div className="absolute inset-6 bg-pink-400/5 rounded-full animate-pulse" />
                </div>
                <div className="space-y-2 text-center">
                  <p className="text-lg sm:text-xl md:text-2xl font-black text-pink-200 tracking-[0.3em] sm:tracking-[0.4em] md:tracking-[0.5em] animate-pulse text-glow-sakura">命运编织中</p>
                  <p className="text-[10px] sm:text-xs text-pink-100/30 uppercase tracking-[0.2em]">Intertwining Fates...</p>
                </div>
              </div>
            </motion.div>
          ) : currentEvent && (
            <motion.div key="event" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-8 md:space-y-10">
              <AnimatePresence>
                {showConsequence && (
                  <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    className={isSpecialEvent ? 'special-event-frame p-6 sm:p-8 md:p-10 text-center relative' : 'classical-frame p-6 sm:p-8 md:p-10 text-center relative'}>
                    {!isSpecialEvent && <><div className="frame-corner frame-corner-tl" /><div className="frame-corner frame-corner-tr" /><div className="frame-corner frame-corner-bl" /><div className="frame-corner frame-corner-br" /></>}
                    <div className="relative z-10 space-y-5 sm:space-y-6">
                      <div className="flex items-center justify-center gap-2 sm:gap-3">
                        {isSpecialEvent ? <Star className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" /> : <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400" />}
                        <span className={`text-xs sm:text-sm font-black uppercase tracking-[0.3em] ${isSpecialEvent ? 'text-amber-300/70' : 'text-pink-300/60'}`}>
                          {isSpecialEvent ? '★ 命运转折 ★' : '命运的回响'}
                        </span>
                        {isSpecialEvent ? <Star className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" /> : <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400" />}
                      </div>
                      <p className={`text-lg sm:text-xl md:text-2xl leading-relaxed font-bold ${isSpecialEvent ? 'text-amber-100' : 'text-pink-50'}`}>
                        {lastConsequence}
                      </p>
                      {hasStatChanges && (
                        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                          {statChangesList.map(({ label, value }) => (
                            <span key={label}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-sm sm:text-base font-black border stat-badge-up ${
                                value > 0 ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
                                : value < 0 ? 'bg-red-500/20 border-red-400/30 text-red-300'
                                : 'bg-white/10 border-white/20 text-white/50'
                              }`}>{label}<span>{value > 0 ? '+' : ''}{value}</span></span>
                          ))}
                        </div>
                      )}
                      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleDismissConsequence}
                        className={`!px-8 !py-3 mx-auto text-sm sm:text-base ${isSpecialEvent ? 'golden-button' : 'aurora-button'}`}>
                        {isSpecialEvent ? '握住命运的丝线' : '继续前行'}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className={eventFrameClass}>
                {!isSpecialEvent && <><div className="frame-corner frame-corner-tl" /><div className="frame-corner frame-corner-tr" /><div className="frame-corner frame-corner-bl" /><div className="frame-corner frame-corner-br" /></>}
                {isSpecialEvent && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 px-5 py-1.5 bg-gradient-to-r from-amber-600 to-yellow-500 rounded-full border-2 border-amber-300/50 shadow-[0_0_30px_rgba(251,191,36,0.4)]">
                    <span className="text-xs font-black text-amber-950 tracking-[0.3em] uppercase flex items-center gap-1.5">
                      <Star className="w-3 h-3 fill-amber-950" />特殊事件<Star className="w-3 h-3 fill-amber-950" />
                    </span>
                  </div>
                )}
                <div className={`absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-3 ${isSpecialEvent ? 'mt-4' : ''}`}>
                  <div className={`h-px w-6 sm:w-8 ${isSpecialEvent ? 'bg-amber-400/40' : 'bg-pink-500/30'}`} />
                  <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-[0.4em] sm:tracking-[0.6em] ${isSpecialEvent ? 'text-amber-300/50' : 'text-pink-300/40'}`}>Scenario Log</span>
                  <div className={`h-px w-6 sm:w-8 ${isSpecialEvent ? 'bg-amber-400/40' : 'bg-pink-500/30'}`} />
                </div>
                <p className={`text-lg sm:text-xl md:text-2xl lg:text-3xl leading-relaxed font-bold px-2 sm:px-4 ${isSpecialEvent ? 'text-amber-50' : 'text-pink-50'}`}>
                  {currentEvent.event}
                </p>
                <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 sm:px-6 py-1 border rounded-full text-[9px] sm:text-[10px] uppercase tracking-widest font-black ${isSpecialEvent ? 'bg-amber-900/80 border-amber-500/40 text-amber-300/60' : 'bg-night border-pink-500/30 text-pink-300/50'}`}>
                  Event {eventCount} / 5
                </div>
              </div>

              <div className="space-y-5 sm:space-y-6 md:space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {currentEvent.options.map((opt, idx) => (
                    <motion.button key={idx} whileHover={{ scale: 1.02, x: 3 }} whileTap={{ scale: 0.98 }} onClick={() => handleOptionSelect(opt)}
                      className={`!justify-start group text-left p-4 sm:p-5 md:p-6 min-h-[70px] sm:min-h-[80px] ${isSpecialEvent ? 'golden-button' : 'aurora-button'}`}>
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xs sm:text-sm font-black transition-all duration-300 border shrink-0 ${isSpecialEvent ? 'bg-amber-500/20 border-amber-400/20 text-amber-300 group-hover:bg-amber-400 group-hover:text-amber-950' : 'bg-white/5 border-white/5 text-pink-300 group-hover:bg-aurora-green group-hover:text-night'}`}>
                        {idx + 1}
                      </div>
                      <span className={`flex-1 text-sm sm:text-base md:text-lg transition-all ml-2 sm:ml-3 ${isSpecialEvent ? 'group-hover:text-amber-200' : 'group-hover:text-glow-aurora'}`}>{opt.text}</span>
                    </motion.button>
                  ))}
                </div>
                <div className="relative group max-w-2xl mx-auto">
                  <div className="absolute -inset-1 bg-gradient-to-r from-pink-500/20 via-aurora-green/20 to-pink-500/20 rounded-[2rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />
                  <div className="relative glass-panel !rounded-[2rem] p-1.5 sm:p-2 flex items-center gap-2 sm:gap-3 border-white/10 focus-within:border-pink-500/30 transition-all">
                    <input type="text" value={customInput} onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="编织你独特的意志..." onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
                      className="flex-1 bg-transparent border-none focus:ring-0 px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-sm sm:text-lg font-medium placeholder:text-pink-100/20" />
                    <button onClick={handleCustomSubmit}
                      className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-pink-500/10 hover:bg-pink-500/30 rounded-2xl transition-all flex items-center justify-center group/btn shrink-0">
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
