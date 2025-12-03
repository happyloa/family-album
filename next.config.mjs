/** @type {import('next').NextConfig} */
const customBase = process.env.R2_PUBLIC_BASE;

const customPattern = (() => {
  if (!customBase) return null;

  try {
    const parsed = new URL(customBase);
    const pathname = parsed.pathname.endsWith('/') ? `${parsed.pathname}**` : `${parsed.pathname}/**`;

    return {
      protocol: parsed.protocol.replace(':', ''),
      hostname: parsed.hostname,
      pathname
    };
  } catch (error) {
    // If parsing fails, skip adding a custom pattern.
    return null;
  }
})();

const remotePatterns = [
  {
    protocol: 'https',
    hostname: '**.r2.cloudflarestorage.com'
  },
  {
    protocol: 'https',
    hostname: '**.r2.dev'
  }
];

if (customPattern) {
  remotePatterns.push(customPattern);
}

const nextConfig = {
  images: {
    remotePatterns
  }
};

export default nextConfig;
