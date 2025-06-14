'use client';

import * as React from 'react';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DatePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  date,
  onDateChange,
  disabled,
  placeholder = '日付を選択',
  className,
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'h-7 justify-start text-left font-normal px-2 py-1',
            'hover:bg-gray-50 transition-colors',
            'focus:outline-none focus:ring-0',
            !date && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <Calendar className="mr-1 h-3 w-3" />
          {date ? format(date, 'yyyy/MM/dd', { locale: ja }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarComponent
          mode="single"
          selected={date}
          onSelect={onDateChange}
          initialFocus
          locale={ja}
        />
      </PopoverContent>
    </Popover>
  );
};