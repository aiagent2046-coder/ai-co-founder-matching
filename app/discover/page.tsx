// app/discover/page.tsx
'use client';

import { trackSwipeAction } from '@/lib/analytics';

const handleSwipe = (action: 'like' | 'pass', profileId: string) => {
  trackSwipeAction(action, profileId); // ← Отслеживаем свайпы
  // ... остальная логика
};
