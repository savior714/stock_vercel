import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "주가 정보 조회",
  description: "기술적 지표 기반 매수 시점 감지 및 Discord 알림",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
