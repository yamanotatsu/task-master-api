'use client';

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { MoreVertical, UserMinus } from 'lucide-react';

interface MemberActionsProps {
  memberId: string;
  memberName: string;
  onRemove: () => Promise<void>;
}

export function MemberActions({ memberId, memberName, onRemove }: MemberActionsProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await onRemove();
      setShowConfirmDialog(false);
    } catch (error) {
      console.error('Failed to remove member:', error);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => setShowConfirmDialog(true)}
            className="text-red-600 focus:text-red-600"
          >
            <UserMinus className="mr-2 h-4 w-4" />
            メンバーを削除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>メンバーを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{memberName}</strong> を組織から削除します。
              この操作は取り消すことができません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isRemoving}
              className="bg-red-600 hover:bg-red-700"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}