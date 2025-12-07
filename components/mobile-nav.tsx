"use client"

import { Home, Search, Library, User } from "lucide-react"
import type { ViewType } from "./myanify-app"
import { cn } from "@/lib/utils"

interface MobileNavProps {
  currentView: ViewType
  onNavigate: (view: ViewType) => void
}

export function MobileNav({ currentView, onNavigate }: MobileNavProps) {
  const navItems = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "search" as const, label: "Search", icon: Search },
    { id: "library" as const, label: "Library", icon: Library },
    { id: "premium" as const, label: "Premium", icon: User },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-40 pb-safe">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[64px]",
              currentView === item.id ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className={cn("w-6 h-6", currentView === item.id && "text-primary")} />
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
