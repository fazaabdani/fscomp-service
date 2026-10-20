/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Served over HTTPS only (Cloudflare in front); ignored on plain http.
          { key: "Strict-Transport-Security", value: "max-age=15552000" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
