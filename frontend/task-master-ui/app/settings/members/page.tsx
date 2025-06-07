"use client"

import { useEffect, useState } from "react"
import { Plus, Search, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { EmptyState } from "@/components/ui/empty-state"
import { api, Member, Organization } from "@/lib/api"
import { toast } from "sonner"
import { MemberList } from "@/components/organization/MemberList"
import { InviteMemberModal } from "@/components/organization/InviteMemberModal"
import { InvitationList } from "@/components/organization/InvitationList"

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'member'>('member')

  useEffect(() => {
    loadOrganizationData()
  }, [])

  const loadOrganizationData = async () => {
    try {
      setLoading(true)
      
      // Get current organization
      const orgId = localStorage.getItem("currentOrgId")
      if (!orgId) {
        toast.error("組織が選択されていません")
        return
      }

      // Load organization details
      const { data: orgData } = await api.getOrganizationWrapped(orgId)
      if (orgData) {
        setCurrentOrg(orgData)
        setCurrentUserRole(orgData.role || 'member')
      }

      // Load members
      const { data: membersData } = await api.getOrganizationMembersWrapped(orgId)
      if (membersData) {
        setMembers(membersData)
      }

      // Load invitations (for admins only)
      if (orgData?.role === 'admin') {
        const { data: invitesData } = await api.getOrganizationInvitations(orgId)
        if (invitesData) {
          setInvitations(invitesData)
        }
      }
    } catch (error) {
      console.error("Failed to load organization data:", error)
      toast.error("データの読み込みに失敗しました")
    } finally {
      setLoading(false)
    }
  }

  const handleInviteMember = async (email: string, role: 'admin' | 'member') => {
    try {
      const orgId = localStorage.getItem("currentOrgId")
      if (!orgId) return

      await api.inviteMemberWrapped(orgId, { email, role })
      toast.success("招待メールを送信しました")
      setShowInviteModal(false)
      loadOrganizationData()
    } catch (error) {
      console.error("Failed to invite member:", error)
      throw error
    }
  }

  const handleUpdateMemberRole = async (memberId: string, newRole: 'admin' | 'member') => {
    try {
      const orgId = localStorage.getItem("currentOrgId")
      if (!orgId) return

      await api.updateOrganizationMember(orgId, memberId, { role: newRole })
      toast.success("メンバーの権限を更新しました")
      loadOrganizationData()
    } catch (error) {
      console.error("Failed to update member role:", error)
      toast.error("権限の更新に失敗しました")
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("このメンバーを組織から削除してもよろしいですか？")) return

    try {
      const orgId = localStorage.getItem("currentOrgId")
      if (!orgId) return

      await api.removeOrganizationMember(orgId, memberId)
      toast.success("メンバーを削除しました")
      loadOrganizationData()
    } catch (error) {
      console.error("Failed to remove member:", error)
      toast.error("メンバーの削除に失敗しました")
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const orgId = localStorage.getItem("currentOrgId")
      if (!orgId) return

      await api.cancelInvitation(orgId, invitationId)
      toast.success("招待をキャンセルしました")
      loadOrganizationData()
    } catch (error) {
      console.error("Failed to cancel invitation:", error)
      toast.error("招待のキャンセルに失敗しました")
    }
  }

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const orgId = localStorage.getItem("currentOrgId")
      if (!orgId) return

      await api.resendInvitation(orgId, invitationId)
      toast.success("招待メールを再送信しました")
    } catch (error) {
      console.error("Failed to resend invitation:", error)
      toast.error("招待メールの再送信に失敗しました")
    }
  }

  // Filter members
  const filteredMembers = members.filter(member => {
    return member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           member.email.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const filteredInvitations = invitations.filter(invite => {
    return invite.email.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const isAdmin = currentUserRole === 'admin'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!currentOrg) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmptyState
          icon={<Mail className="w-16 h-16" />}
          title="組織が選択されていません"
          description="組織を選択してからメンバー管理を行ってください"
        />
      </div>
    )
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2">メンバー管理</h1>
        <p className="text-gray-600">{currentOrg.name} のメンバーと権限を管理</p>
      </div>

      {/* Control Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {isAdmin && (
            <Button onClick={() => setShowInviteModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              メンバーを招待
            </Button>
          )}
          
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
        
        <div className="text-sm text-gray-500">
          {members.length} 名のメンバー
          {invitations.length > 0 && ` • ${invitations.length} 件の保留中の招待`}
        </div>
      </div>

      {/* Members Section */}
      {filteredMembers.length === 0 && filteredInvitations.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" 
              />
            </svg>
          }
          title={searchQuery ? "メンバーが見つかりません" : "メンバーがいません"}
          description={searchQuery ? "検索条件を変更してください" : "新しいメンバーを招待してチームを構築しましょう"}
          action={!searchQuery && isAdmin ? {
            label: "メンバーを招待",
            onClick: () => setShowInviteModal(true)
          } : undefined}
        />
      ) : (
        <div className="space-y-6">
          {/* Active Members */}
          {filteredMembers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>アクティブメンバー</CardTitle>
                <CardDescription>現在組織に参加しているメンバー</CardDescription>
              </CardHeader>
              <CardContent>
                <MemberList
                  members={filteredMembers}
                  currentUserRole={currentUserRole}
                  onUpdateRole={handleUpdateMemberRole}
                  onRemoveMember={handleRemoveMember}
                />
              </CardContent>
            </Card>
          )}

          {/* Pending Invitations */}
          {isAdmin && filteredInvitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>保留中の招待</CardTitle>
                <CardDescription>メンバーの参加を待っている招待</CardDescription>
              </CardHeader>
              <CardContent>
                <InvitationList
                  invitations={filteredInvitations}
                  onCancel={handleCancelInvitation}
                  onResend={handleResendInvitation}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Invite Member Modal */}
      <InviteMemberModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        onInvite={handleInviteMember}
        existingMembers={members.map(m => m.email)}
        existingInvitations={invitations.map(i => i.email)}
      />
    </div>
  )
}