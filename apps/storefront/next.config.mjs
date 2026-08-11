import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // @gl/constructor ships as TypeScript source — let Next compile it
  transpilePackages: ['@gl/constructor', '@gl/cutout'],
  images: {
    // unsplash: legacy lifestyle shots; r2.dev + backend: admin-uploaded hero slides
    // (the Slajdy page stores absolute URLs from the file module's R2 bucket)
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: 'backend-production-8e23.up.railway.app' },
      { protocol: 'https', hostname: 'mavorashop.eu' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  webpack: (config) => {
    // the engine uses ESM-style ".js" specifiers that point at ".ts" sources;
    // teach webpack to resolve them (tsc/vitest already do via Bundler resolution)
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};

export default withNextIntl(nextConfig);
