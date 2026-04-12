/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/live',
        destination: '/nyitott-muhely',
        permanent: false,
      },
    ];
  },
}

export default nextConfig
