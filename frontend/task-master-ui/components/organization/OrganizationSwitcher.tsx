"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, Plus, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api, Organization } from "@/lib/api"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface OrganizationSwitcherProps {
  className?: string
}

export function OrganizationSwitcher({ className }: OrganizationSwitcherProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadOrganizations()
  }, [])

  const loadOrganizations = async () => {
    try {
      setLoading(true)
      const { data } = await api.getOrganizationsWrapped()
      if (data) {
        setOrganizations(data)
        // Get current org from localStorage or use first org
        const currentOrgId = localStorage.getItem("currentOrgId")
        const current = data.find(org => org.id === currentOrgId) || data[0]
        if (current) {
          setCurrentOrg(current)
          localStorage.setItem("currentOrgId", current.id)
        }
      }
    } catch (error) {
      console.error("Failed to load organizations:", error)
      toast.error("組織の読み込みに失敗しました")
    } finally {
      setLoading(false)
    }
  }

  const switchOrganization = async (org: Organization) => {
    try {
      setCurrentOrg(org)
      localStorage.setItem("currentOrgId", org.id)
      
      // Reload the page to refresh context
      window.location.reload()
    } catch (error) {
      console.error("Failed to switch organization:", error)
      toast.error("組織の切り替えに失敗しました")
    }
  }

  const createNewOrganization = () => {
    router.push("/settings/organization/new")
  }

  if (loading) {
    return (
      <div className={cn("h-10 w-48 bg-gray-100 animate-pulse rounded-md", className)} />
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "justify-between",
            !currentOrg && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {currentOrg?.name || "組織を選択"}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[250px]">
        {organizations.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            まだ組織がありません
          </div>
        ) : (
          organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onSelect={() => switchOrganization(org)}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{org.name}</span>
                    {org.role && (
                      <span className="text-xs text-muted-foreground">
                        {org.role === 'admin' ? '管理者' : 'メンバー'}
                      </span>
                    )}
                  </div>
                </div>
                {currentOrg?.id === org.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={createNewOrganization} className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          新しい組織を作成
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}