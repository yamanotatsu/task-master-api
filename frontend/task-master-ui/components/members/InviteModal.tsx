'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, AlertCircle, CheckCircle } from 'lucide-react';

interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (email: string) => Promise<{ success: boolean; message: string }>;
}

export function InviteModal({ open, onOpenChange, onInvite }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isLoading) return;

    setIsLoading(true);
    setResult(null);

    try {
      const result = await onInvite(email);
      setResult(result);
      
      if (result.success) {
        setTimeout(() => {
          onOpenChange(false);
          setEmail('');
          setResult(null);
        }, 2000);
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'エラーが発生しました。もう一度お試しください。',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
      setEmail('');
      setResult(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>メンバーを招待</DialogTitle>
          <DialogDescription>
            メールアドレスを入力して組織にメンバーを追加します
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {result && (
              <div
                className={`flex items-start gap-2 p-3 rounded-md ${
                  result.success
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {result.success ? (
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                )}
                <p className="text-sm">{result.message}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isLoading || !email}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  送信中...
                </>
              ) : (
                '招待を送信'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}