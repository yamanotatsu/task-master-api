import type { Metadata } from "next"
import Link from "next/link"
import { LoginForm } from "@/components/auth/LoginForm"

export const metadata: Metadata = {
  title: "ログイン - Task Master",
  description: "Task Masterアカウントにログインして、プロジェクトとタスクの管理を開始しましょう",
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center space-x-2">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-2xl">T</span>
            </div>
            <span className="text-3xl font-bold text-gray-900">Task Master</span>
          </Link>
          <p className="mt-4 text-sm text-gray-600">
            効率的なタスク管理で、プロジェクトを成功に導きます
          </p>
        </div>

        {/* Login Form */}
        <LoginForm />

        {/* Additional Links */}
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">
            初めてご利用の方は
            <Link 
              href="/signup" 
              className="ml-1 font-medium text-primary hover:text-primary/90"
            >
              無料で新規登録
            </Link>
          </p>
          <Link 
            href="/forgot-password" 
            className="block text-sm text-gray-600 hover:text-gray-900"
          >
            パスワードをお忘れですか？
          </Link>
        </div>
      </div>
    </div>
  )
}