import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // @gl/constructor ships as TypeScript source — let Next compile it
  transpilePackages: ['@gl/constructor', '@gl/cutout'],
  images: {
    // The four "occasion" tiles are licensed Unsplash lifestyle shots, the same ones the
    // approved design uses. Next fetches and re-encodes them server-side, so the visitor's
    // browser never talks to unsplash.com — no third-party request on the landing.
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
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
