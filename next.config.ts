import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // All backend traffic goes through same-origin /api/* → independent backend (no CORS, no
  // backend URL baked into the client bundle). BACKEND_URL is read at build/start time.
  async rewrites() {
    const backend = process.env.BACKEND_URL || 'http://localhost:4000';
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
