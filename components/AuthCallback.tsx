// components/AuthCallback.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // TODO: Обработка callback от Supabase Auth
    router.push('/discover');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <p>Authenticating...</p>
    </div>
  );
}
