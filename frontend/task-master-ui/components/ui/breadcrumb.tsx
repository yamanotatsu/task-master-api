"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  title: string;
  href?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  const pathname = usePathname();

  // パスから自動的にパンくずを生成
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (items) return items;

    const paths = pathname.split("/").filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { title: "ホーム", href: "/" }
    ];

    let currentPath = "";
    paths.forEach((path, index) => {
      currentPath += `/${path}`;
      
      // パスを日本語に変換
      let title = path;
      switch (path) {
        case "projects":
          title = "プロジェクト";
          break;
        case "tasks":
          title = "タスク";
          break;
        case "reports":
          title = "レポート";
          break;
        case "settings":
          title = "設定";
          break;
        case "members":
          title = "メンバー管理";
          break;
        case "new":
          title = "新規作成";
          break;
        default:
          // IDの場合は詳細ページとして扱う
          if (path.match(/^[0-9a-fA-F-]+$/)) {
            title = "詳細";
          }
      }

      breadcrumbs.push({
        title,
        href: index === paths.length - 1 ? undefined : currentPath
      });
    });

    return breadcrumbs;
  };

  const breadcrumbItems = generateBreadcrumbs();

  if (breadcrumbItems.length <= 1) {
    return null; // ホームページでは表示しない
  }

  return (
    <nav aria-label="パンくずリスト" className={cn("py-3 px-4 sm:px-6 lg:px-8", className)}>
      <ol className="flex items-center space-x-1 text-sm text-muted-foreground">
        {breadcrumbItems.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="mx-1 h-4 w-4" />
            )}
            {item.href ? (
              <Link
                href={item.href}
                className="hover:text-foreground transition-colors"
              >
                {index === 0 ? (
                  <Home className="h-4 w-4" />
                ) : (
                  item.title
                )}
              </Link>
            ) : (
              <span className="text-foreground font-medium">
                {item.title}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}