/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  experimental: {
    serverComponentsExternalPackages: ['cloudinary', 'pino-pretty'],
    // Disable worker threads and limit CPU usage to prevent thread-stream issues
    workerThreads: false,
    cpus: 1,
    // Ensure proper module resolution
    esmExternals: 'loose'
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...config.externals, 'pino-pretty', 'thread-stream'];
    }
    return config;
  }
};

module.exports = nextConfig;