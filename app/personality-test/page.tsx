// app/personality-test/page.tsx
'use client';

import { trackTestStarted, trackTestCompleted } from '@/lib/analytics';
import { useEffect } from 'react';

export default function PersonalityTestPage() {
  useEffect(() => {
    trackTestStarted(); // ← Отслеживаем начало теста
  }, []);

  const handleTestComplete = (results: any) => {
    trackTestCompleted(results.bigFive); // ← Отслеживаем завершение
    // ... остальная логика
  };

  return (
    // ... твой JSX
  );
}
