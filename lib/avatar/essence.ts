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

export async function generateEssence(profile: any): Promise<string> {
  const userMsg = `Profile data:
- Name: ${profile.name || 'unknown'}
- Role: ${profile.role || 'unknown'} in ${profile.domain || 'unknown'}
- Stage: ${profile.stage || 'unknown'}
- Bio: ${profile.bio || '(empty)'}
- Skills: ${(profile.skills || []).join(', ') || '(none)'}
- Can teach: ${(profile.can_teach || []).join(', ') || '(none)'}
- Wants to learn: ${(profile.want_to_learn || []).join(', ') || '(none)'}
- Looking for: ${(profile.looking_for || []).join(', ') || '(none)'}

Write ONE paragraph in English (3-5 sentences, max 100 words) capturing what they do, core strengths, and ideal co-founder. Be dense with keywords for semantic search. Output ONLY the paragraph.`;

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
