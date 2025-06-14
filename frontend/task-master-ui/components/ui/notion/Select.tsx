'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notionColors } from './styles';

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-7 w-full items-center justify-between rounded px-2 py-1 text-sm',
      'hover:bg-gray-50 cursor-pointer transition-colors',
      'focus:outline-none focus:ring-0',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-3 w-3 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        'relative z-50 min-w-[8rem] overflow-hidden rounded-md bg-white shadow-md',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        className
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          'p-1',
          position === 'popper' &&
            'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]'
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> & {
    indicator?: React.ReactNode;
  }
>(({ className, children, indicator, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
      'hover:bg-gray-50 focus:bg-gray-50',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        {indicator || <Check className="h-4 w-4" />}
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

// ステータス選択用のコンポーネント
interface StatusSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

const statusOptions = [
  { value: 'not-started', label: '未着手', color: notionColors.status.default },
  { value: 'in-progress', label: '進行中', color: notionColors.status.progress },
  { value: 'completed', label: '完了', color: notionColors.status.complete },
  { value: 'blocked', label: 'ブロック', color: notionColors.status.blocked },
  { value: 'review', label: 'レビュー', color: notionColors.status.review },
];

export const StatusSelect: React.FC<StatusSelectProps> = ({ value, onValueChange, disabled }) => {
  const selectedOption = statusOptions.find((opt) => opt.value === value);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="border-0 h-auto">
        <div
          className="px-2 py-0.5 rounded text-xs font-medium"
          style={{ backgroundColor: selectedOption?.color || notionColors.status.default }}
        >
          {selectedOption?.label || '選択'}
        </div>
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{ backgroundColor: option.color }}
            >
              {option.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// 優先度選択用のコンポーネント
interface PrioritySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

const priorityOptions = [
  { value: 'high', label: '高', icon: '🔴' },
  { value: 'medium', label: '中', icon: '🟡' },
  { value: 'low', label: '低', icon: '🟢' },
];

export const PrioritySelect: React.FC<PrioritySelectProps> = ({ value, onValueChange, disabled }) => {
  const selectedOption = priorityOptions.find((opt) => opt.value === value);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="border-0 h-auto w-20">
        <div className="flex items-center gap-1 text-sm">
          <span>{selectedOption?.icon}</span>
          <span>{selectedOption?.label}</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {priorityOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center gap-1">
              <span>{option.icon}</span>
              <span>{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem };