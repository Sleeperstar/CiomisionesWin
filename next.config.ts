import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
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
  // Configuración para resolver problemas de OpenTelemetry con Genkit en Vercel
  serverExternalPackages: [
    '@opentelemetry/sdk-node',
    '@opentelemetry/exporter-jaeger',
    'genkit',
    '@genkit-ai/googleai',
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ignorar módulos opcionales de OpenTelemetry que no están instalados
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@opentelemetry/exporter-jaeger': false,
      };
    }
    return config;
  },
};

export default nextConfig;
