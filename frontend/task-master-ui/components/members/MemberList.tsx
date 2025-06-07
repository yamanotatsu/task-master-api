'use client';

import { useState } from 'react';
import { Member } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RoleSelector } from './RoleSelector';
import { MemberActions } from './MemberActions';
import { Search, UserPlus, Users } from 'lucide-react';

interface MemberListProps {
  members: Member[];
  loading?: boolean;
  currentUserId?: string;
  isAdmin?: boolean;
  onInvite?: () => void;
  onRoleChange?: (memberId: string, newRole: 'admin' | 'member') => Promise<void>;
  onRemove?: (memberId: string) => Promise<void>;
}

export function MemberList({
  members,
  loading = false,
  currentUserId,
  isAdmin = false,
  onInvite,
  onRoleChange,
  onRemove,
}: MemberListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMembers = members.filter(member => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            組織メンバー
          </h2>
          <p className="text-muted-foreground mt-1">
            {members.length} 名のメンバー
          </p>
        </div>
        {isAdmin && onInvite && (
          <Button onClick={onInvite} className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            メンバーを招待
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="名前またはメールアドレスで検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Member List */}
      {filteredMembers.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? '検索結果がありません' : 'メンバーがいません'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredMembers.map((member) => (
            <Card key={member.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-semibold text-primary">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{member.name}</h3>
                      {member.id === currentUserId && (
                        <Badge variant="secondary" className="text-xs">
                          あなた
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && member.id !== currentUserId ? (
                    <>
                      <RoleSelector
                        currentRole={member.role as 'admin' | 'member'}
                        onChange={(newRole) => onRoleChange?.(member.id, newRole)}
                      />
                      <MemberActions
                        memberId={member.id}
                        memberName={member.name}
                        onRemove={() => onRemove?.(member.id)}
                      />
                    </>
                  ) : (
                    <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                      {member.role === 'admin' ? '管理者' : 'メンバー'}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}