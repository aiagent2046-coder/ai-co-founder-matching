const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const REPLICATE_OWNER = 'beautyyuyanli';
const REPLICATE_NAME  = 'multilingual-e5-large';

const TIMEOUT_MS = 25_000;
const RETRY_DELAY_MS = 1_000;

export class AIServiceError extends Error {
  status: number;
  retryable: boolean;
  constructor(message: string, status: number, retryable = false) {
    super(message);
    this.name = 'AIServiceError';
    this.status = status;
    this.retryable = retryable;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit & { timeout?: number }): Promise<Response> {
  const timeout = init.timeout ?? TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 4): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isLast = attempt === maxAttempts;
      const isAbort = err?.name === 'AbortError' || err?.message?.includes('aborted');
      const status = (err instanceof AIServiceError) ? err.status : 0;
      const isRateLimit = status === 429;
      const isUpstream5xx = status >= 500 && status < 600;
      const retryable = isAbort || isRateLimit || isUpstream5xx;

      if (isLast || !retryable) {
        if (err instanceof AIServiceError) throw err;
        if (isAbort) throw new AIServiceError('AI service timeout, please try again', 504, true);
        throw new AIServiceError(`AI service error: ${err?.message ?? String(err)}`, 502, true);
      }

      // Длинный exp-backoff для 429, короткий для остальных
      const base = isRateLimit ? 4_000 : 1_000;
      const wait = Math.min(30_000, base * Math.pow(2, attempt - 1));
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw new AIServiceError('AI service unavailable', 502, true);
}

// Раскладывает шкалу 0..100 в один из трёх русских полюсов.
// score === undefined/null → '' (поле пропускаем, не выдумываем данные).
function pole(score: unknown, low: string, mid: string, high: string): string {
  if (typeof score !== 'number' || Number.isNaN(score)) return '';
  if (score < 40) return low;
  if (score > 60) return high;
  return mid;
}

const CONFLICT_RU: Record<string, string> = {
  competing: 'соперничество',
  collaborating: 'сотрудничество',
  compromising: 'компромисс',
  avoiding: 'избегание',
};

// Собирает человекочитаемый русский блок психопрофиля из числовых полей.
// Берёт только структурные сигналы (числа/enum); свободные тексты опускаем.
export function psychoMarkers(profile: any): string[] {
  const m: string[] = [];

  const ws = profile.work_style;
  if (ws) {
    const parts = [
      pole(ws.pace, 'размеренный темп', 'умеренный темп', 'быстрый темп'),
      pole(ws.structure, 'гибкость и импровизация', 'баланс структуры', 'любит структуру и планы'),
      pole(ws.communication, 'сдержанная коммуникация', 'умеренная коммуникация', 'открытая частая коммуникация'),
      pole(ws.risk, 'осторожность к риску', 'умеренный риск', 'высокая толерантность к риску'),
    ].filter(Boolean);
    if (parts.length) m.push(`стиль работы: ${parts.join(', ')}`);
  }

  const hx = profile.hexaco?.domains;
  if (hx) {
    const parts = [
      pole(hx.H, '', '', 'честность и скромность'),
      pole(hx.E, 'эмоциональная устойчивость', '', 'чувствительность и эмпатия'),
      pole(hx.X, 'интроверсия', '', 'экстраверсия и энергичность'),
      pole(hx.A, 'прямолинейность', '', 'покладистость и терпимость'),
      pole(hx.C, 'спонтанность', '', 'добросовестность и дисциплина'),
      pole(hx.O, 'практичность', '', 'открытость новому и креативность'),
    ].filter(Boolean);
    if (parts.length) m.push(`черты личности: ${parts.join(', ')}`);
  }

  const beh = profile.behavioral_profile;
  if (beh) {
    const hh = pole(beh.honesty_humility, '', '', 'высокая честность-скромность');
    if (hh) m.push(hh);
    const style = CONFLICT_RU[beh.conflict?.primary_style];
    if (style) m.push(`в конфликте: ${style}`);
  }

  if (profile.time_zone) m.push(`часовой пояс: ${profile.time_zone}`);

  return m;
}

export async function generateEssence(profile: any): Promise<string> {
  const markers = psychoMarkers(profile);
  const psychoBlock = markers.length
    ? `\n- Психопрофиль: ${markers.join('; ')}`
    : '';

  const userMsg = `Данные профиля:
- Имя: ${profile.name || 'неизвестно'}
- Роль: ${profile.role || 'неизвестно'} в сфере ${profile.domain || 'неизвестно'}
- Стадия: ${profile.stage || 'неизвестно'}
- О себе: ${profile.bio || '(пусто)'}
- Навыки: ${(profile.skills || []).join(', ') || '(нет)'}
- Может научить: ${(profile.can_teach || []).join(', ') || '(нет)'}
- Хочет изучить: ${(profile.want_to_learn || []).join(', ') || '(нет)'}
- Ищет: ${(profile.looking_for || []).join(', ') || '(нет)'}${psychoBlock}

Напиши ОДИН абзац на русском языке (3-5 предложений, максимум 100 слов), описывающий чем человек занимается, его сильные стороны, рабочий стиль и идеального со-основателя. Насыщай текст ключевыми словами для семантического поиска. Выведи ТОЛЬКО абзац.`;

  return withRetry(async () => {
    console.log('[essence] calling Claude...');
    const res = await fetchWithTimeout(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: userMsg }],
      }),
    });

    if (!res.ok) {
      const body = (await res.text()).slice(0, 200);
      throw new AIServiceError(`Claude essence failed (${res.status}): ${body}`, res.status, res.status === 429 || res.status >= 500);
    }
    const data = await res.json();
    const essence = (data.content?.[0]?.text || '').trim();
    console.log('[essence] OK, length:', essence.length);
    return essence;
  });
}

async function getLatestVersion(): Promise<string> {
  const res = await fetch(
    `https://api.replicate.com/v1/models/${REPLICATE_OWNER}/${REPLICATE_NAME}`,
    { headers: { Authorization: `Bearer ${process.env.REPLICATE_API_KEY}` } }
  );
  if (!res.ok) {
    throw new AIServiceError(`Cannot fetch model (${res.status}): ${(await res.text()).slice(0, 200)}`, res.status, res.status === 429 || res.status >= 500);
  }
  const data = await res.json();
  const versionId = data?.latest_version?.id;
  if (!versionId) {
    throw new Error(`No latest_version in model response`);
  }
  console.log('[embedding] latest version:', versionId);
  return versionId;
}

export async function computeEmbedding(text: string): Promise<number[]> {
  const prefixed = `passage: ${text}`;

  return withRetry(async () => {
    console.log('[embedding] text length:', text.length);
    const version = await getLatestVersion();

    // Step 1: create prediction
    const createRes = await fetchWithTimeout('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version,
        input: {
          texts: JSON.stringify([prefixed]),
          normalize_embeddings: true,
          batch_size: 1,
        },
      }),
    });

    const createBody = await createRes.text();
    console.log('[embedding] create:', createRes.status, createBody.slice(0, 300));

    if (!createRes.ok) {
      throw new AIServiceError(`Replicate create (${createRes.status}): ${createBody.slice(0, 200)}`, createRes.status, createRes.status === 429 || createRes.status >= 500);
    }

    let result = JSON.parse(createBody);
    let attempts = 0;
    while ((result.status === 'starting' || result.status === 'processing') && attempts < 40) {
      await new Promise(r => setTimeout(r, 1000));
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const pollRes = await fetch(
          `https://api.replicate.com/v1/predictions/${result.id}`,
          { headers: { Authorization: `Bearer ${process.env.REPLICATE_API_KEY}` }, signal: controller.signal }
        );
        result = await pollRes.json();
      } finally {
        clearTimeout(timer);
      }
      attempts++;
      if (attempts % 5 === 0) console.log(`[embedding] poll ${attempts}: ${result.status}`);
    }

    if (result.status !== 'succeeded') {
      throw new Error(`Prediction ${result.status}: ${result.error || ''}`);
    }

    const out = result.output;
    let vector: number[] | null = null;

    if (Array.isArray(out) && Array.isArray(out[0]) && typeof out[0][0] === 'number') {
      vector = out[0];
    }

    if (!vector || vector.length !== 1024) {
      console.error('[embedding] bad output:', JSON.stringify(out).slice(0, 500));
      throw new Error(`Bad embedding: got ${vector?.length || 'null'}, expected 1024`);
    }

    console.log('[embedding] OK, dim:', vector.length);
    return vector;
  });
}
