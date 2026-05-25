import type { NextConfig } from 'next';
import path from 'path';

const config: NextConfig = {
  webpack: (webpackConfig) => {
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      '@syndi/types':     path.resolve(__dirname, 'packages/types/src'),
      '@syndi/ai-agents': path.resolve(__dirname, 'packages/ai-agents/src'),
      '@syndi/supabase':  path.resolve(__dirname, 'packages/supabase/src'),
    };
    return webpackConfig;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'replicate.delivery' },
    ],
  },
};

export default config;
