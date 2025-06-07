"use client"

import { Clock, Mail, RefreshCw, X, Shield, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface Invitation {
  id: string
  email: string
  role: 'admin' | 'member'
  expiresAt: string
  inviteUrl?: string
}

interface InvitationListProps {
  invitations: Invitation[]
  onCancel: (invitationId: string) => void
  onResend: (invitationId: string) => void
}

export function InvitationList({
  invitations,
  onCancel,
  onResend
}: InvitationListProps) {
  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()
    
    if (diff <= 0) return "期限切れ"
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) return `${days}日${hours}時間`
    return `${hours}時間`
  }

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) <= new Date()
  }

  const roleLabels = {
    admin: "管理者",
    member: "メンバー"
  }

  const roleColors = {
    admin: "bg-red-100 text-red-800 border-red-200",
    member: "bg-blue-100 text-blue-800 border-blue-200"
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        保留中の招待はありません
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="divide-y divide-gray-200">
        {invitations.map((invitation) => {
          const expired = isExpired(invitation.expiresAt)
          
          return (
            <div
              key={invitation.id}
              className={cn(
                "py-4 flex items-center justify-between",
                expired && "opacity-60"
              )}
            >
              <div className="flex items-center gap-4">
                {/* Email Icon */}
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-gray-600" />
                </div>

                {/* Invitation Info */}
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-gray-900">
                      {invitation.email}
                    </h4>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", roleColors[invitation.role])}
                    >
                      {invitation.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                      {invitation.role === 'member' && <User className="w-3 h-3 mr-1" />}
                      {roleLabels[invitation.role]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {expired ? (
                        <span className="text-red-600">期限切れ</span>
                      ) : (
                        <span>残り {getTimeRemaining(invitation.expiresAt)}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">
                      送信日: {new Date(invitation.expiresAt).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onResend(invitation.id)}
                      disabled={!expired}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {expired ? "招待を再送信" : "まだ有効期限内です"}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCancel(invitation.id)}
                      className="hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    招待をキャンセル
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          )
        })}
      </div>
    </TooltipProvider>
  )
}