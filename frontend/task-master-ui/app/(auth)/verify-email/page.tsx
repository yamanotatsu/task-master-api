'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { api } from '@/lib/api'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const [isResending, setIsResending] = useState(false)
  const [resendDisabled, setResendDisabled] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setResendDisabled(false)
    }
  }, [countdown])

  const handleResendVerification = async () => {
    if (!email) {
      toast.error('メールアドレスが見つかりません')
      return
    }

    setIsResending(true)
    try {
      const response = await api.post('/auth/resend-verification', { email })
      
      if (response.data.success) {
        toast.success('確認メールを再送信しました')
        setResendDisabled(true)
        setCountdown(60) // 60秒間は再送信を無効化
      }
    } catch (error: any) {
      console.error('Resend verification error:', error)
      
      if (error.response?.data?.error?.code === 'RATE_LIMIT_EXCEEDED') {
        toast.error('送信回数の制限に達しました。しばらく待ってから再度お試しください。')
        setResendDisabled(true)
        setCountdown(300) // 5分間待機
      } else if (error.response?.data?.error?.code === 'EMAIL_ALREADY_VERIFIED') {
        toast.success('このメールアドレスは既に確認済みです。ログインしてください。')
      } else {
        toast.error('メールの再送信に失敗しました')
      }
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold">メールアドレスの確認</CardTitle>
          <CardDescription className="mt-2">
            確認メールを送信しました
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-2">
              {email ? (
                <>
                  <span className="font-medium text-foreground">{email}</span> に
                  確認メールを送信しました。
                </>
              ) : (
                '登録したメールアドレスに確認メールを送信しました。'
              )}
            </p>
            <p>
              受信トレイを確認して、メール内のリンクをクリックしてアカウントを有効化してください。
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleResendVerification}
              disabled={isResending || resendDisabled || !email}
              variant="outline"
              className="w-full"
            >
              {isResending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  送信中...
                </>
              ) : countdown > 0 ? (
                `再送信可能まで ${countdown} 秒`
              ) : (
                '確認メールを再送信'
              )}
            </Button>

            <div className="text-center text-sm">
              <Link href="/login" className="text-primary hover:underline">
                ログインページに戻る
              </Link>
            </div>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-2">メールが届かない場合：</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 迷惑メールフォルダを確認してください</li>
              <li>• メールアドレスが正しく入力されているか確認してください</li>
              <li>• しばらく待ってから再送信してください</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}