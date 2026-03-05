import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Stock Indicator Hub",
  description: "Real-time oversold detection and alerts based on technical indicators",
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
    <html lang="en">
      <body>
        <DisableContextMenu />
        <WindowEffect />
        <TitleBar />
        {children}
      </body>
    </html>
  );
}
