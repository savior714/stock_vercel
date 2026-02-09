import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "주가 정보 조회",
  description: "기술적 지표 기반 매수 시점 감지 및 Discord 알림",
};

import { WindowEffect } from "@/components/WindowEffect";
import { DisableContextMenu } from "@/components/DisableContextMenu";
import { TitleBar } from "@/components/TitleBar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <DisableContextMenu />
        <WindowEffect />
        <TitleBar />
        {children}
      </body>
    </html>
  );
}
