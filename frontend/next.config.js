/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      // Development
      { protocol: 'http',  hostname: 'localhost', port: '8000' },
      // Production — set API_HOSTNAME in .env.production
      ...(process.env.API_HOSTNAME
        ? [{ protocol: 'https', hostname: process.env.API_HOSTNAME }]
        : []),
    ],
  },
  // Disable the X-Powered-By header
  poweredByHeader: false,
}

module.exports = nextConfig
