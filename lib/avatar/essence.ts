const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const REPLICATE_MODEL = 'beautyyuyanli/multilingual-e5-large';

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

  console.log('[essence] calling Claude...');
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

  if (!res.ok) {
    throw new Error(`Claude essence failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  const essence = (data.content?.[0]?.text || '').trim();
  console.log('[essence] OK, length:', essence.length);
  return essence;
}

// multilingual-e5-large: input `texts` = JSON-string of array
export async function computeEmbedding(text: string): Promise<number[]> {
  console.log('[embedding] calling Replicate e5-multilingual, text length:', text.length);

  // E5 best practice: prefix with "passage: " for indexed documents
  const prefixed = `passage: ${text}`;

  const createRes = await fetch(
    `https://api.replicate.com/v1/models/${REPLICATE_MODEL}/predictions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          texts: JSON.stringify([prefixed]),
          normalize_embeddings: true,
          batch_size: 1,
        },
      }),
    }
  );

  const createBody = await createRes.text();
  console.log('[embedding] create:', createRes.status, createBody.slice(0, 300));

  if (!createRes.ok) {
    throw new Error(`Replicate create (${createRes.status}): ${createBody.slice(0, 200)}`);
  }

  const prediction = JSON.parse(createBody);

  // Poll for completion
  let result = prediction;
  let attempts = 0;
  while ((result.status === 'starting' || result.status === 'processing') && attempts < 30) {
    await new Promise(r => setTimeout(r, 1000));
    const pollRes = await fetch(
      `https://api.replicate.com/v1/predictions/${result.id}`,
      { headers: { Authorization: `Bearer ${process.env.REPLICATE_API_KEY}` } }
    );
    result = await pollRes.json();
    attempts++;
    console.log(`[embedding] poll ${attempts}: ${result.status}`);
  }

  if (result.status !== 'succeeded') {
    throw new Error(`Prediction ${result.status}: ${result.error || ''}`);
  }

  // output: number[][] — array of arrays (one per input text)
  const out = result.output;
  let vector: number[] | null = null;

  if (Array.isArray(out) && Array.isArray(out[0]) && typeof out[0][0] === 'number') {
    vector = out[0];
  }

  if (!vector || vector.length !== 1024) {
    console.error('[embedding] unexpected output:', JSON.stringify(out).slice(0, 500));
    throw new Error(`Bad embedding: got ${vector?.length || 'null'}, expected 1024`);
  }

  console.log('[embedding] OK, dim:', vector.length);
  return vector;
}
