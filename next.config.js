/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Inlined into both client and server bundles at build time; /api/health
  // reports it so an already-open tab can tell it is running an old build.
  env: { NEXT_PUBLIC_BUILD_ID: String(Date.now()) },
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
