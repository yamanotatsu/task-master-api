import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_JP } from "next/font/google";
import Link from "next/link";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { ToastProvider } from "@/providers/ToastProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { MainNav } from "@/components/navigation/MainNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
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
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansJP.variable} antialiased min-h-screen bg-background`}
      >
        <ErrorBoundary>
          <ThemeProvider defaultTheme="light" storageKey="task-master-theme">
            <AuthProvider>
              <ToastProvider>
                <div className="relative flex min-h-screen flex-col">
                <MainNav />
            <main className="flex-1 bg-gray-50">
              {children}
            </main>
            <Toaster />
          </div>
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
