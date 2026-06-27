import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Nikkei 225 Fear & Greed Index Dashboard",
  description: "日経平均株価と日本版Fear & Greed Indexの重ね合わせ可視化ダッシュボード。騰落レシオ、新高値・新安値銘柄数、信用評価損益率、日経平均VIなどを統合した株式市場センチメント分析ツール。",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
