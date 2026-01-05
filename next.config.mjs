/** @type {import('next').NextConfig} */
const customBase = process.env.R2_PUBLIC_BASE;

const customUrl = (() => {
  if (!customBase) return null;

  try {
    return new URL(customBase);
  } catch (error) {
    // If parsing fails, skip adding a custom pattern.
    return null;
  }
})();

const customPattern = (() => {
  if (!customUrl) return null;

  const basePath = customUrl.pathname;
  const pathname = basePath.endsWith('/') ? `${basePath}**` : `${basePath}/**`;

  return {
    protocol: customUrl.protocol.replace(':', ''),
    hostname: customUrl.hostname,
    pathname
  };
})();

const r2AllowedOrigins = [
  'https://*.r2.cloudflarestorage.com',
  'https://*.r2.dev'
];

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' https: data: blob:"
].join('; ');

const remotePatterns = [
  {
    protocol: 'https',
    hostname: '**.r2.cloudflarestorage.com'
  },
  {
    protocol: 'https',
    hostname: '**.r2.dev'
  },
  {
    protocol: 'https',
    hostname: '**'
  }
];

if (customPattern) {
  remotePatterns.push(customPattern);
}

const nextConfig = {
  images: {
    remotePatterns
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy
          },
          {
            key: 'Content-Security-Policy-Report-Only',
            value: contentSecurityPolicy
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'Referrer-Policy',
            value: 'no-referrer'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet, noimageindex'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
