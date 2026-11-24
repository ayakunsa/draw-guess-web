// The ONLY network exit of the app. Pure front-end: native fetch to an
// OpenAI-compatible /chat/completions endpoint. No proxy, no SDK, no backend.
// With no credentials, every function returns a clear "未配置模型" error
// BEFORE any fetch happens.
import type { Settings } from '../game/settings';

export type AiErrorKind = 'unavailable' | 'timeout' | 'http' | 'network' | 'parse';
export class AiError extends Error {
  constructor(public kind: AiErrorKind, message: string) { super(message); this.name = 'AiError'; }
}

const TIMEOUT_MS = 20000;
const normalizeBase = (baseUrl: string): string => {
  const b = baseUrl.trim().replace(/\/+$/, '');
  if (!b) throw new AiError('unavailable', '未配置模型：请先在设置中填写接口地址（Base URL）');
  return b + (/\/chat\/completions$/.test(b) ? '' : '/chat/completions');
};

export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }

// Guard first: no enabled flag or no key => no request at all.
export function assertConfigured(settings: Settings, requireEnabled = true): void {
  const ai = settings.ai;
  if (!ai || !ai.apiKey.trim()) throw new AiError('unavailable', '未配置模型：请到设置中填写 API Key 与模型后重试');
  if (!ai.model.trim()) throw new AiError('unavailable', '未配置模型：请到设置中填写模型名称后重试');
  if (requireEnabled && !ai.enabled) throw new AiError('unavailable', '未配置模型：请到设置中勾选“启用 AI 辅助”后重试');
}

// Single fetch call site. Caller must have checked configuration first.
export async function callChat(settings: Settings, messages: ChatMessage[], externalSignal?: AbortSignal): Promise<string> {
  assertConfigured(settings);
  const url = normalizeBase(settings.ai.baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', onAbort);
  try {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + settings.ai.apiKey.trim(),
          'HTTP-Referer': typeof location !== 'undefined' ? location.origin : '',
          'X-Title': 'Meadowmint Draw',
        },
        body: JSON.stringify({ model: settings.ai.model.trim(), messages, temperature: 0.4, max_tokens: 1200 }),
      });
    } catch (err) {
      if (controller.signal.aborted) throw new AiError('timeout', '请求超时或被取消，请重试');
      throw new AiError('network', '网络请求失败：可能是离线或浏览器跨域（CORS）限制，请检查网络或自行配置代理（会失去纯前端特性）');
    }
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new AiError('http', '认证失败：API Key 无效或无权访问该模型（' + response.status + '）');
      if (response.status === 402) throw new AiError('http', '额度不足：账户余额或免费额度不足（402）');
      if (response.status === 429) throw new AiError('http', '请求过于频繁或额度受限（429），稍后重试');
      throw new AiError('http', '接口返回错误 ' + response.status + ' ' + response.statusText);
    }
    let data: { choices?: { message?: { content?: string } }[] };
    try { data = await response.json(); }
    catch { throw new AiError('parse', '接口返回的不是合法 JSON'); }
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new AiError('parse', '模型未返回有效内容');
    return content;
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onAbort);
  }
}

// Connectivity check: needs a key and model, but does NOT require the
// enabled flag (so the user can verify a key before turning AI on).
export async function testConnection(settings: Settings, externalSignal?: AbortSignal): Promise<{ ok: boolean; message: string; latencyMs: number }> {
  const started = Date.now();
  try {
    assertConfigured(settings, false);
    const text = await callChat({ ...settings, ai: { ...settings.ai, enabled: true } }, [{ role: 'user', content: 'Reply with exactly: OK' }], externalSignal);
    return { ok: true, message: '连接成功：' + (text.trim().slice(0, 40) || '模型已响应'), latencyMs: Date.now() - started };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : '连接失败', latencyMs: Date.now() - started };
  }
}
