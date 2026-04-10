import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',  // required for Docker multi-stage build
  experimental: {
    typedRoutes: true,
  },
  // Transpile shared packages from the monorepo
  transpilePackages: ['@klevo/ui', '@klevo/types'],
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
