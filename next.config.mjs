/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      // Cloudflare R2 public buckets (*.r2.dev) and custom CDN domains
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "pub-*.r2.dev" },
      // Fallback: allow any https host so externally-hosted avatars still work.
      // Tighten this in production once the R2 domain is known.
      { protocol: "https", hostname: "**" },
      { protocol: "http",  hostname: "**" },
    ],
  },
};

export default nextConfig;
