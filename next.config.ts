import type { NextConfig } from "next";

const isCapacitorBuild = process.env.CAP_BUILD === 'true';
const isTauriBuild = process.env.TAURI_ENV === 'true';
const isStaticBuild = isCapacitorBuild || isTauriBuild;

const nextConfig: NextConfig = {
  // 항상 정적 내보내기 사용 (Tauri/Capacitor 호환)
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
};

export default nextConfig;
