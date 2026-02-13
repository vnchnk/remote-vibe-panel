import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['node-pty', 'dockerode', 'pg'],
};

export default nextConfig;
