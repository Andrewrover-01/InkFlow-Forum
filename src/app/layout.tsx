import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: {
    default: "墨香论坛 - 古风小说社区",
    template: "%s | 墨香论坛",
  },
  description: "墨香论坛：探索古典文学与历史的世界，分享你的故事与感悟",
  keywords: ["古风", "小说", "论坛", "文学", "历史"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl">
              {children}
            </main>
            <footer className="border-t border-parchment-300 py-6 mt-8">
              <div className="container mx-auto px-4 text-center text-ink-500 text-sm font-sans">
                <p>墨香论坛 · 古风小说社区</p>
                <p className="mt-1 text-xs text-ink-400">
                  © 2026 InkFlow Forum. Built with Next.js 14 & Prisma
                </p>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
