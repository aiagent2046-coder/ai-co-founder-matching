import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 10 запросов в минуту на КЛЮЧ. Ключ = "роут:userId" → у каждого роута своё ведро.
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: true,
});

// Fail-open: если Redis недоступен — НЕ блокируем (true), чтобы хиккап
// инфраструктуры не ронял рабочие роуты в ошибку.
export async function checkLimit(key: string): Promise<boolean> {
  try {
    const { success } = await ratelimit.limit(key);
    return success;
  } catch (err) {
    console.error("[rate-limit] Redis error — fail-open:", err);
    return true;
  }
}

export default ratelimit;
