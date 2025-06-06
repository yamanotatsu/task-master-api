import { cn } from "@/lib/utils"

type StatusType = "pending" | "in-progress" | "done" | "blocked" | "not-started" | "completed" | "deferred" | "cancelled" | "review"

interface StatusBadgeProps {
  status: StatusType
  className?: string
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  "not-started": {
    label: "未着手",
    className: "bg-blue-500 text-white"
  },
  "pending": {
    label: "未着手",
    className: "bg-blue-500 text-white"
  },
  "in-progress": {
    label: "進行中",
    className: "bg-yellow-500 text-white"
  },
  "done": {
    label: "完了",
    className: "bg-green-500 text-white"
  },
  "completed": {
    label: "完了",
    className: "bg-green-500 text-white"
  },
  "blocked": {
    label: "ブロック中",
    className: "bg-red-500 text-white"
  },
  "review": {
    label: "レビュー中",
    className: "bg-purple-500 text-white"
  },
  "deferred": {
    label: "延期",
    className: "bg-gray-500 text-white"
  },
  "cancelled": {
    label: "キャンセル",
    className: "bg-gray-600 text-white"
  }
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig["pending"]
  
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}