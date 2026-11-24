// Local-only preferences (localStorage). AI fields are optional add-ons:
// with no credentials the game stays pure front-end, offline and playable.
export interface Settings {
  guessSeconds: number; drawSeconds: number; rounds: number; wrongLimit: number;
  category: string; level: string; speed: string;
  ai: {
    id: string; name: string; model: string; provider: string; baseUrl: string;
    apiKey: string; enabled: boolean; assistGuess: boolean; assistDraw: boolean;
  };
}
const KEY = 'draw-guess-web:settings:v1';
export const DEFAULT_SETTINGS: Settings = {
  guessSeconds: 60, drawSeconds: 60, rounds: 5, wrongLimit: 3, category: '成语', level: 'easy', speed: 'normal',
  ai: {
    id: 'custom', name: '自定义', model: '', provider: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1', apiKey: '', enabled: false,
    assistGuess: false, assistDraw: false,
  },
};
// Provider presets only pre-fill baseUrl; the model is always a free text field.
export const AI_PROVIDERS = [
  { id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
  { id: 'moonshot', name: 'Moonshot', baseUrl: 'https://api.moonshot.cn/v1' },
  { id: 'custom', name: '自定义', baseUrl: '' },
] as const;
// Known model presets from upstream config.json (names only; no keys).
export const MODEL_PRESETS = [
  'tencent/hy4', 'xiaomi/mimo-v2.6-pro', 'minimax/minimax-m3.1-flash', 'deepseek/deepseek-v4.1-flash-1017',
  'google/gemini-4-argon', 'anthropic/claude-sonnet-5.5', 'openai/gpt-6.1-sol', 'x-ai/grok-4.7',
  'z-ai/glm-5.3-flashx', 'moonshotai/kimi-k3.1-pro', 'qwen/qwen3.8-flash', 'bytedance-seed/seed-2.0-lite',
];
const clampInt = (value: unknown, min: number, max: number, fallback: number) => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};
export function sanitize(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Settings>;
  const ai = (r.ai && typeof r.ai === 'object' ? r.ai : {}) as Partial<Settings['ai']>;
  return {
    guessSeconds: clampInt(r.guessSeconds, 15, 300, DEFAULT_SETTINGS.guessSeconds),
    drawSeconds: clampInt(r.drawSeconds, 15, 300, DEFAULT_SETTINGS.drawSeconds),
    rounds: clampInt(r.rounds, 1, 8, DEFAULT_SETTINGS.rounds),
    wrongLimit: clampInt(r.wrongLimit, 1, 10, DEFAULT_SETTINGS.wrongLimit),
    category: typeof r.category === 'string' ? r.category : DEFAULT_SETTINGS.category,
    level: typeof r.level === 'string' ? r.level : DEFAULT_SETTINGS.level,
    speed: ['slow', 'normal', 'fast'].includes(r.speed || '') ? r.speed! : DEFAULT_SETTINGS.speed,
    ai: {
      id: typeof ai.id === 'string' ? ai.id : DEFAULT_SETTINGS.ai.id,
      name: typeof ai.name === 'string' ? ai.name : DEFAULT_SETTINGS.ai.name,
      model: typeof ai.model === 'string' ? ai.model.slice(0, 120) : '',
      provider: typeof ai.provider === 'string' ? ai.provider : DEFAULT_SETTINGS.ai.provider,
      baseUrl: typeof ai.baseUrl === 'string' ? ai.baseUrl.slice(0, 300) : DEFAULT_SETTINGS.ai.baseUrl,
      apiKey: typeof ai.apiKey === 'string' ? ai.apiKey.slice(0, 500) : '',
      enabled: ai.enabled === true,
      assistGuess: ai.assistGuess === true,
      assistDraw: ai.assistDraw === true,
    },
  };
}
export function loadSettings(): Settings {
  try { return sanitize(JSON.parse(localStorage.getItem(KEY) || 'null')); }
  catch { return { ...DEFAULT_SETTINGS, ai: { ...DEFAULT_SETTINGS.ai } }; }
}
export function saveSettings(value: Settings): Settings {
  const clean = sanitize(value);
  try { localStorage.setItem(KEY, JSON.stringify(clean)); } catch { /* storage disabled: keep in memory */ }
  return clean;
}
