import type { Metadata } from "next";
import { Quicksand, ZCOOL_KuaiLe } from "next/font/google";
import "./globals.css";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
});

const zcoolKuaiLe = ZCOOL_KuaiLe({
  variable: "--font-zcool",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "AI 你画我猜",
  description: "在线你画我猜游戏，AI 实时猜测你的画作。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${quicksand.variable} ${zcoolKuaiLe.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
