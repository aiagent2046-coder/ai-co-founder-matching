import { z } from 'zod';

// POST /api/swipe — тело: { to_user, action }
export const swipeSchema = z.object({
  to_user: z.string().uuid('Некорректный UUID пользователя'),
  action: z.enum(['like', 'pass']),
});

// POST /api/messages — тело: { matchId, content }
export const messagesSchema = z.object({
  matchId: z.string().uuid('Некорректный UUID матча'),
  content: z.string().min(1, 'Сообщение не может быть пустым').max(2000, 'Слишком длинное сообщение'),
});

// POST /api/onboarding/profile — тело (camelCase) → founder_profiles.
// Обязательны имя и роль; остальное необязательно/lenient, чтобы не рубить валидное.
export const onboardingProfileSchema = z.object({
  name: z.string().min(1, 'Имя обязательно').max(120),
  role: z.string().min(1, 'Роль обязательна').max(120),
  bio: z.string().max(1000).optional(),
  skills: z.union([z.string(), z.array(z.string())]).optional(),
  lookingFor: z.string().max(500).optional(),
  stage: z.string().max(100).optional(),
  domain: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  linkedinUrl: z.string().url('Некорректный URL').optional().nullable(),
  githubUrl: z.string().url('Некорректный URL').optional().nullable(),
  birthMonth: z.number().int().min(1).max(12).optional().nullable(),
  birthDay: z.number().int().min(1).max(31).optional().nullable(),
  birthYear: z.number().int().min(1920).max(2012).optional().nullable(),
});

// POST /api/onboarding/bigfive — тело: { scores: { …OCEAN… } }
// Шкалу значений не фиксируем жёстко (тест может отдавать 0–1 или 0–100),
// чтобы не отклонять валидные результаты.
export const bigfiveSchema = z.object({
  scores: z.object({
    openness: z.number(),
    conscientiousness: z.number(),
    extraversion: z.number(),
    agreeableness: z.number(),
    neuroticism: z.number(),
  }),
});

// Универсальный разбор тела: валидирует и бросает читаемую ошибку.
// В роуте оборачивай в try/catch и отдавай 400.
export async function parseBody<T>(schema: z.ZodSchema<T>, req: Request): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new Error('Некорректный JSON в теле запроса');
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    const msg = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Ошибка валидации: ${msg}`);
  }
  return result.data;
}

export type SwipeInput = z.infer<typeof swipeSchema>;
export type MessagesInput = z.infer<typeof messagesSchema>;
export type OnboardingProfileInput = z.infer<typeof onboardingProfileSchema>;
export type BigFiveInput = z.infer<typeof bigfiveSchema>;