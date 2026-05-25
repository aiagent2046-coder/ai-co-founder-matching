import type { NextConfig } from 'next';

const config: NextConfig = {
  turbopack: {
    resolveAlias: {
      '@syndi/types':     './packages/types/src/index.ts',
      '@syndi/ai-agents': './packages/ai-agents/src/index.ts',
      '@syndi/supabase':  './packages/supabase/src/client.ts',
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'replicate.delivery' },
    ],
  },
};

export default config;
