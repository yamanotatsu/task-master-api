import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-4">
        <Skeleton className="h-12 w-[250px]" />
        <Skeleton className="h-4 w-[350px]" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[200px] rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}