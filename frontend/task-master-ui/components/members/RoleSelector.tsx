'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, User } from 'lucide-react';

interface RoleSelectorProps {
  currentRole: 'admin' | 'member';
  onChange: (newRole: 'admin' | 'member') => Promise<void>;
  disabled?: boolean;
}

export function RoleSelector({ currentRole, onChange, disabled = false }: RoleSelectorProps) {
  const [isChanging, setIsChanging] = useState(false);

  const handleChange = async (value: string) => {
    if (value === currentRole || isChanging) return;

    setIsChanging(true);
    try {
      await onChange(value as 'admin' | 'member');
    } catch (error) {
      console.error('Failed to change role:', error);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <Select
      value={currentRole}
      onValueChange={handleChange}
      disabled={disabled || isChanging}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            管理者
          </div>
        </SelectItem>
        <SelectItem value="member">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            メンバー
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}