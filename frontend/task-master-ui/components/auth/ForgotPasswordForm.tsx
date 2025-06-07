'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import Link from 'next/link'
import { toast } from 'sonner'
import { CheckCircle2 } from 'lucide-react'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { resetPassword } = useAuth()
  const router = useRouter()

  const validateEmail = () => {
    if (!email) {
      setError('メールアドレスを入力してください')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('有効なメールアドレスを入力してください')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateEmail()) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      await resetPassword(email)
      setIsSuccess(true)
      toast.success('パスワードリセット用のメールを送信しました')
    } catch (error: any) {
      console.error('Password reset error:', error)
      
      if (error.message?.includes('not found')) {
        setError('このメールアドレスは登録されていません')
      } else {
        setError('メールの送信に失敗しました。もう一度お試しください。')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold">メールを送信しました</CardTitle>
          <CardDescription className="text-base">
            パスワードリセット用のリンクを含むメールを送信しました。
            メールをご確認ください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-center font-mono">{email}</p>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            メールが届かない場合は、迷惑メールフォルダをご確認ください。
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => router.push('/login')}
          >
            ログインページに戻る
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              setIsSuccess(false)
              setEmail('')
            }}
          >
            別のメールアドレスで試す
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">パスワードをリセット</CardTitle>
        <CardDescription>
          登録したメールアドレスを入力してください。
          パスワードリセット用のリンクをお送りします。
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(null)
              }}
              disabled={isLoading}
              className={error ? 'border-red-500' : ''}
            />
            {error && (
              <p className="text-sm text-red-500 mt-1">{error}</p>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-4">
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                送信中...
              </>
            ) : (
              'リセットリンクを送信'
            )}
          </Button>
          
          <div className="text-center text-sm">
            <Link href="/login" className="text-primary hover:underline">
              ログインに戻る
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}