import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Fail-open: если Redis недоступен — НЕ блокируем (true), чтобы хиккап
// инфраструктуры не ронял рабочие роуты в ошибку.
export async function checkLimit(
  key: string, 
  maxRequests: number = 10, 
  window: `${number} s` | `${number} m` = "60 s" // Строгая типизация для TypeScript
): Promise<boolean> {
  try {
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, window),
      analytics: true,
    });
    
    const { success } = await ratelimit.limit(key);
    return success;
  } catch (err) {
    console.error("[rate-limit] Redis error — fail-open:", err);
    return true;
  }
}