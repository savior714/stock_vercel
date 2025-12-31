import type { NextConfig } from "next";

const isCapacitorBuild = process.env.CAP_BUILD === 'true';
const isTauriBuild = process.env.TAURI_ENV === 'true';
const isStaticBuild = isCapacitorBuild || isTauriBuild;

const nextConfig: NextConfig = {
  // Capacitor 및 Tauri 빌드 시 정적 내보내기
  ...(isStaticBuild && {
    output: 'export',
    trailingSlash: true,
    images: {
      unoptimized: true
    }
  })
};

export default nextConfig;
