// Генерируем "essence" профиля и считаем embedding

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

// 1. Claude → English essence (1 параграф)
export async function generateEssence(profile: {
  name?: string; role?: string; domain?: string; bio?: string;
  skills?: string[]; can_teach?: string[]; want_to_learn?: string[];
  looking_for?: string[]; stage?: string;
}): Promise<string> {
  const userMsg = `Profile data:
- Name: ${profile.name || 'unknown'}
- Role: ${profile.role || 'unknown'} in ${profile.domain || 'unknown'}
- Stage: ${profile.stage || 'unknown'}
- Bio: ${profile.bio || '(empty)'}
- Skills: ${(profile.skills || []).join(', ') || '(none)'}
- Can teach: ${(profile.can_teach || []).join(', ') || '(none)'}
- Wants to learn: ${(profile.want_to_learn || []).join(', ') || '(none)'}
- Looking for: ${(profile.looking_for || []).join(', ') || '(none)'}

Write ONE paragraph in English (3-5 sentences, max 100 words) that captures:
1. What they do and at what stage
2. Their core strengths/skills
3. What kind of co-founder partner would complement them best

Be specific and dense with keywords. This text will be embedded for similarity search.
Output ONLY the paragraph, no preamble.`;

  const res = await fetch(ANTHROPIC_URL, {
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

  if (!res.ok) throw new Error(`Claude essence failed: ${await res.text()}`);
  const data = await res.json();
  return (data.content?.[0]?.text || '').trim();
}

// 2. Replicate BGE-large → embedding vector[1024]
export async function computeEmbedding(text: string): Promise<number[]> {
  // BGE-large-en-v1.5 на Replicate
  const create = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.REPLICATE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: 'b3e6e8b4e1b8c98d0d7f5c3b7e3a3f8e3e6a2d3e4f5b6c7d8e9f0a1b2c3d4e5f',
      input: { text },
    }),
  });

  // Используем published-model endpoint (стабильнее чем version hash)
  const created = await fetch('https://api.replicate.com/v1/models/nateraw/bge-large-en-v1.5/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.REPLICATE_API_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait',
    },
    body: JSON.stringify({ input: { text } }),
  });

  if (!created.ok) throw new Error(`Replicate failed: ${await created.text()}`);
  const result = await created.json();

  // BGE возвращает массив чисел в output
  const vector = Array.isArray(result.output)
    ? (Array.isArray(result.output[0]) ? result.output[0] : result.output)
    : null;

  if (!vector || vector.length !== 1024) {
    throw new Error(`Bad embedding shape: ${vector?.length}`);
  }
  return vector;
}
