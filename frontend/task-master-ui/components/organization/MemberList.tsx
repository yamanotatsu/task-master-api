"use client"

import { useState } from "react"
import { MoreHorizontal, Shield, User, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Member } from "@/lib/api"
import { cn } from "@/lib/utils"

interface MemberListProps {
  members: Member[]
  currentUserRole: 'admin' | 'member'
  onUpdateRole?: (memberId: string, role: 'admin' | 'member') => void
  onRemoveMember?: (memberId: string) => void
  itemsPerPage?: number
}

export function MemberList({
  members,
  currentUserRole,
  onUpdateRole,
  onRemoveMember,
  itemsPerPage = 10
}: MemberListProps) {
  const [currentPage, setCurrentPage] = useState(1)
  
  const isAdmin = currentUserRole === 'admin'
  const totalPages = Math.ceil(members.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentMembers = members.slice(startIndex, endIndex)

  const roleLabels = {
    admin: "管理者",
    member: "メンバー",
    developer: "開発者",
    viewer: "閲覧者"
  }

  const roleColors = {
    admin: "bg-red-100 text-red-800 border-red-200",
    member: "bg-blue-100 text-blue-800 border-blue-200",
    developer: "bg-green-100 text-green-800 border-green-200",
    viewer: "bg-gray-100 text-gray-800 border-gray-200"
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-4">
      <div className="divide-y divide-gray-200">
        {currentMembers.map((member) => (
          <div
            key={member.id}
            className="py-4 flex items-center justify-between hover:bg-gray-50 -mx-4 px-4 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative">
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {getInitials(member.name)}
                    </span>
                  </div>
                )}
                {member.status === 'active' && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>

              {/* Member Info */}
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-gray-900">{member.name}</h4>
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", roleColors[member.role as keyof typeof roleColors])}
                  >
                    {member.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                    {member.role === 'member' && <User className="w-3 h-3 mr-1" />}
                    {roleLabels[member.role as keyof typeof roleLabels] || member.role}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">{member.email}</p>
                {member.joinedAt && (
                  <p className="text-xs text-gray-400 mt-1">
                    参加日: {new Date(member.joinedAt).toLocaleDateString('ja-JP')}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="sr-only">メニューを開く</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onUpdateRole && member.role !== 'admin' && (
                    <DropdownMenuItem
                      onClick={() => onUpdateRole(member.id, 'admin')}
                      className="cursor-pointer"
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      管理者に変更
                    </DropdownMenuItem>
                  )}
                  {onUpdateRole && member.role === 'admin' && (
                    <DropdownMenuItem
                      onClick={() => onUpdateRole(member.id, 'member')}
                      className="cursor-pointer"
                    >
                      <User className="mr-2 h-4 w-4" />
                      メンバーに変更
                    </DropdownMenuItem>
                  )}
                  {onRemoveMember && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onRemoveMember(member.id)}
                        className="cursor-pointer text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        メンバーを削除
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-gray-500">
            {members.length} 人中 {startIndex + 1} - {Math.min(endIndex, members.length)} 人を表示
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              前へ
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "w-8 h-8 p-0",
                    currentPage === page && "pointer-events-none"
                  )}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              次へ
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}