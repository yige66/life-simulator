'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, X, Eye, Star, Music, Music2 } from 'lucide-react';

import MagicCircleStats from './MagicCircleStats';

interface Stats {
  智力: number;
  魅力: number;
  体力: number;
  运气: number;
}

interface GameOption {
  choice: string;
  text: string;
  effectsSummary: string;
}

interface EventData {
  narrative: string;
  mood: 'calm' | 'mysterious' | 'emotional';
  milestone: string;
  effectsSummary?: string;
  options: GameOption[];
  isSpecial?: boolean;
  chapterEnd?: boolean;
}

interface Props {
  character: {
    name: string;
    background: string;
    worldview: string;
    stats: Stats;
  };
  onUpdateStats: (newStats: Stats) => void;
  onGameEnd: (summary: string, stats: Stats, fateEvents: string[]) => void;
}

const STAT_LABELS: Record<keyof Stats, string> = {
  智力: '智力',
  魅力: '魅力',
  体力: '体力',
  运气: '运气',
};

const EFFECTS_EN_TO_CN: Record<string, keyof Stats> = {
  intelligence: '智力', int: '智力', wisdom: '智力', iq: '智力',
  charm: '魅力', charisma: '魅力', char: '魅力', allure: '魅力',
  stamina: '体力', vit: '体力', vitality: '体力', strength: '体力', str: '体力', end: '体力', endurance: '体力',
  luck: '运气', fortune: '运气', lck: '运气',
};

const SPECIAL_CHANCE = 0.01;

const parseEffectsSummary = (raw: string | undefined): Partial<Stats> => {
  if (!raw || typeof raw !== 'string') return {};
  const result: Partial<Stats> = {};
  const parts = raw.split(/[,，\s]+/).filter(Boolean);
  for (const part of parts) {
    const m = part.match(/^([a-zA-Z]+)\s*:\s*([+-]\d+)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = parseInt(m[2], 10);
    if (!Number.isFinite(val)) continue;
    const cnKey = EFFECTS_EN_TO_CN[key];
    if (cnKey) result[cnKey] = (result[cnKey] ?? 0) + val;
  }
  return result;
};

const NARRATIVE_STAT_KEYS: Record<keyof Stats, RegExp> = {
  智力: /智[力慧]|推理|逻辑|记忆|思维|头脑|分析|思考|灵机|灵光|判断|洞察|豁然开朗|新发现|真谛/,
  魅力: /魅[力惑]|吸引|气质|风[采度]|人[缘脉]|口才|谈吐|亲和|交[谈流际]|迷人|称赞|赞赏|倾倒/,
  体力: /体[力能]|力[气量]|身[体躯]|强壮|坚[韧固]|战斗|伤[痛势口]|受伤|重伤|疲惫|疲劳|虚[弱]|累倒|透支|体魄|体术|肌肉|硬扛|奔跑|挽回|困倦|精力|恐惧|噩梦|苦果|代价|隐[隐痛]/,
  运气: /运[气势]|幸[运好]|巧合|偶然|机缘|命运|奇迹|天选|倒霉|不幸|意外|厄运|奇遇|好运|坏运/,
};

const NARRATIVE_DOWN = /下降|减弱|减少|降低|流失|削弱|损耗|衰退|恶化|变弱|疲惫|疲劳|受伤|重伤|失败|倒霉|不幸|虚弱|透支|模糊|轻视|疏远|嘲笑|消耗|耗尽|下跌|下滑|跌[了下到]|意外|惨败|落败|不[足好]|困倦|误判|被误导|吃亏|被冷落|无视|变差|打击|内疚/;
const NARRATIVE_UP   = /上升|增强|增加|提升|增长|强化|恢复|进步|飞跃|高涨|变强|觉醒|成功|获得|领悟|吸引|奇迹|天选|机缘|亲和|口才|谈吐|挽回|痊愈|好转|消散|消失|恢复|愈合|消除|终结|消散|退散|加速|敬[畏佩]|求[教助]|追随|倾倒|称赞|赞赏|出奇|好[转了]|奇遇|治疗|救治|爆发|膨胀|掌控|冲天|绽放|涌动|碾压|主宰|骇人|威慑|征服|力压/;
const NARRATIVE_NEGATE = /一扫而空|消[失散退]|恢[复]|愈[合]|治[愈疗]|好[转]|消除|不复存在|退[去却散]|挽救|挽回|痊愈|不再|消散|终结|退散|远去|远[离去]/;

const clauseDirection = (text: string, keywordRegex: RegExp): 'down' | 'up' | null => {
   const isD = NARRATIVE_DOWN.test(text);
   const isU = NARRATIVE_UP.test(text);
   if (!isD && !isU) return null;
   const neg = NARRATIVE_NEGATE.test(text);

   if (isD && isU) {
     if (neg) return 'up';
     const dRe = new RegExp(NARRATIVE_DOWN.source, 'g');
     const uRe = new RegExp(NARRATIVE_UP.source, 'g');
     let m: RegExpExecArray | null, lastD = -1, lastU = -1;
     while ((m = dRe.exec(text)) !== null) lastD = m.index;
     while ((m = uRe.exec(text)) !== null) lastU = m.index;
     return lastD > lastU ? 'down' : 'up';
   }

   if (isD) return neg ? 'up' : 'down';
   return 'up';
 };

const validateEffectsWithNarrative = (narrative: string, effects: Partial<Stats>): Partial<Stats> => {
  if (!narrative) return {};
  const validated: Partial<Stats> = {};
  const clauses = narrative.split(/，|。|；|、|——|…|\.{3}|但|然而|不过|却|可是|只是/).filter(s => s.length > 0);

  for (const [key, regex] of Object.entries(NARRATIVE_STAT_KEYS)) {
    const stat = key as keyof Stats;
    const val = effects[stat];
    if (val === undefined) continue;

    const matching = clauses.filter(c => regex.test(c));
    if (matching.length === 0) continue;

    let dir: 'down' | 'up' | null = null;
    for (const c of matching) {
      const d = clauseDirection(c, regex);
      if (d) dir = d;
    }
    if (!dir) { validated[stat] = val; continue; }

    const magnitude = Math.abs(val);
    validated[stat] = dir === 'down' ? -magnitude : magnitude;
  }

  if (Object.keys(validated).length === 0) {
    for (const [k, v] of Object.entries(effects)) { if (v !== undefined) validated[k as keyof Stats] = v; }
    return validated;
  }
  return validated;
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
  const [lastNarrative, setLastNarrative] = useState('');
  const [lastStatChanges, setLastStatChanges] = useState<Partial<Stats>>({});
  const [lastMilestone, setLastMilestone] = useState('');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [eventType, setEventType] = useState<'normal' | 'special' | 'miracle' | 'disaster'>('normal');

  const isSpecialUI = eventType === 'special' || eventType === 'miracle' || eventType === 'disaster';
  const [mood, setMood] = useState<'calm' | 'mysterious' | 'emotional'>('calm');
  const [musicOn, setMusicOn] = useState(false);
  const statsRef = useRef(character.stats);
  const historyRef = useRef<string[]>([]);
  const chapterEndRef = useRef(false);
  const fateEventsRef = useRef<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const miracleLockedRef = useRef<Set<keyof Stats>>(new Set());
  const disasterLockedRef = useRef<Set<keyof Stats>>(new Set());
  const statsForPromptRef = useRef<Stats>(character.stats);

  useEffect(() => { statsRef.current = character.stats; }, [character.stats]);
  useEffect(() => { historyRef.current = history; }, [history]);

  const BGM_SRC: Record<string, string> = {
    calm: '/music/calm.wav',
    mysterious: '/music/mysterious.mp3',
    emotional: '/music/emotional.mp3',
  };

  const switchMusic = (m: 'calm' | 'mysterious' | 'emotional') => {
    setMood(m);
    if (!musicOn) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const audio = new Audio(BGM_SRC[m]);
    audio.loop = true;
    audio.volume = 0.3;
    audio.play().catch(() => {});
    audioRef.current = audio;
  };

  const toggleBGM = () => {
    const next = !musicOn;
    setMusicOn(next);
    if (!next && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (next) {
      const audio = new Audio(BGM_SRC[mood]);
      audio.loop = true;
      audio.volume = 0.3;
      audio.play().catch(() => {});
      audioRef.current = audio;
    }
  };

  useEffect(() => {
    return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } };
  }, []);

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
    if (absMax >= 50) return `该角色某项属性数值极端（绝对值≥50），效果幅度±5~±15。${maxVal >= 50 ? '超高属性方向：展现神级能力。' : '极低属性方向（≤-50）：灾难性短板。'}`;
    if (absMax >= 20) return '属性显著偏离常轨（绝对值≥20），效果幅度±3~±8。';
    if (absMax >= 10) return '属性略高于或低于常人，效果幅度±1~±4。';
    return '属性在正常范围，效果幅度±1~±3。';
  };

  const getSystemPrompt = (hasUserAction: boolean, isSpecial: boolean, isMiracle: boolean, isDisaster: boolean, miracleStat: string | null, disasterStat: string | null, stats: Stats) => {
    const typeLabel = isMiracle ? `★神迹降临·${miracleStat}★`
      : isDisaster ? `★深渊灾厄·${disasterStat}★`
      : isSpecial ? '★命运转折事件★'
      : '普通事件';
    const scaleHint = isSpecial ? '命运转折事件效果幅度，±8~±25。' : getStatScaleHint(stats);

    const currentStatsDesc = `当前属性：智力=${stats.智力}（${stats.智力>=10?'高':stats.智力<=0?'低':'中'}），魅力=${stats.魅力}（${stats.魅力>=10?'高':stats.魅力<=0?'低':'中'}），体力=${stats.体力}（${stats.体力>=10?'高':stats.体力<=0?'低':'中'}），运气=${stats.运气}（${stats.运气>=10?'高':stats.运气<=0?'低':'中'}）。`;

    const statRules = `
★ 能力值深度影响成败：
  - 智力≥10 → 分析识破轻成功，NPC敬畏请教；智力≤0 → 误判被误导
  - 魅力≥10 → 社交说服无往不利，NPC倾倒追随；魅力≤0 → 被冷落无视
  - 体力≥10 → 纯粹的力量碾压，战斗突破势如破竹，NPC畏惧求助；体力≤0 → 力竭虚弱无力抗衡
  - 运气≥10 → 巧合奇迹常伴，称天选之人；运气≤0 → 倒霉意外不断
  - 体力不是消耗品或血量，而是一种先天/后天积累的「力」——力量、气势、威慑力的总和。体力高代表强韧不可摧，体力低代表物理层面孱弱无力。战斗中不会因为受伤而削弱体力值，体力值描述的是这个人本身有多"强"。
  - 叙事中必须因高属性得利、因低属性受挫，不可随机判定成败。
  - NPC态度、社会地位、声望随属性浮动。`;

    const baseRules = `
★ 生成前确认步骤（每次生成 narrative 前必须完成）：
  1. 复述玩家刚才选择的选项内容或自定义回答。
  2. 确认当前事件类型（普通/特殊/命运转折）。
  3. 确认当前阶段标题和已发生的事件数量。

★ 核心规则 铁律，必须遵守：
  1. narrative必须严格围绕玩家刚才的选择展开，不得凭空生成新故事方向，不得重复前文已发生的事件内容。如果玩家选了A，故事沿A的后果写；如果玩家自定义输入了行动，故事必须围绕这个行动展开。
  2. narrative是纯粹的文学叙事，不包含任何数字、标签或属性名。用优美的日式轻小说笔法。
  3. 事件必须扎根于「世界观」与「角色身份背景」。
  4. 不能涉及政治话题/政治人物/政治隐喻。
  5. 选项必须与当前事件情境紧密相关，有2~4个。

★ 时间跨度与阶段内连续性 铁律，必须遵守：
  - 每次生成新事件时，应在叙事中体现时间推进（如"第二天清晨""三天后""一周后的黄昏"）。
  - 同一阶段内的多个事件必须保持叙事连续性，上一个事件的结尾应自然衔接下一个事件的开头。阶段内时间跨度可以很小（同一天、数小时）。
  - 叙事中应体现当前事件与阶段内前序事件的因果关联（如"因为你三天前救了那名旅人，今天他带着谢礼找到了你"）。
  - 角色当前状态（受伤、疲惫、兴奋等）应从前一个事件延续到下一个事件，除非叙事中明确交代了状态的改变。
  - 禁止在阶段内部出现"断崖式跳跃"（如从战斗中突然切到无关的日常场景）。
  - 跨入新阶段时，必须在叙事中体现明确的时间跳跃（如"三年后""十年后"）和过渡旁白，描述角色成长与变化。

★ effectsSummary 铁律：
  - narrative中必须自然地描述与属性变化相关的迹象（如"你感到体力不支""你的勇气在增长"）。
  - 每个回响至少影响一项能力值，除非当前叙事是纯粹的观察性描述（如环境描写、NPC对话，不涉及角色的行动后果）。
  - 叙事中明确提到的属性变化迹象，必须在 effectsSummary 中精确总结。
  - **符号必须与叙事一致**：叙事说"体力减弱/受伤/疲惫"→ effectsSummary 该属性必须是负数（如 stamina:-2）；叙事说"智力提升/觉醒/分析成功"→ 必须是正数（如 intelligence:+2）。
  - 叙事中**未提到**的属性，effectsSummary 中**绝不可出现**。
  - effectsSummary 格式：intelligence:+1, stamina:-2（英文属性名:符号数值，逗号分隔）。
  - 英文属性名只用：intelligence(智力) charm(魅力) stamina(体力) luck(运气)。
  - 数值幅度：${scaleHint}

★ mood 选择：
  - calm：平静日常、温暖治愈的场景。
  - mysterious：神秘奇幻、探索未知、悬疑气氛。
  - emotional：命运转折、重大抉择、深情时刻、悲欢离合。

★ milestone：对本次事件中玩家选择及其后果的一句话总结（15-30字），有画面感，如传记批注。`;

    const specialRules = isSpecial ? `
★ 命运转折事件特殊规则：
  - 这是极其罕见的关键剧情节点，强烈影响故事走向，内容离奇夸张特别。
  - 叙事必须体现"命运被改写"的史诗感与决定性。
  - 可能涉及神祇、时空裂缝、禁忌魔法觉醒、远古传说降临等。
  - effectsSummary 幅度 ±8~±25，属性将发生剧烈变化。` : '';

    const fatePromptHint = isSpecial ? '★命运转折点★：极为罕见！离奇夸张特别！effect幅度±8~±25。'
      : (isMiracle || isDisaster) ? `普通事件（但${isMiracle ? `${miracleStat}高达` : `${disasterStat}暴跌至`}${isMiracle ? stats[miracleStat as keyof Stats] : stats[disasterStat as keyof Stats]}，叙事中必须因这离谱的数值产生令人难以置信的结果）\n  注意：这是普通事件，effectsSummary幅度正常±1~±3。`
      : '普通事件：日常冒险节奏。effect幅度±1~±3。';

    const fatePromptHintShort = isSpecial ? '★命运转折点★：极为罕见！离奇夸张特别。effect幅度±8~±25，属性剧烈变化。'
      : (isMiracle || isDisaster) ? `普通事件（但${isMiracle ? `${miracleStat}高达` : `${disasterStat}暴跌至`}${isMiracle ? stats[miracleStat as keyof Stats] : stats[disasterStat as keyof Stats]}，叙事中必须因这离谱的数值产生令人难以置信的结果）\n  注意：这是普通事件，effectsSummary幅度正常±1~±3。`
      : '普通事件：日常冒险节奏。effect幅度±1~±3。';

    if (hasUserAction) {
      return `你是日式轻小说风格游戏引擎。玩家的自定义动作已发生，你必须根据这个动作生成世界的回应。

当前事件：${typeLabel}
${fatePromptHint}
${currentStatsDesc}
${statRules}
${specialRules}
${baseRules}

★ 自定义动作特殊规则：
  - 必须生成 narrative 描述该动作在世界中造成的直接结果。
  - narrative 是纯故事文本。
  - 同时提供 options 供玩家下一步选择。
  - 在 effectsSummary 中总结该动作直接导致的属性变化。

返回严格JSON（无多余字符）：
{
  "narrative": "纯文学叙事（80-150字），描述该动作的直接结果与当前场面",
  "mood": "calm",
  "milestone": "一句话总结",
  "effectsSummary": "intelligence:+1, stamina:-2",
  "options": [
    {"choice": "A", "text": "选项文本", "effectsSummary": "charm:+2"},
    {"choice": "B", "text": "选项文本", "effectsSummary": "stamina:-1"}
  ],
  "chapterEnd": false
}`;
    }

    return `你是日式轻小说风格游戏引擎。每个章节代表人生一个阶段，阶段内事件时间连续，跨阶段可跳过数月甚至数年。

当前事件：${typeLabel}
${fatePromptHintShort}
${currentStatsDesc}
${statRules}
${specialRules}
${baseRules}

★ 高级约束：
  - 选项之间要呈现有意义的因果分化，不同选项对应不同的性格/策略。
  - 叙事中体现属性值带来的直接因果。

返回严格JSON（无多余字符）：
{
  "narrative": "纯文学叙事（80-150字），不包含数字和属性名",
  "mood": "calm",
  "milestone": "一句话总结",
  "options": [
    {"choice": "A", "text": "选项文本", "effectsSummary": "intelligence:+1, luck:-1"},
    {"choice": "B", "text": "选项文本", "effectsSummary": "stamina:+2"}
  ],
  "chapterEnd": false
}`;
  };

  const ensureFallbackStart = () => {
    const fallbackChapters = ['序章：契约的烙印', '第一章：星海初醒', '第二章：命运的岔路'];
    setChapters(fallbackChapters);
    setCurrentChapterIndex(0);
    setCurrentEvent({
      narrative: '契约书在你指尖燃起微光，一道黑曜石色的魔法阵在羊皮纸上缓缓转动。你听见某个世界在呼唤你。',
      mood: 'mysterious',
      milestone: '指尖触碰契约的那一刻，命运的齿轮开始转动。',
      options: [
        { choice: 'A', text: '握紧契约，踏入光门', effectsSummary: 'luck:+1' },
        { choice: 'B', text: '先观察周围的符文', effectsSummary: 'intelligence:+1' },
        { choice: 'C', text: '对未知世界露出微笑', effectsSummary: 'charm:+1' },
      ],
    });
  };

  useEffect(() => {
    const initChapters = async () => {
      setLoading(true);
      try {
        const raw = await fetchDeepseek([
          { role: 'system', content: `你是轻小说作家。根据玩家信息生成3-5个"人生阶段"标题（如"初入异世界"、"冒险者成名录"、"王都风云"）。每个标题代表角色人生的一个阶段，阶段之间可以有数月到数年的时间跨度。标题必须呼应世界观和角色身份，按人生进程递进。返回JSON：{"chapters": ["标题1", "标题2"]}` },
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
      const highestStat = Math.max(statsForPrompt.智力, statsForPrompt.魅力, statsForPrompt.体力, statsForPrompt.运气);
      const lowestStat = Math.min(statsForPrompt.智力, statsForPrompt.魅力, statsForPrompt.体力, statsForPrompt.运气);
      const isMiracle = highestStat >= 80;
      const isDisaster = lowestStat <= -80;
      const miracleStat = isMiracle
        ? Object.entries(statsForPrompt).find(([, v]) => v === highestStat)?.[0] ?? null
        : null;
      const disasterStat = isDisaster
        ? Object.entries(statsForPrompt).find(([, v]) => v === lowestStat)?.[0] ?? null
        : null;
      const isSpecial = !isMiracle && !isDisaster && Math.random() < SPECIAL_CHANCE;
      if (isMiracle) {
        setEventType('miracle');
        if (miracleStat) miracleLockedRef.current.add(miracleStat as keyof Stats);
      }
      else if (isDisaster) {
        setEventType('disaster');
        if (disasterStat) disasterLockedRef.current.add(disasterStat as keyof Stats);
      }
      else if (isSpecial) setEventType('special');
      else setEventType('normal');
      statsForPromptRef.current = { ...statsForPrompt };

      const raw = await fetchDeepseek([
        { role: 'system', content: getSystemPrompt(!!userAction, isSpecial, isMiracle, isDisaster, miracleStat as keyof Stats | null, disasterStat as keyof Stats | null, statsForPrompt) },
        {
          role: 'user',
          content: userAction
            ? `角色名：${character.name}
身份背景：${character.background}
世界观：${character.worldview}
当前篇章主题：${chapterTitle}（第${currentChapterIndex + 1}个阶段，本阶段第${eventCount + 1}个事件）
当前属性：${JSON.stringify(statsForPrompt)}
近期事件历史：
${recentHistory || '（游戏开始）'}
\n★玩家刚才做了以下动作：${userAction}
\n请生成这个动作的直接结果。narrative字段必须描述该动作造成了什么后果。`
            : `角色名：${character.name}
身份背景：${character.background}
世界观：${character.worldview}
当前人生阶段：${chapterTitle}（第${currentChapterIndex + 1}个阶段，本阶段第${eventCount + 1}个事件）
当前属性：${JSON.stringify(statsForPrompt)}
${eventCount === 0 ? `（新阶段第一个事件，可跳过一段时间，描写角色在新阶段的生活状态）` : `（本阶段第${eventCount + 1}个事件，必须与上一个事件保持时间连续性，从前一个事件的结尾自然衔接）`}
近期事件历史：
${recentHistory || '（游戏开始）'}
\n请生成下一个${isSpecial ? '★命运转折★' : ''}事件。`,
        },
      ]);

      const parsed = safeParseJsonFromModel(raw);
      const nextEvent: EventData | null =
        parsed && typeof parsed.narrative === 'string' && Array.isArray(parsed.options)
          ? { ...parsed, isSpecial }
          : null;

      if (!nextEvent) {
        chapterEndRef.current = false;
        setCurrentEvent({
          narrative: userAction
            ? `你尝试了「${userAction}」，空气里传来微不可闻的回响。`
            : '魔法阵的符文短暂闪烁了一下……但你仍能继续前进。',
          mood: 'mysterious',
          milestone: userAction ? `尝试了「${userAction}」，命运未给出明确的回应。` : '符文闪烁，前路未明。',
          options: [
            { choice: 'A', text: '继续向前', effectsSummary: '' },
            { choice: 'B', text: '稳住心神', effectsSummary: 'stamina:+1' },
            { choice: 'C', text: '默念咒文', effectsSummary: 'intelligence:+1' },
          ],
        });
        setEventType('normal');
      } else {
        if (userAction && nextEvent.effectsSummary) {
          const rawEffects = parseEffectsSummary(nextEvent.effectsSummary);
          const resolved = validateEffectsWithNarrative(nextEvent.narrative, rawEffects);
          const newStats = { ...statsForPrompt };
          const changes: Partial<Stats> = {};
          Object.entries(resolved).forEach(([key, value]) => {
            const k = key as keyof Stats;
            const original = newStats[k] ?? 0;
            const prev = statsForPromptRef.current[k] ?? 0;
            let next = original + (value ?? 0);
            if (miracleLockedRef.current.has(k) && next < prev) next = prev;
            if (disasterLockedRef.current.has(k) && next > prev) next = prev;
            newStats[k] = next;
            changes[k] = (changes[k] ?? 0) + (next - original);
          });
          onUpdateStats(newStats);
          setLastStatChanges(changes);
          setLastNarrative(nextEvent.narrative);
          setLastMilestone(nextEvent.milestone || '');
          if (context?.history) {
            const effText = Object.entries(changes).filter(([, v]) => v !== 0).map(([k, v]) => `${STAT_LABELS[k as keyof Stats]}${(v ?? 0) >= 0 ? '+' : ''}${v}`).join(' ');
            setHistory([...context.history, `行动「${userAction}」→ 影响：${effText}`]);
          }
        } else if (userAction) {
          setLastNarrative(nextEvent.narrative);
          setLastMilestone(nextEvent.milestone || '');
          setLastStatChanges({});
        }
        if (!nextEvent.options || nextEvent.options.length < 2) {
          nextEvent.options = [
            { choice: 'A', text: '稳步前行', effectsSummary: '' },
            { choice: 'B', text: '驻足观望', effectsSummary: 'intelligence:+1' },
          ];
        }
        setCurrentEvent(nextEvent);
        if (nextEvent.mood) switchMusic(nextEvent.mood);
      }
      chapterEndRef.current = nextEvent?.chapterEnd === true;
      if ((isSpecial || isMiracle || isDisaster) && nextEvent) {
        fateEventsRef.current = [...fateEventsRef.current, nextEvent.milestone || nextEvent.narrative.slice(0, 50)];
      }
      if (userAction) setShowConsequence(true);
      setEventCount(prev => prev + 1);
    } catch (err) {
      console.error('Failed to generate event', err);
      setCurrentEvent({
        narrative: '命运的线条被风暴短暂遮蔽，你仍能凭直觉做出选择。',
        mood: 'mysterious',
        milestone: '命运的风暴中，直觉是唯一的指南。',
        options: [
          { choice: 'A', text: '继续前进', effectsSummary: '' },
          { choice: 'B', text: '谨慎前行', effectsSummary: 'luck:+1' },
          { choice: 'C', text: '强行突破', effectsSummary: 'stamina:+1' },
        ],
      });
      setEventType('normal');
      setShowConsequence(false);
    } finally { setLoading(false); }
  };

  const handleOptionSelect = (option: GameOption) => {
    const narrative = currentEvent?.narrative || '';
    const rawEffects = parseEffectsSummary(option.effectsSummary);
    const resolved = validateEffectsWithNarrative(narrative, rawEffects);
    const newStats = { ...statsRef.current };
    const changes: Partial<Stats> = {};
    Object.entries(resolved).forEach(([key, value]) => {
      const k = key as keyof Stats;
      const original = newStats[k] ?? 0;
      const prev = statsForPromptRef.current[k] ?? 0;
      let next = original + (value ?? 0);
      if (miracleLockedRef.current.has(k) && next < prev) next = prev;
      if (disasterLockedRef.current.has(k) && next > prev) next = prev;
      newStats[k] = next;
      changes[k] = (changes[k] ?? 0) + (next - original);
    });
    onUpdateStats(newStats);
    setLastStatChanges(changes);
    const nextHistory = [...historyRef.current, `事件：${narrative.slice(0, 60)}… → 选择：${option.text}`];
    setHistory(nextHistory);
    setLoading(true);
    fetchDeepseek([
      { role: 'system', content: `你是轻小说作家兼游戏引擎。根据事件和玩家选择，生成一段80-140字的日式轻小说后果叙事，并提供该叙事中体现的属性变化。

★ 叙事规则：绝对不能复述或重写已有事件内容，必须写选择之后新发生的事情。

★ effectsSummary 铁律：
  - narrative中必须自然地描述与属性变化相关的迹象（如"你感到体力不支""你的勇气在增长"）。
  - 叙事中明确提到的属性变化迹象，必须在 effectsSummary 中精确总结。
  - **符号必须与叙事一致**：叙事说"体力减弱/受伤/疲惫"→ effectsSummary 该属性必须是负数（如 stamina:-2）；叙事说"智力提升/觉醒/分析成功"→ 必须是正数（如 intelligence:+2）。
  - 叙事中**未提到**的属性，effectsSummary 中**绝不可出现**。
  - effectsSummary 格式：intelligence:+1, stamina:-2（英文属性名:符号数值，逗号分隔）。
  - 英文属性名只用：intelligence(智力) charm(魅力) stamina(体力) luck(运气)。
  - 数值幅度：±1~±3。
★ 返回JSON：{"narrative":"叙事文本","milestone":"一句话总结（15-30字）","effectsSummary":"charm:+1"}` },
      { role: 'user', content: `事件：${narrative.slice(0, 200)}
选择：${option.text}
当前属性：智力=${statsRef.current.智力} 魅力=${statsRef.current.魅力} 体力=${statsRef.current.体力} 运气=${statsRef.current.运气}
生成该选择的直接叙事后果及属性变化。` },
    ], 10000).then(raw => {
      const parsed = safeParseJsonFromModel(raw as string);
      const text = typeof parsed?.narrative === 'string' ? parsed.narrative : '';
      const ms = typeof parsed?.milestone === 'string' ? parsed.milestone : currentEvent?.milestone || '';
      if (text.length >= 10) {
        setLastNarrative(text);
        setLastMilestone(ms || currentEvent?.milestone || `选择了「${option.text}」`);
        if (typeof parsed?.effectsSummary === 'string') {
          const consEffects = validateEffectsWithNarrative(text, parseEffectsSummary(parsed.effectsSummary));
          if (Object.keys(consEffects).length > 0) {
            const finalStats = { ...statsRef.current };
            const extraChanges: Partial<Stats> = {};
            Object.entries(consEffects).forEach(([k, v]) => {
              const key = k as keyof Stats;
              const orig = finalStats[key] ?? 0;
              const prev2 = statsForPromptRef.current[key] ?? 0;
              let nxt = orig + (v ?? 0);
              if (miracleLockedRef.current.has(key) && nxt < prev2) nxt = prev2;
              if (disasterLockedRef.current.has(key) && nxt > prev2) nxt = prev2;
              finalStats[key] = nxt;
              extraChanges[key] = (extraChanges[key] ?? 0) + (nxt - orig);
            });
            if (Object.keys(extraChanges).length > 0) {
              onUpdateStats(finalStats);
              const merged = { ...changes };
              Object.entries(extraChanges).forEach(([k, v]) => { merged[k as keyof Stats] = (merged[k as keyof Stats] ?? 0) + v; });
              setLastStatChanges(merged);
            }
          }
        }
      } else {
        setLastNarrative(`选择了「${option.text}」。—— ${currentEvent?.milestone || '命运之轮悄然转动'}`);
        setLastMilestone(currentEvent?.milestone || `选择了「${option.text}」`);
      }
    }).catch(() => {
      setLastNarrative(`选择了「${option.text}」。—— ${currentEvent?.milestone || '命运之轮悄然转动'}`);
      setLastMilestone(currentEvent?.milestone || `选择了「${option.text}」`);
    }).finally(() => {
      setLoading(false);
      setShowConsequence(true);
    });
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
    const shouldAdvance = chapterEndRef.current || eventCount >= 6;
    if (eventCount >= 2 && shouldAdvance && currentChapterIndex < chapters.length - 1) {
      setCurrentChapterIndex(prev => prev + 1);
      setEventCount(0);
      chapterEndRef.current = false;
      generateEvent(chapters[currentChapterIndex + 1], { stats: statsOverride, history: historyOverride });
    } else if (eventCount >= 6 && currentChapterIndex >= chapters.length - 1) {
      onGameEnd((historyOverride ?? historyRef.current).join('\n'), statsOverride ?? statsRef.current, fateEventsRef.current);
    } else if (shouldAdvance && currentChapterIndex >= chapters.length - 1) {
      onGameEnd((historyOverride ?? historyRef.current).join('\n'), statsOverride ?? statsRef.current, fateEventsRef.current);
    } else {
      generateEvent(chapters[currentChapterIndex], { stats: statsOverride, history: historyOverride });
    }
  };

  const isMiracle = eventType === 'miracle';
  const isDisaster = eventType === 'disaster';
  const isSpecial = eventType === 'special';
  const hasCorners = !isSpecialUI;

  const hasStatChanges = Object.keys(lastStatChanges).length > 0;
  const statChangesList = Object.entries(lastStatChanges).filter(([, v]) => v !== 0)
    .map(([k, v]) => ({ label: STAT_LABELS[k as keyof Stats], value: v as number }));

  const eventFrameClass = (isMiracle ? 'miracle-frame' : isDisaster ? 'disaster-frame' : isSpecial ? 'special-event-frame' : 'classical-frame')
    + ' min-h-[180px] sm:min-h-[220px] md:min-h-[280px] flex items-center justify-center p-6 sm:p-8 md:p-12 text-center relative group';

  const barColors = isMiracle ? 'bg-yellow-300/15 border-yellow-400/40'
    : isDisaster ? 'bg-red-700/15 border-red-600/40'
    : isSpecial ? 'bg-amber-500/15 border-amber-400/40'
    : 'bg-cyan-500/10 border-cyan-500/30';
  const barText = isMiracle ? 'text-yellow-200'
    : isDisaster ? 'text-red-200'
    : isSpecial ? 'text-amber-200 text-glow-gold'
    : 'text-cyan-100 text-glow-sakura';
  const barIcon = isSpecialUI ? Star : Sparkles;
  const barIconColor = isMiracle ? 'text-yellow-300'
    : isDisaster ? 'text-red-400'
    : isSpecial ? 'text-amber-300'
    : 'text-cyan-300';
  const consequenceFrame = isMiracle ? 'miracle-frame' : isDisaster ? 'disaster-frame' : isSpecial ? 'special-event-frame' : 'classical-frame';
  const consequenceIcon = isSpecialUI ? Star : Sparkles;
  const narrativeText = isMiracle ? 'text-yellow-50' : isDisaster ? 'text-red-100' : isSpecial ? 'text-amber-50' : 'text-white';
  const consequenceLabel = isMiracle ? '★ 神迹降临 ★' : isDisaster ? '★ 深渊灾厄 ★' : isSpecial ? '★ 命运转折 ★' : '命运的回响';
  const consequenceLabelColor = isMiracle ? 'text-yellow-300/80' : isDisaster ? 'text-red-400/80' : isSpecial ? 'text-amber-300/80' : 'text-cyan-300/80';
  const consequenceIconColor = isMiracle ? 'text-yellow-400' : isDisaster ? 'text-red-500' : isSpecial ? 'text-amber-400' : 'text-cyan-400';
  const dismissButtonClass = isMiracle ? 'golden-button' : isDisaster ? 'bg-red-900/60 border border-red-700/40 text-red-200 hover:bg-red-800/60' : isSpecial ? 'golden-button' : 'aurora-button';
  const dismissButtonText = isMiracle ? '见证神迹' : isDisaster ? '承受灾厄' : isSpecial ? '握住命运的丝线' : '继续前行';
  const optionButtonClass = isMiracle ? 'golden-button' : isDisaster ? 'bg-red-900/40 border border-red-700/30 text-red-200 hover:bg-red-800/50' : isSpecial ? 'golden-button' : 'aurora-button';
  const optionIconClass = isMiracle
    ? 'bg-yellow-400/20 border-yellow-400/20 text-yellow-300 group-hover:bg-yellow-400 group-hover:text-yellow-950'
    : isDisaster
    ? 'bg-red-600/20 border-red-500/20 text-red-300 group-hover:bg-red-500 group-hover:text-red-100'
    : isSpecial
    ? 'bg-amber-500/20 border-amber-400/20 text-amber-300 group-hover:bg-amber-400 group-hover:text-amber-950'
    : 'bg-white/5 border-white/5 text-cyan-300 group-hover:bg-aurora-green group-hover:text-night';
  const optionTextHover = isMiracle ? 'group-hover:text-yellow-200' : isDisaster ? 'group-hover:text-red-200' : isSpecial ? 'group-hover:text-amber-200' : 'group-hover:text-glow-aurora';
  const scenarioLogColor = isMiracle ? 'text-yellow-300/50'
    : isDisaster ? 'text-red-400/50'
    : isSpecial ? 'text-amber-300/50'
    : 'text-cyan-300/80';
  const scenarioLogBar = isMiracle ? 'bg-yellow-400/40'
    : isDisaster ? 'bg-red-600/40'
    : isSpecial ? 'bg-amber-400/40'
    : 'bg-cyan-500/30';
  const eventTag = isMiracle ? 'bg-yellow-800/80 border-yellow-500/40 text-yellow-300/60'
    : isDisaster ? 'bg-red-950/80 border-red-700/40 text-red-300/60'
    : isSpecial ? 'bg-amber-900/80 border-amber-500/40 text-amber-300/60'
    : 'bg-night border-cyan-500/30 text-cyan-300/80';
  const floatingBadge = isMiracle
    ? 'bg-gradient-to-r from-yellow-400 to-amber-300 border-2 border-yellow-200/50 shadow-[0_0_30px_rgba(251,191,36,0.5)]'
    : isDisaster
    ? 'bg-gradient-to-r from-red-900 to-red-700 border-2 border-red-500/50 shadow-[0_0_30px_rgba(220,38,38,0.5)]'
    : '';
  const floatingBadgeText = isMiracle ? 'text-amber-950'
    : isDisaster ? 'text-red-200'
    : '';
  const floatingBadgeIconColor = isMiracle ? 'fill-amber-950' : isDisaster ? 'fill-red-200' : '';
  const floatingBadgeLabel = isMiracle ? '神迹降临'
    : isDisaster ? '深渊灾厄'
    : '命运转折';

  return (
    <div className="w-full max-w-6xl mx-auto min-h-[80vh] flex flex-col items-center justify-start pt-6 pb-12 px-3 sm:px-4 md:px-6 lg:px-12 relative">
      <div className="fixed top-3 left-3 z-40 flex items-center gap-2">
        <button onClick={toggleBGM}
          className={`px-3 py-2 rounded-xl border text-xs font-black tracking-wider shadow-lg backdrop-blur-sm flex items-center gap-1.5 transition-all ${
            musicOn ? 'bg-amber-500/20 border-amber-400/40 text-amber-300' : 'bg-[#16213e]/90 border-amber-900/30 text-[#f4e4bc]/60'
          }`}>
          {musicOn ? <Music2 className="w-3.5 h-3.5" /> : <Music className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => setShowStatsModal(true)}
          className="lg:hidden px-3 py-2 rounded-xl bg-[#16213e]/90 border border-amber-900/30 text-[#f4e4bc] text-xs font-black tracking-wider shadow-lg backdrop-blur-sm flex items-center gap-2">
          <Eye className="w-3.5 h-3.5" />能力值
        </button>
      </div>

      <div className="hidden lg:block fixed top-6 right-4 z-50 pointer-events-auto scale-[0.55] origin-top-right hover:scale-100 transition-all duration-300">
        <div className="relative classical-frame p-4 shadow-[0_18px_45px_rgba(0,0,0,0.55)]">
          <div className="ornament-bg" />
          <div className="relative z-10">
            <div className="mb-2 flex items-center justify-center">
              <div className="px-4 py-1 rounded-full border border-black/30 bg-black/[0.06] shadow-sm">
                <span className="text-[10px] font-black tracking-[0.35em] uppercase text-[#1a1a2e]">Soul Status</span>
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
                <X className="w-4 h-4 text-[#16213e]" />
              </button>
              <div className="flex items-center justify-center mb-3">
                <div className="px-4 py-1 rounded-full border border-black/30 bg-black/[0.06] shadow-sm">
                  <span className="text-xs font-black tracking-[0.3em] uppercase text-[#1a1a2e]">Soul Status</span>
                </div>
              </div>
              <MagicCircleStats stats={character.stats} className="mx-auto" size="sm" />
              <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                {Object.entries(character.stats).map(([key, val]) => (
                  <div key={key} className="bg-black/[0.05] rounded-xl p-2 border border-black/10">
                    <div className="text-[10px] text-[#1a1a2e]/60 font-black uppercase tracking-wider">{STAT_LABELS[key as keyof Stats]}</div>
                    <div className="text-xl font-black text-[#1a1a2e]">{val}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showConsequence && (
      <div className="w-full mb-6 sm:mb-8 md:mb-12">
        <div className="flex flex-col items-center gap-3 sm:gap-4 md:gap-6">
          <motion.div key={chapters[currentChapterIndex]} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="relative px-6 sm:px-8 md:px-12 py-3 sm:py-4 group">
            <div className={`absolute inset-0 border-y ${barColors} skew-x-[-20deg] transition-colors`} />
            <div className="relative flex items-center gap-2 sm:gap-4 md:gap-6">
              {React.createElement(barIcon, { className: `w-4 h-4 sm:w-5 sm:h-5 ${barIconColor} animate-pulse` })}
              <span className={`text-lg sm:text-xl md:text-3xl font-black tracking-[0.2em] sm:tracking-[0.3em] md:tracking-[0.4em] uppercase text-center leading-tight ${barText}`}>
                {chapters[currentChapterIndex] || '连接异世界中...'}
              </span>
              {React.createElement(barIcon, { className: `w-4 h-4 sm:w-5 sm:h-5 ${barIconColor} animate-pulse` })}
            </div>
          </motion.div>
          <div className="flex gap-2">
            {chapters.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === currentChapterIndex ? 'w-8 sm:w-10 md:w-12 bg-cyan-400 text-glow-sakura' : 'w-3 sm:w-4 bg-white/10'}`} />
            ))}
          </div>
        </div>
      </div>
      )}

      <div className="w-full max-w-4xl flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {showConsequence ? (
            <motion.div key="consequence" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
              className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20">
              <div className={consequenceFrame + ' p-8 sm:p-10 md:p-14 text-center relative'}>
                {hasCorners && <><div className="frame-corner frame-corner-tl" /><div className="frame-corner frame-corner-tr" /><div className="frame-corner frame-corner-bl" /><div className="frame-corner frame-corner-br" /></>}
                <div className="ornament-bg" />
                <div className="relative z-10 space-y-6 sm:space-y-8">
                  <div className="flex items-center justify-center gap-2 sm:gap-3">
                    {React.createElement(consequenceIcon, { className: `w-6 h-6 sm:w-7 sm:h-7 ${consequenceIconColor}` })}
                    <span className={`text-sm sm:text-base font-black uppercase tracking-[0.3em] ${consequenceLabelColor}`}>
                      {consequenceLabel}
                    </span>
                    {React.createElement(consequenceIcon, { className: `w-6 h-6 sm:w-7 sm:h-7 ${consequenceIconColor}` })}
                  </div>
                  <p className={`text-xl sm:text-2xl md:text-3xl leading-relaxed font-bold max-w-xl ${narrativeText}`}>
                    {lastNarrative}
                  </p>
                  {hasStatChanges && (
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                      {statChangesList.map(({ label, value }) => (
                        <span key={label}
                          className={`inline-flex items-center gap-1 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-base sm:text-lg font-black border stat-badge-up ${
                            value > 0 ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
                            : value < 0 ? 'bg-red-500/20 border-red-400/30 text-red-300'
                            : 'bg-white/10 border-white/20 text-white/50'
                          }`}>{label}<span>{value > 0 ? '+' : ''}{value}</span></span>
                      ))}
                    </div>
                  )}
                  {lastMilestone && (
                    <p className="text-xs sm:text-sm text-[#1a1a2e]/70 italic tracking-wider max-w-md mx-auto">
                      "{lastMilestone}"
                    </p>
                  )}
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleDismissConsequence}
                    className={`!px-10 !py-4 mx-auto text-base sm:text-lg ${dismissButtonClass}`}>
                    {dismissButtonText}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ) : loading ? (
            <motion.div key="loading" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }}
              className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20">
              <div className="classical-frame p-8 sm:p-12 md:p-16 flex flex-col items-center gap-6 sm:gap-8 md:gap-10">
                <div className="frame-corner frame-corner-tl" /><div className="frame-corner frame-corner-tr" />
                <div className="frame-corner frame-corner-bl" /><div className="frame-corner frame-corner-br" />
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32">
                  <div className="absolute inset-0 border-4 border-cyan-400/20 rounded-full" />
                  <div className="absolute inset-0 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <div className="absolute inset-6 bg-cyan-400/10 rounded-full animate-pulse" />
                </div>
                <div className="space-y-2 text-center">
                  <p className="text-lg sm:text-xl md:text-2xl font-black text-cyan-100 tracking-[0.3em] sm:tracking-[0.4em] md:tracking-[0.5em] animate-pulse text-glow-sakura">命运编织中</p>
                  <p className="text-[10px] sm:text-xs text-cyan-100/70 uppercase tracking-[0.2em]">Intertwining Fates...</p>
                </div>
              </div>
            </motion.div>
          ) : currentEvent ? (
            <motion.div key="event" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-8 md:space-y-10">
              <div className={eventFrameClass}>
                {hasCorners && <><div className="frame-corner frame-corner-tl" /><div className="frame-corner frame-corner-tr" /><div className="frame-corner frame-corner-bl" /><div className="frame-corner frame-corner-br" /></>}
                {(isMiracle || isDisaster) && (
                  <div className={`absolute -top-4 left-1/2 -translate-x-1/2 z-20 px-5 py-1.5 rounded-full ${floatingBadge}`}>
                    <span className={`text-xs font-black tracking-[0.3em] uppercase flex items-center gap-1.5 ${floatingBadgeText}`}>
                      <Star className={`w-3 h-3 ${floatingBadgeIconColor}`} />{floatingBadgeLabel}<Star className={`w-3 h-3 ${floatingBadgeIconColor}`} />
                    </span>
                  </div>
                )}
                {isSpecial && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 px-5 py-1.5 bg-gradient-to-r from-amber-600 to-yellow-500 rounded-full border-2 border-amber-300/50 shadow-[0_0_30px_rgba(251,191,36,0.4)]">
                    <span className="text-xs font-black text-amber-950 tracking-[0.3em] uppercase flex items-center gap-1.5">
                      <Star className="w-3 h-3 fill-amber-950" />命运转折<Star className="w-3 h-3 fill-amber-950" />
                    </span>
                  </div>
                )}
                <div className={`absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-3 ${isSpecialUI ? 'mt-4' : ''}`}>
                  <div className={`h-px w-6 sm:w-8 ${scenarioLogBar}`} />
                  <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-[0.4em] sm:tracking-[0.6em] ${scenarioLogColor}`}>Scenario Log</span>
                  <div className={`h-px w-6 sm:w-8 ${scenarioLogBar}`} />
                </div>
                <p className={`text-lg sm:text-xl md:text-2xl lg:text-3xl leading-relaxed font-bold px-2 sm:px-4 ${narrativeText}`}>
                  {currentEvent.narrative}
                </p>
                <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 sm:px-6 py-1 border rounded-full text-[9px] sm:text-[10px] uppercase tracking-widest font-black ${eventTag}`}>
                  Event {eventCount + 1}
                </div>
              </div>

              {currentEvent.milestone && (
                <p className="text-center text-xs sm:text-sm text-[#1a1a2e]/60 italic tracking-wider px-4">
                  — {currentEvent.milestone}
                </p>
              )}

              <div className="space-y-5 sm:space-y-6 md:space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {currentEvent.options.map((opt, idx) => {
                    const choiceLabel = opt.choice || String.fromCharCode(65 + idx);
                    return (
                      <motion.button key={idx} whileHover={{ scale: 1.02, x: 3 }} whileTap={{ scale: 0.98 }} onClick={() => handleOptionSelect(opt)}
                        className={`!justify-start group text-left p-4 sm:p-5 md:p-6 min-h-[70px] sm:min-h-[80px] ${optionButtonClass}`}>
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xs sm:text-sm font-black transition-all duration-300 border shrink-0 ${optionIconClass}`}>
                          {choiceLabel}
                        </div>
                        <span className={`flex-1 text-sm sm:text-base md:text-lg transition-all ml-2 sm:ml-3 ${optionTextHover}`}>{opt.text}</span>
                      </motion.button>
                    );
                  })}
                </div>
                <div className="relative group max-w-2xl mx-auto">
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-aurora-green/20 to-cyan-500/20 rounded-[2rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />
                  <div className="relative glass-panel !rounded-[2rem] p-1.5 sm:p-2 flex items-center gap-2 sm:gap-3 border-white/10 focus-within:border-cyan-500/30 transition-all">
                    <input type="text" value={customInput} onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="编织你独特的意志..." onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
                      className="flex-1 bg-transparent border-none focus:ring-0 px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-sm sm:text-lg font-medium placeholder:text-cyan-200/50 text-white" />
                    <button onClick={handleCustomSubmit}
                      className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-cyan-500/10 hover:bg-cyan-500/30 rounded-2xl transition-all flex items-center justify-center group/btn shrink-0">
                      <Send className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-cyan-300 group-hover/btn:scale-110 group-hover/btn:rotate-12 transition-all" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
