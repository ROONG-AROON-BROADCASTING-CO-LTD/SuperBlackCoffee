import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    localPatterns: [{ pathname: '/**' }],
    unoptimized: true,
  },
};

export default nextConfig;
