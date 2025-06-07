import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';

export default function ConfirmEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">メールを確認してください</CardTitle>
          <CardDescription>
            登録いただいたメールアドレスに確認メールを送信しました
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            メール内のリンクをクリックして、アカウントの登録を完了してください。
          </p>
          <p className="text-sm text-muted-foreground text-center">
            メールが届かない場合は、迷惑メールフォルダをご確認ください。
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild variant="outline">
            <Link href="/auth/login">
              ログインページへ戻る
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}