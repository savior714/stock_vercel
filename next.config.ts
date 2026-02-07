import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Always use static export for Native platforms (Tauri/Android)
  output: 'export',
  trailingSlash: false,
  images: {
    unoptimized: true
  }
};

export default nextConfig;
