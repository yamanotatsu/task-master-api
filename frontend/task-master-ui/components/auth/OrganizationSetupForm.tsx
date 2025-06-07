'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { Building2, Users, Briefcase, Rocket } from 'lucide-react'

interface OrganizationSetupFormProps {
  onComplete?: () => void
  isFirstSetup?: boolean
}

export function OrganizationSetupForm({ onComplete, isFirstSetup = true }: OrganizationSetupFormProps) {
  const [organizationName, setOrganizationName] = useState('')
  const [description, setDescription] = useState('')
  const [organizationType, setOrganizationType] = useState<'personal' | 'team' | 'company'>('personal')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{
    name?: string
    description?: string
  }>({})
  
  const { user } = useAuth()
  const router = useRouter()

  const organizationTypes = [
    {
      value: 'personal',
      label: '個人ワークスペース',
      icon: Users,
      description: '個人的なタスクとプロジェクトを管理'
    },
    {
      value: 'team',
      label: 'チームワークスペース',
      icon: Briefcase,
      description: '小規模チームでのコラボレーション'
    },
    {
      value: 'company',
      label: '企業ワークスペース',
      icon: Building2,
      description: '企業全体でのプロジェクト管理'
    }
  ]

  const validateForm = () => {
    const newErrors: typeof errors = {}
    
    if (!organizationName) {
      newErrors.name = '組織名を入力してください'
    } else if (organizationName.length < 2) {
      newErrors.name = '組織名は2文字以上で入力してください'
    } else if (organizationName.length > 50) {
      newErrors.name = '組織名は50文字以内で入力してください'
    }
    
    if (description && description.length > 200) {
      newErrors.description = '説明は200文字以内で入力してください'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)
    setErrors({})
    
    try {
      // Create organization via API
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: organizationName,
          description: description || `${organizationName}のワークスペース`,
          type: organizationType,
        }),
      })

      if (!response.ok) {
        throw new Error('組織の作成に失敗しました')
      }

      toast.success('組織を作成しました')
      
      if (onComplete) {
        onComplete()
      } else {
        router.push('/')
      }
    } catch (error: any) {
      console.error('Organization setup error:', error)
      toast.error('組織の作成に失敗しました。もう一度お試しください。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="space-y-1">
        <div className="flex items-center space-x-2 mb-2">
          <Rocket className="h-6 w-6 text-primary" />
          <CardTitle className="text-2xl font-bold">
            {isFirstSetup ? 'ワークスペースを作成' : '新しい組織を作成'}
          </CardTitle>
        </div>
        <CardDescription>
          {isFirstSetup 
            ? 'タスク管理を開始するために、最初のワークスペースを作成しましょう'
            : '新しい組織を作成して、チームでのコラボレーションを始めましょう'
          }
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Organization Type Selection */}
          <div className="space-y-3">
            <Label>ワークスペースタイプ</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {organizationTypes.map((type) => {
                const Icon = type.icon
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setOrganizationType(type.value as any)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      organizationType === type.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    disabled={isLoading}
                  >
                    <Icon className={`h-8 w-8 mb-2 ${
                      organizationType === type.value ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                    <h3 className="font-medium text-sm">{type.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {type.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Organization Name */}
          <div className="space-y-2">
            <Label htmlFor="organizationName">組織名 *</Label>
            <Input
              id="organizationName"
              type="text"
              placeholder={
                organizationType === 'personal' 
                  ? '例: 個人のタスク管理'
                  : organizationType === 'team'
                  ? '例: 開発チーム'
                  : '例: 株式会社サンプル'
              }
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              disabled={isLoading}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name}</p>
            )}
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">説明（任意）</Label>
            <Textarea
              id="description"
              placeholder="このワークスペースの目的や使い方を記載してください"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
              rows={3}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-sm text-red-500 mt-1">{errors.description}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {description.length}/200文字
            </p>
          </div>

          {/* Default Settings Info */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="text-sm font-medium">デフォルト設定</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• あなたは組織の管理者として登録されます</li>
              <li>• 後からメンバーを招待できます</li>
              <li>• 組織の設定はいつでも変更可能です</li>
            </ul>
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
                作成中...
              </>
            ) : (
              <>
                <Rocket className="mr-2 h-4 w-4" />
                ワークスペースを作成
              </>
            )}
          </Button>
          
          {!isFirstSetup && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              キャンセル
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  )
}