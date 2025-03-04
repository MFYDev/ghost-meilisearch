/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Configure Edge runtime for API routes
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // Set the runtime for specific routes
  serverRuntimeConfig: {
    // Will only be available on the server side
  },
  publicRuntimeConfig: {
    // Will be available on both server and client
  }
};

export default nextConfig; 