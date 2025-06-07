'use client';

import { useEffect, useState } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { MemberList } from '@/components/members/MemberList';
import { InviteModal } from '@/components/members/InviteModal';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';

interface OrganizationMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
}

export default function MembersPage() {
  useRequireAuth();
  const { session, user } = useAuth();
  const { currentOrganization, isAdmin } = useOrganization();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    if (currentOrganization) {
      loadMembers();
    }
  }, [currentOrganization]);

  const loadMembers = async () => {
    if (!currentOrganization) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/v1/organizations/${currentOrganization.id}/members`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      } else {
        throw new Error('Failed to load members');
      }
    } catch (error) {
      console.error('Failed to load members:', error);
      toast.error('メンバーの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (email: string) => {
    if (!currentOrganization) {
      return { success: false, message: '組織が選択されていません' };
    }

    try {
      const response = await fetch(`/api/v1/organizations/${currentOrganization.id}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        await loadMembers();
        return { 
          success: true, 
          message: data.message || 'メンバーを追加しました' 
        };
      } else {
        throw new Error(data.error || 'Failed to invite member');
      }
    } catch (error: any) {
      return { 
        success: false, 
        message: error.message || '招待の送信に失敗しました' 
      };
    }
  };

  const handleRoleChange = async (memberId: string, newRole: 'admin' | 'member') => {
    if (!currentOrganization) return;

    try {
      const response = await fetch(
        `/api/v1/organizations/${currentOrganization.id}/members/${memberId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (response.ok) {
        await loadMembers();
        toast.success('ロールを更新しました');
      } else {
        throw new Error('Failed to update role');
      }
    } catch (error) {
      toast.error('ロールの更新に失敗しました');
      throw error;
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentOrganization) return;

    try {
      const response = await fetch(
        `/api/v1/organizations/${currentOrganization.id}/members/${memberId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
        }
      );

      if (response.ok) {
        await loadMembers();
        toast.success('メンバーを削除しました');
      } else {
        throw new Error('Failed to remove member');
      }
    } catch (error) {
      toast.error('メンバーの削除に失敗しました');
      throw error;
    }
  };

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">組織が選択されていません</p>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <MemberList
        members={members}
        loading={loading}
        currentUserId={user?.id}
        isAdmin={isAdmin}
        onInvite={() => setShowInviteModal(true)}
        onRoleChange={handleRoleChange}
        onRemove={handleRemoveMember}
      />

      <InviteModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        onInvite={handleInvite}
      />
    </div>
  );
}