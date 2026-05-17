import type { Metadata } from "next";
import { M_PLUS_Rounded_1c } from "next/font/google";
import "./globals.css";
import StarBackground from "@/components/StarBackground";

const mPlusRounded = M_PLUS_Rounded_1c({ 
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-m-plus-rounded",
});

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
      <body className={`${mPlusRounded.variable} font-sans`}>
        <StarBackground />
        {children}
      </body>
    </html>
  );
}
