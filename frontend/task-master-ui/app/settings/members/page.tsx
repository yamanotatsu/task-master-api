"use client"

import { useEffect, useState } from "react"
import { Plus, Search, Edit2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { EmptyState } from "@/components/ui/empty-state"
import { api, Member } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface MemberFormData {
  name: string
  email: string
  role: Member['role']
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterActive, setFilterActive] = useState<boolean | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [formData, setFormData] = useState<MemberFormData>({
    name: "",
    email: "",
    role: "developer"
  })
  const [formErrors, setFormErrors] = useState<Partial<MemberFormData>>({})

  useEffect(() => {
    loadMembers()
  }, [])

  const loadMembers = async () => {
    try {
      setLoading(true)
      const data = await api.getMembers()
      setMembers(data)
    } catch (error) {
      console.error("Failed to load members:", error)
      toast.error("メンバーの読み込みに失敗しました")
    } finally {
      setLoading(false)
    }
  }

  const validateForm = (): boolean => {
    const errors: Partial<MemberFormData> = {}
    
    if (!formData.name.trim()) {
      errors.name = "名前は必須です"
    }
    
    if (!formData.email.trim()) {
      errors.email = "メールアドレスは必須です"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "有効なメールアドレスを入力してください"
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAddMember = async () => {
    if (!validateForm()) return
    
    try {
      const newMember = await api.createMember({
        ...formData,
        status: 'active'
      })
      setMembers([...members, newMember])
      setShowAddModal(false)
      resetForm()
      toast.success("メンバーを追加しました")
    } catch (error) {
      console.error("Failed to add member:", error)
      toast.error("メンバーの追加に失敗しました")
    }
  }

  const handleUpdateMember = async () => {
    if (!editingMember || !validateForm()) return
    
    try {
      const updated = await api.updateMember(editingMember.id, formData)
      setMembers(members.map(m => m.id === updated.id ? updated : m))
      setEditingMember(null)
      resetForm()
      toast.success("メンバー情報を更新しました")
    } catch (error) {
      console.error("Failed to update member:", error)
      toast.error("メンバー情報の更新に失敗しました")
    }
  }

  const handleToggleStatus = async (member: Member) => {
    try {
      const updated = await api.updateMember(member.id, {
        status: member.status === 'active' ? 'inactive' : 'active'
      })
      setMembers(members.map(m => m.id === updated.id ? updated : m))
      toast.success("ステータスを更新しました")
    } catch (error) {
      console.error("Failed to toggle status:", error)
      toast.error("ステータスの更新に失敗しました")
    }
  }

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm("このメンバーを削除してもよろしいですか？")) return
    
    try {
      await api.deleteMember(memberId)
      setMembers(members.filter(m => m.id !== memberId))
      toast.success("メンバーを削除しました")
    } catch (error) {
      console.error("Failed to delete member:", error)
      toast.error("メンバーの削除に失敗しました")
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      role: "developer"
    })
    setFormErrors({})
  }

  const startEdit = (member: Member) => {
    setEditingMember(member)
    setFormData({
      name: member.name,
      email: member.email,
      role: member.role
    })
    setShowAddModal(true)
  }

  // Filter members
  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterActive === null || member.status === (filterActive ? 'active' : 'inactive')
    return matchesSearch && matchesFilter
  })

  const roleLabels: Record<Member['role'], string> = {
    admin: "管理者",
    developer: "開発者",
    viewer: "閲覧者"
  }

  const roleColors: Record<Member['role'], string> = {
    admin: "bg-red-100 text-red-800",
    developer: "bg-blue-100 text-blue-800",
    viewer: "bg-gray-100 text-gray-800"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2">担当者管理</h1>
        <p className="text-gray-600">プロジェクトメンバーの管理と権限設定</p>
      </div>

      {/* Control Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => {
              setEditingMember(null)
              resetForm()
              setShowAddModal(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            新規担当者追加
          </Button>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="名前やメールアドレスで検索..."
              className="pl-10 w-80"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">フィルタ:</span>
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setFilterActive(null)}
              className={cn(
                "px-3 py-1 text-sm rounded transition-colors",
                filterActive === null && "bg-white text-primary shadow-sm"
              )}
            >
              すべて
            </button>
            <button
              onClick={() => setFilterActive(true)}
              className={cn(
                "px-3 py-1 text-sm rounded transition-colors",
                filterActive === true && "bg-white text-primary shadow-sm"
              )}
            >
              アクティブのみ
            </button>
          </div>
        </div>
      </div>

      {/* Members Table */}
      {filteredMembers.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" 
              />
            </svg>
          }
          title={searchQuery ? "メンバーが見つかりません" : "メンバーがいません"}
          description={searchQuery ? "検索条件を変更してください" : "新規担当者を追加してチームを構築しましょう"}
          action={!searchQuery ? {
            label: "担当者を追加",
            onClick: () => setShowAddModal(true)
          } : undefined}
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  アバター
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  名前
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  メールアドレス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  役割
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{member.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">{member.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={roleColors[member.role]}>
                      {roleLabels[member.role]}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleStatus(member)}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        member.status === 'active' ? "bg-primary" : "bg-gray-200"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          member.status === 'active' ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(member)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteMember(member.id)}
                        className="hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                {editingMember ? "メンバー情報編集" : "新規メンバー追加"}
              </CardTitle>
              <CardDescription>
                {editingMember ? "メンバーの情報を更新します" : "新しいメンバーをチームに追加します"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  名前 <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="山田 太郎"
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="yamada@example.com"
                  className={formErrors.email ? "border-red-500" : ""}
                />
                {formErrors.email && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  役割 <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as Member['role'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">管理者</SelectItem>
                    <SelectItem value="developer">開発者</SelectItem>
                    <SelectItem value="viewer">閲覧者</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
                <p className="font-medium mb-1">役割の権限:</p>
                <ul className="space-y-1 text-xs">
                  <li>• <strong>管理者:</strong> すべての操作が可能</li>
                  <li>• <strong>開発者:</strong> タスクの作成・編集が可能</li>
                  <li>• <strong>閲覧者:</strong> 閲覧のみ可能</li>
                </ul>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingMember(null)
                    resetForm()
                  }}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={editingMember ? handleUpdateMember : handleAddMember}
                >
                  {editingMember ? "更新" : "追加"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}