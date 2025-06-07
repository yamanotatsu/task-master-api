'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Settings, Building } from 'lucide-react';

export function MainNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { currentOrganization, organizations, setCurrentOrganization } = useOrganization();

  // Don't show navigation on auth pages
  if (pathname.startsWith('/auth') || pathname === '/setup-organization') {
    return null;
  }

  if (!user) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="max-w-screen-2xl mx-auto flex h-16 items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="mr-8 flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <span className="text-xl font-bold">Task Master</span>
        </Link>
        
        <nav className="flex items-center space-x-8 flex-1 justify-center">
          <Link 
            href="/" 
            className={`transition-colors font-medium ${
              pathname === '/' ? 'text-primary' : 'hover:text-primary text-gray-700'
            }`}
          >
            ダッシュボード
          </Link>
          <Link 
            href="/settings/members" 
            className={`transition-colors font-medium ${
              pathname === '/settings/members' ? 'text-primary' : 'hover:text-primary text-gray-700'
            }`}
          >
            メンバー管理
          </Link>
          <Link 
            href="/settings" 
            className={`transition-colors font-medium ${
              pathname.startsWith('/settings') && pathname !== '/settings/members' ? 'text-primary' : 'hover:text-primary text-gray-700'
            }`}
          >
            設定
          </Link>
        </nav>

        <div className="ml-auto flex items-center space-x-4">
          {/* Organization Selector */}
          {organizations.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  {currentOrganization?.name}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>組織を選択</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {organizations.map((org) => (
                  <DropdownMenuItem
                    key={org.id}
                    onClick={() => setCurrentOrganization(org)}
                    className={org.id === currentOrganization?.id ? 'bg-accent' : ''}
                  >
                    {org.name}
                    {org.role === 'admin' && (
                      <span className="ml-2 text-xs text-muted-foreground">(管理者)</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-700" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.user_metadata?.full_name || user.email?.split('@')[0]}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/profile" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  プロファイル設定
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut()}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                ログアウト
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}