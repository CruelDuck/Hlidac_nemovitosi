/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '2mb' }
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.sreality.cz' },
      { protocol: 'https', hostname: '**.bezrealitky.cz' },
      { protocol: 'https', hostname: 'd18-a.sdn.cz' },
      { protocol: 'https', hostname: 'img.bezrealitky.cz' },
      { protocol: 'https', hostname: 'i.nahraj.to' }
    ]
  }
}
export default nextConfig
