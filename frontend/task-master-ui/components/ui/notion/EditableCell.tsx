'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface EditableCellProps {
	value: string;
	onValueChange?: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	multiline?: boolean;
}

export const EditableCell: React.FC<EditableCellProps> = ({
	value,
	onValueChange,
	placeholder = 'クリックして編集',
	disabled,
	className,
	multiline = false
}) => {
	const [isEditing, setIsEditing] = React.useState(false);
	const [tempValue, setTempValue] = React.useState(value);
	const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null);

	React.useEffect(() => {
		setTempValue(value);
	}, [value]);

	React.useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [isEditing]);

	const handleSave = () => {
		if (onValueChange && tempValue !== value) {
			onValueChange(tempValue);
		}
		setIsEditing(false);
	};

	const handleCancel = () => {
		setTempValue(value);
		setIsEditing(false);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSave();
		} else if (e.key === 'Escape') {
			handleCancel();
		}
	};

	if (!onValueChange || disabled) {
		// 読み取り専用モード
		return (
			<div className={cn('text-sm py-1', className)}>
				{value || <span className="text-gray-400">{placeholder}</span>}
			</div>
		);
	}

	if (isEditing) {
		const commonProps = {
			ref: inputRef as any,
			value: tempValue,
			onChange: (
				e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
			) => setTempValue(e.target.value),
			onBlur: handleSave,
			onKeyDown: handleKeyDown,
			className: cn(
				'w-full px-2 py-1 text-sm border border-blue-500 rounded outline-none',
				'bg-white shadow-sm',
				className
			)
		};

		if (multiline) {
			return <textarea {...commonProps} rows={3} />;
		}

		return <input type="text" {...commonProps} />;
	}

	return (
		<div
			onClick={() => setIsEditing(true)}
			className={cn(
				'text-sm py-1 cursor-text hover:bg-gray-50 rounded transition-colors',
				'min-h-[24px]',
				className
			)}
		>
			{value || <span className="text-gray-400">{placeholder}</span>}
		</div>
	);
};
