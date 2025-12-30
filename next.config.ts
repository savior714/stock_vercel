import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tauri 빌드 시에만 정적 내보내기 활성화
  // TAURI_ENV=true npm run build 로 빌드
  ...(process.env.TAURI_ENV === 'true' ? {
    output: 'export',
    distDir: 'out',
    // 정적 빌드 시 이미지 최적화 비활성화
    images: {
      unoptimized: true,
    },
  } : {}),
};

export default nextConfig;
