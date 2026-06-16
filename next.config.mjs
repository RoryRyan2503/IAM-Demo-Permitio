// Bypass corporate proxy TLS interception in development
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
  // Force-set for all Node.js child processes / workers
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from external domains for demo
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
