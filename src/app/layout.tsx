import type { Metadata } from "next";
import "./globals.css";
import StarBackground from "@/components/StarBackground";

export const metadata: Metadata = {
  title: "异世界人生模拟器",
  description: "基于 AI 的二次元 GalGame 风格人生模拟小游戏",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <body className="font-sans">
        <StarBackground />
        {children}
      </body>
    </html>
  );
}
