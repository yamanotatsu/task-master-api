import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toaster } from "@/components/ui/toaster";
import { Home, ListChecks, FileText, GitBranch } from "lucide-react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
      >
        <ThemeProvider defaultTheme="system" storageKey="task-master-theme">
          <div className="relative flex min-h-screen flex-col">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container flex h-16 items-center">
                <Link href="/" className="mr-8 flex items-center space-x-2">
                  <GitBranch className="h-6 w-6 text-primary" />
                  <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Task Master
                  </span>
                </Link>
                <nav className="flex items-center space-x-6 text-sm font-medium">
                  <Link 
                    href="/" 
                    className="flex items-center space-x-2 transition-colors hover:text-primary"
                  >
                    <Home className="h-4 w-4" />
                    <span>ホーム</span>
                  </Link>
                  <Link 
                    href="/tasks" 
                    className="flex items-center space-x-2 transition-colors hover:text-primary"
                  >
                    <ListChecks className="h-4 w-4" />
                    <span>タスク一覧</span>
                  </Link>
                  <Link 
                    href="/prd" 
                    className="flex items-center space-x-2 transition-colors hover:text-primary"
                  >
                    <FileText className="h-4 w-4" />
                    <span>PRD作成</span>
                  </Link>
                </nav>
                <div className="ml-auto flex items-center space-x-4">
                  <ThemeToggle />
                </div>
              </div>
            </header>
            <main className="flex-1">
              <div className="container py-6">
                {children}
              </div>
            </main>
            <footer className="border-t py-6 md:py-0">
              <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
                <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                  Built with AI-powered precision. © 2025 Task Master.
                </p>
              </div>
            </footer>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
