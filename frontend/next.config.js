/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "vorzaiq.com" }],
        destination: "https://www.vorzaiq.com/:path*",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
