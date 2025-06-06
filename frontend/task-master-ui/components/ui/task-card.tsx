"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Link, CheckCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface TaskCardProps {
  id: number;
  title: string;
  description?: string;
  status: string;
  assignee?: string | { name: string };
  tags?: string[];
  dependencies?: number[];
  projectId: string;
  onStatusChange?: (status: string) => void;
  onDelete?: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
  className?: string;
}

export function TaskCard({
  id,
  title,
  description,
  status,
  assignee,
  tags,
  dependencies = [],
  projectId,
  onStatusChange,
  onDelete,
  draggable = true,
  onDragStart,
  className,
}: TaskCardProps) {
  const router = useRouter();
  const isCompleted = status === "completed" || status === "done";

  const assigneeName = typeof assignee === "string" ? assignee : assignee?.name;
  const assigneeInitial = assigneeName?.charAt(0);

  return (
    <div
      draggable={draggable && !isCompleted}
      onDragStart={onDragStart}
      className={cn(
        "bg-card p-4 rounded-lg shadow-sm border transition-all",
        draggable && !isCompleted && "cursor-move hover:shadow-md",
        isCompleted && "opacity-60",
        className
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className={cn("font-medium text-sm", isCompleted && "line-through")}>
          #{id} {title}
        </h4>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => router.push(`/projects/${projectId}/tasks/${id}`)}
            >
              詳細表示
            </DropdownMenuItem>
            {onStatusChange && (
              <>
                <DropdownMenuSeparator />
                {status !== "pending" && status !== "todo" && (
                  <DropdownMenuItem onClick={() => onStatusChange("pending")}>
                    To Doに戻す
                  </DropdownMenuItem>
                )}
                {status !== "in-progress" && !isCompleted && (
                  <DropdownMenuItem onClick={() => onStatusChange("in-progress")}>
                    {status === "pending" || status === "todo" ? "開始" : "In Progressに戻す"}
                  </DropdownMenuItem>
                )}
                {status === "in-progress" && (
                  <DropdownMenuItem onClick={() => onStatusChange("review")}>
                    レビューへ
                  </DropdownMenuItem>
                )}
                {!isCompleted && (
                  <DropdownMenuItem onClick={() => onStatusChange("completed")}>
                    完了
                  </DropdownMenuItem>
                )}
              </>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={onDelete}
                >
                  削除
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {description}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {assigneeName ? (
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
              <span className="text-xs font-medium">{assigneeInitial}</span>
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-dashed border-muted" />
          )}
          
          {tags && tags.map((tag, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {dependencies.length > 0 && (
            <Link className="h-4 w-4 text-muted-foreground" />
          )}
          {isCompleted && (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
        </div>
      </div>
    </div>
  );
}