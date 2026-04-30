/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'maplestory.io',
        pathname: '/api/**',
      },
    ],
  },
};

module.exports = nextConfig;
