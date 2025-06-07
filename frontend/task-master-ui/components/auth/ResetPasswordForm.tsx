'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import Link from 'next/link'
import { toast } from 'sonner'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isTokenValid, setIsTokenValid] = useState(true)
  const [errors, setErrors] = useState<{
    password?: string
    confirmPassword?: string
    token?: string
  }>({})
  
  const { updatePassword } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Validate token on mount
  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setIsTokenValid(false)
      setErrors({ token: 'リセットトークンが見つかりません' })
    }
  }, [searchParams])

  const getPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength++
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++
    if (password.match(/[0-9]/)) strength++
    if (password.match(/[^a-zA-Z0-9]/)) strength++
    
    return {
      score: strength,
      label: strength === 0 ? '弱い' : strength === 1 ? '普通' : strength === 2 ? '良い' : strength === 3 ? '強い' : '非常に強い',
      color: strength === 0 ? 'bg-red-500' : strength === 1 ? 'bg-orange-500' : strength === 2 ? 'bg-yellow-500' : strength === 3 ? 'bg-green-500' : 'bg-green-600'
    }
  }

  const passwordStrength = getPasswordStrength(password)

  const validateForm = () => {
    const newErrors: typeof errors = {}
    
    if (!password) {
      newErrors.password = '新しいパスワードを入力してください'
    } else if (password.length < 6) {
      newErrors.password = 'パスワードは6文字以上で入力してください'
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'パスワード（確認）を入力してください'
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'パスワードが一致しません'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !isTokenValid) return
    
    setIsLoading(true)
    setErrors({})
    
    try {
      await updatePassword(password)
      setIsSuccess(true)
      toast.success('パスワードを更新しました')
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (error: any) {
      console.error('Password update error:', error)
      
      if (error.message?.includes('expired')) {
        setErrors({ token: 'リセットリンクの有効期限が切れています。もう一度お試しください。' })
        setIsTokenValid(false)
      } else {
        toast.error('パスワードの更新に失敗しました。もう一度お試しください。')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!isTokenValid) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold">リンクが無効です</CardTitle>
          <CardDescription className="text-base">
            {errors.token || 'このパスワードリセットリンクは無効または期限切れです。'}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col space-y-4">
          <Button 
            className="w-full"
            onClick={() => router.push('/auth/forgot-password')}
          >
            新しいリセットリンクをリクエスト
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push('/login')}
          >
            ログインに戻る
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold">パスワードを更新しました</CardTitle>
          <CardDescription className="text-base">
            新しいパスワードでログインできます。
            3秒後にログインページに移動します。
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button 
            className="w-full"
            onClick={() => router.push('/login')}
          >
            今すぐログイン
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">新しいパスワードを設定</CardTitle>
        <CardDescription>
          新しいパスワードを入力してください
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">新しいパスワード</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className={errors.password ? 'border-red-500' : ''}
            />
            {errors.password && (
              <p className="text-sm text-red-500 mt-1">{errors.password}</p>
            )}
            {password && (
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${passwordStrength.color}`}
                      style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{passwordStrength.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  パスワードは8文字以上で、大文字・小文字・数字・記号を含めることを推奨します
                </p>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">パスワード（確認）</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              className={errors.confirmPassword ? 'border-red-500' : ''}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-500 mt-1">{errors.confirmPassword}</p>
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
                更新中...
              </>
            ) : (
              'パスワードを更新'
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