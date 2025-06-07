import type { Metadata } from "next"
import Link from "next/link"
import { SignupForm } from "@/components/auth/SignupForm"

export const metadata: Metadata = {
  title: "新規登録 - Task Master",
  description: "Task Masterに新規登録して、AIを活用した高度なタスク管理を始めましょう",
}

export default function SignupPage() {
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
            AIを活用した次世代のタスク管理システム
          </p>
        </div>

        {/* Signup Form */}
        <SignupForm />

        {/* Additional Links */}
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">
            既にアカウントをお持ちの方は
            <Link 
              href="/login" 
              className="ml-1 font-medium text-primary hover:text-primary/90"
            >
              ログイン
            </Link>
          </p>
        </div>

        {/* Terms and Privacy */}
        <p className="text-xs text-center text-gray-500">
          登録することで、
          <Link href="/terms" className="underline hover:text-gray-700">
            利用規約
          </Link>
          と
          <Link href="/privacy" className="underline hover:text-gray-700">
            プライバシーポリシー
          </Link>
          に同意したものとみなされます
        </p>
      </div>
    </div>
  )
}