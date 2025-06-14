'use client';

import * as React from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './Select';

interface Person {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

interface PersonTagProps {
  person?: Person;
  persons?: Person[];
  onPersonChange?: (personId: string | undefined) => void;
  disabled?: boolean;
  className?: string;
}

export const PersonTag: React.FC<PersonTagProps> = ({
  person,
  persons = [],
  onPersonChange,
  disabled,
  className,
}) => {
  if (!onPersonChange) {
    // 読み取り専用モード
    return (
      <div className={cn('flex items-center gap-1 text-sm', className)}>
        {person ? (
          <>
            {person.avatar ? (
              <img
                src={person.avatar}
                alt={person.name}
                className="h-5 w-5 rounded-full"
              />
            ) : (
              <div className="h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="h-3 w-3 text-gray-500" />
              </div>
            )}
            <span>{person.name}</span>
          </>
        ) : (
          <span className="text-gray-400">未割当</span>
        )}
      </div>
    );
  }

  // 編集可能モード
  return (
    <Select
      value={person?.id || 'unassigned'}
      onValueChange={(value) => onPersonChange(value === 'unassigned' ? undefined : value)}
      disabled={disabled}
    >
      <SelectTrigger className={cn('border-0 h-auto', className)}>
        <div className="flex items-center gap-1">
          {person ? (
            <>
              {person.avatar ? (
                <img
                  src={person.avatar}
                  alt={person.name}
                  className="h-5 w-5 rounded-full"
                />
              ) : (
                <div className="h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-3 w-3 text-gray-500" />
                </div>
              )}
              <span className="text-sm">{person.name}</span>
            </>
          ) : (
            <span className="text-sm text-gray-400">未割当</span>
          )}
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">
          <span className="text-gray-400">未割当</span>
        </SelectItem>
        {persons.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            <div className="flex items-center gap-2">
              {p.avatar ? (
                <img
                  src={p.avatar}
                  alt={p.name}
                  className="h-5 w-5 rounded-full"
                />
              ) : (
                <div className="h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-3 w-3 text-gray-500" />
                </div>
              )}
              <span>{p.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};