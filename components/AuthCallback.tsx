// components/AuthCallback.tsx или где у тебя обработка логина
import { identifyUser } from '@/lib/analytics';

const handleLoginSuccess = async (user: any) => {
  identifyUser(user.id, {
    email: user.email,
    name: user.user_metadata?.full_name,
    created_at: user.created_at,
  });
  // ... остальная логика
};
