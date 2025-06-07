'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { User, Settings, LogOut, Building2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

export function UserDropdown() {
  const { user, profile, organizations, currentOrganization, setCurrentOrganization, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('ログアウトしました');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('ログアウトに失敗しました');
    }
  };

  const handleOrganizationChange = (org: typeof organizations[0]) => {
    setCurrentOrganization(org);
    toast.success(`組織を「${org.name}」に切り替えました`);
    router.refresh();
  };

  if (!user) {
    return (
      <Button
        variant="outline"
        onClick={() => router.push('/login')}
        className="flex items-center gap-2"
      >
        <User className="h-4 w-4" />
        ログイン
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 rounded-full">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || user.email || ''}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="h-4 w-4 text-primary" />
              )}
            </div>
            <span className="hidden md:inline-block text-sm font-medium">
              {profile?.full_name || user.email?.split('@')[0]}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {profile?.full_name || 'ユーザー'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        
        {organizations.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              組織
            </DropdownMenuLabel>
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => handleOrganizationChange(org)}
                className="cursor-pointer"
              >
                <Building2 className="mr-2 h-4 w-4" />
                <div className="flex flex-col flex-1">
                  <span className="text-sm">{org.name}</span>
                  {currentOrganization?.id === org.id && (
                    <span className="text-xs text-muted-foreground">現在選択中</span>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push('/settings/profile')}
          className="cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          プロフィール設定
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push('/settings')}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          設定
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          ログアウト
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}