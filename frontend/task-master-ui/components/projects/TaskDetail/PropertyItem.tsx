'use client';

import * as React from 'react';
import { StatusSelect, PrioritySelect, PersonTag, DatePicker } from '@/components/ui/notion';

interface PropertyItemProps {
  icon: string;
  label: string;
  type: 'text' | 'person' | 'status' | 'date' | 'priority';
  value: any;
  users?: Array<{ id: string; name: string; avatar?: string }>;
  onChange?: (value: any) => void;
  disabled?: boolean;
}

export const PropertyItem: React.FC<PropertyItemProps> = ({
  icon,
  label,
  type,
  value,
  users,
  onChange,
  disabled,
}) => {
  const renderValue = () => {
    switch (type) {
      case 'person':
        return (
          <PersonTag
            person={value}
            persons={users || []}
            onPersonChange={onChange}
            disabled={disabled}
          />
        );
      case 'status':
        return (
          <StatusSelect
            value={value}
            onValueChange={onChange || (() => {})}
            disabled={disabled}
          />
        );
      case 'date':
        return (
          <DatePicker
            date={value ? new Date(value) : undefined}
            onDateChange={(date) => onChange?.(date?.toISOString())}
            disabled={disabled}
          />
        );
      case 'priority':
        return (
          <PrioritySelect
            value={value}
            onValueChange={onChange || (() => {})}
            disabled={disabled}
          />
        );
      case 'text':
      default:
        return (
          <div className="text-sm text-gray-700">
            {value || '-'}
          </div>
        );
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-base">{icon}</span>
      <div className="flex-1">
        <div className="text-xs text-gray-500 mb-1">{label}</div>
        {renderValue()}
      </div>
    </div>
  );
};