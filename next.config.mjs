import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Adiciona a configuração de cabeçalhos para resolver o problema de CORS no ambiente de desenvolvimento.
  async headers() {
    return [
      {
        source: '/manifest.webmanifest',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*', // Permite o acesso de qualquer origem
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET',
          },
        ],
      },
    ];
  },
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
