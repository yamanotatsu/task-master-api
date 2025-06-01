import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { FileX, Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="container flex items-center justify-center min-h-[600px]">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <FileX className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">404 - ページが見つかりません</CardTitle>
          <CardDescription>
            お探しのページは存在しないか、移動した可能性があります。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            URLを確認するか、ホームページから目的のページをお探しください。
          </p>
        </CardContent>
        <CardFooter className="flex justify-center gap-2">
          <Button asChild variant="default">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              ホームへ戻る
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/tasks">
              <ArrowLeft className="mr-2 h-4 w-4" />
              タスク一覧へ
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}