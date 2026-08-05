/** @type {import('next').NextConfig} */
const nextConfig = {
  // for verification builds that dont knock down dev local server
  distDir: process.env.NEXT_DIST_DIR || '.next',
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
