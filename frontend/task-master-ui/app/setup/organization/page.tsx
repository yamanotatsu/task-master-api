'use client'

import type { Metadata } from "next"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { OrganizationSetupForm } from "@/components/auth/OrganizationSetupForm"
import { useAuth, withAuth } from "@/lib/auth"
import { Spinner } from "@/components/ui/spinner"

function OrganizationSetupContent() {
  const router = useRouter()
  const { user, currentOrganization, loading } = useAuth()

  useEffect(() => {
    // If user already has an organization, redirect to dashboard
    if (!loading && currentOrganization) {
      router.push('/')
    }
  }, [currentOrganization, loading, router])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    )
  }

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
          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            組織の設定
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Task Masterを使い始めるために、組織情報を設定してください
          </p>
        </div>

        {/* Organization Setup Form */}
        <OrganizationSetupForm />

        {/* Support Link */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            お困りですか？
            <Link 
              href="/support" 
              className="ml-1 font-medium text-primary hover:text-primary/90"
            >
              サポートにお問い合わせ
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default withAuth(OrganizationSetupContent)