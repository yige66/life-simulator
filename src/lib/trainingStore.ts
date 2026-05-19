'use client';

const STORE_KEY = 'ls_training_examples';
const MAX_EXAMPLES = 30;

interface Stats {
  智力: number;
  魅力: number;
  体力: number;
  运气: number;
}

export interface TrainingExample {
  id: string;
  timestamp: number;
  context: {
    eventText: string;
    optionText: string;
    userAction?: string;
    stats: Stats;
  };
  response: {
    narrative: string;
    effectsSummary: string;
  };
  quality: number;
}

function loadAll(): TrainingExample[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveAll(examples: TrainingExample[]): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = examples.slice(-MAX_EXAMPLES);
    localStorage.setItem(STORE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage full — silently ignore
  }
}

export function addTrainingExample(
  eventText: string,
  optionText: string,
  stats: Stats,
  narrative: string,
  effectsSummary: string,
  userAction?: string,
): TrainingExample {
  const examples = loadAll();
  const entry: TrainingExample = {
    id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    context: {
      eventText: eventText.slice(0, 300),
      optionText,
      userAction,
      stats: { ...stats },
    },
    response: {
      narrative: narrative.slice(0, 300),
      effectsSummary,
    },
    quality: 0,
  };
  examples.push(entry);
  saveAll(examples);
  return entry;
}

export function rateExample(id: string, quality: number): void {
  const examples = loadAll();
  const target = examples.find(e => e.id === id);
  if (target) {
    target.quality = quality;
    saveAll(examples);
  }
}

export function getLatestExampleId(): string | null {
  const examples = loadAll();
  if (examples.length === 0) return null;
  return examples[examples.length - 1].id;
}

export function getSimilarExamples(
  stats: Stats,
  eventText: string,
  maxCount: number = 2,
): TrainingExample[] {
  const examples = loadAll();
  if (examples.length === 0) return [];

  // prefer higher quality entries
  const rated = examples.filter(e => e.quality >= 2);

  if (rated.length === 0) {
    // fallback: use recent entries
    const recent = examples.slice(-maxCount);
    return recent.reverse();
  }

  // score by stat profile similarity
  const targetStats = [stats.智力, stats.魅力, stats.体力, stats.运气];

  const scored = rated.map(e => {
    const ctx = e.context.stats;
    const ctxStats = [ctx.智力, ctx.魅力, ctx.体力, ctx.运气];
    let statDist = 0;
    for (let i = 0; i < 4; i++) {
      statDist += (targetStats[i] - ctxStats[i]) ** 2;
    }
    const statScore = 1 / (1 + Math.sqrt(statDist));

    // keyword overlap
    const keywords = eventText.replace(/[，。！？、\s]/g, '').slice(0, 60);
    const ctxKeywords = e.context.eventText.replace(/[，。！？、\s]/g, '').slice(0, 60);
    let overlap = 0;
    for (let i = 0; i < keywords.length; i++) {
      if (ctxKeywords.includes(keywords[i])) overlap++;
    }
    const keywordScore = overlap / Math.max(keywords.length, 1);

    return {
      example: e,
      score: statScore * 0.65 + keywordScore * 0.35,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxCount).map(s => s.example);
}

export function formatFewShotPrompt(examples: TrainingExample[]): string {
  if (examples.length === 0) return '';

  const blocks = examples.map((e, i) => {
    const lines = [
      `★参考范例${i + 1}★`,
      `场景：${e.context.eventText.slice(0, 100)}`,
      `选择：${e.context.optionText}`,
      `属性：智力=${e.context.stats.智力} 魅力=${e.context.stats.魅力} 体力=${e.context.stats.体力} 运气=${e.context.stats.运气}`,
      `→生成叙事：${e.response.narrative.slice(0, 120)}`,
      `→effectsSummary：${e.response.effectsSummary}`,
    ];
    return lines.join('\n');
  });

  return `\n★ 以下是历史优质回答范例（请参考其叙事风格和效果判定逻辑，但不要直接复制内容）：\n${blocks.join('\n\n')}\n\n`;
}

export function clearTrainingStore(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    // ignore
  }
}
