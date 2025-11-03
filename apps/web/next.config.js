/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@apimetrics/shared'],
  async redirects() {
    return [
      { source: '/list-endpoints', destination: '/endpoints', permanent: true },
      { source: '/test-endpoints', destination: '/load-tests', permanent: true },
      { source: '/my-endpoints', destination: '/endpoints', permanent: true },
    ];
  },
};

module.exports = nextConfig;

