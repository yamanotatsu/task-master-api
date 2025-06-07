"use client"

import { useState } from "react"
import { Mail, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

interface InviteMemberModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvite: (email: string, role: 'admin' | 'member') => Promise<void>
  existingMembers?: string[]
  existingInvitations?: string[]
}

export function InviteMemberModal({
  open,
  onOpenChange,
  onInvite,
  existingMembers = [],
  existingInvitations = []
}: InviteMemberModalProps) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validation
    if (!email.trim()) {
      setError("メールアドレスを入力してください")
      return
    }

    if (!validateEmail(email)) {
      setError("有効なメールアドレスを入力してください")
      return
    }

    if (existingMembers.includes(email)) {
      setError("このメールアドレスは既にメンバーとして登録されています")
      return
    }

    if (existingInvitations.includes(email)) {
      setError("このメールアドレスには既に招待を送信しています")
      return
    }

    try {
      setLoading(true)
      await onInvite(email, role)
      
      // Reset form
      setEmail("")
      setRole('member')
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to invite member:", error)
      setError("招待の送信に失敗しました。もう一度お試しください。")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>メンバーを招待</DialogTitle>
            <DialogDescription>
              新しいメンバーをチームに招待します。招待メールが送信されます。
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                メールアドレス <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError("")
                  }}
                  placeholder="member@example.com"
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">
                権限 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as 'admin' | 'member')}
                disabled={loading}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">
                    <div>
                      <div className="font-medium">メンバー</div>
                      <div className="text-xs text-muted-foreground">
                        プロジェクトの閲覧・編集が可能
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div>
                      <div className="font-medium">管理者</div>
                      <div className="text-xs text-muted-foreground">
                        組織の設定変更・メンバー管理が可能
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
              <p className="font-medium mb-1">招待について:</p>
              <ul className="space-y-1 text-xs">
                <li>• 招待メールには参加用のリンクが含まれます</li>
                <li>• 招待は7日間有効です</li>
                <li>• 招待されたユーザーはアカウント作成後に参加できます</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "送信中..." : "招待を送信"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}