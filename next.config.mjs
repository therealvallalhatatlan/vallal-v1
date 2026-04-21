/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // mapbox-gl 3.x needs transpilation in Next.js / Turbopack
  transpilePackages: ['mapbox-gl'],
  async redirects() {
    return [
      {
        source: '/live',
        destination: '/nyitott-muhely',
        permanent: false,
      },
      {
        source: '/v',
        destination: '/v3',
        permanent: false,
      },
    ];
  },
}

export default nextConfig
