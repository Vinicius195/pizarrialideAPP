import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
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

const pwaConfig = {
  dest: 'public',
  disable: process.env.NODE_ENV === 'development', // Desativa o PWA em desenvolvimento
  register: true,
  skipWaiting: true,
};

// Envolve a configuração do Next.js com a configuração do PWA
export default withPWA(pwaConfig)(nextConfig);
