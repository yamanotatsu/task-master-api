import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Noto_Sans_JP } from "next/font/google";
import Link from "next/link";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { Sidebar } from "@/components/ui/sidebar";
import { Header } from "@/components/ui/header";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

export const metadata: Metadata = {
  title: "Task Master - AI-Powered Task Management",
  description: "Advanced task management system with AI-powered task generation and analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${notoSansJP.variable} antialiased min-h-screen bg-background`}
      >
        <ThemeProvider defaultTheme="light" storageKey="task-master-theme">
          <div className="relative flex min-h-screen">
            {/* サイドバーナビゲーション */}
            <Sidebar />
            
            {/* メインコンテンツエリア */}
            <div className="flex-1 lg:pl-64 pt-16 lg:pt-0">
              {/* ヘッダー */}
              <Header />
              
              {/* メインコンテンツ */}
              <main className="flex-1 bg-background">
                {children}
              </main>
            </div>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
