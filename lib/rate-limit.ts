import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Инициализация Redis клиента
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Создаем лимитер: 5 запросов на пользователя в 60 секунд
const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
});

export default ratelimit;
