/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // serverExternalPackages instead of experimental.serverComponentsExternalPackages
  serverExternalPackages: [],
  // Set the runtime for specific routes
  serverRuntimeConfig: {
    // Will only be available on the server side
  },
  publicRuntimeConfig: {
    // Will be available on both server and client
  },
  // Ensure static assets are properly served
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : '',
  // Ensure API routes are properly handled
  rewrites: async () => {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  // Explicitly set output to ensure Vercel recognizes this as a Next.js app
  output: 'standalone',
};

export default nextConfig;