/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully static, self-contained export — deployable to any static host
  // (Vercel, Netlify, Cloudflare Pages, GitHub Pages, S3). No server, no APIs.
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
};

export default nextConfig;
