"use client"

import { Home, Search, Library, Crown, Music2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { mockPlaylists } from "@/lib/mock-data"
import type { ViewType } from "./myanify-app"
import { cn } from "@/lib/utils"

interface SidebarProps {
  currentView: ViewType
  onNavigate: (view: ViewType, id?: string) => void
  isPremium: boolean
}

export function Sidebar({ currentView, onNavigate, isPremium }: SidebarProps) {
  const navItems = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "search" as const, label: "Search", icon: Search },
    { id: "library" as const, label: "Your Library", icon: Library },
  ]

  return (
    <aside className="w-64 h-full bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <button onClick={() => onNavigate("home")} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg group-hover:shadow-primary/20 transition-shadow">
            <Music2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground tracking-tight">Myanify</span>
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="p-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
              currentView === item.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Premium Upgrade */}
      {!isPremium && (
        <div className="mx-4 p-4 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm">Go Premium</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Ad-free music, offline mode, and exclusive content</p>
          <Button
            size="sm"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => onNavigate("premium")}
          >
            Upgrade Now
          </Button>
        </div>
      )}

      {/* Playlists */}
      <div className="flex-1 flex flex-col mt-4 border-t border-border">
        <div className="p-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">Your Playlists</span>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1 pb-4">
            {mockPlaylists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => onNavigate("playlist", playlist.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                  currentView === "playlist"
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                )}
              >
                <img
                  src={playlist.coverUrl || "/placeholder.svg"}
                  alt={playlist.name}
                  className="w-10 h-10 rounded-md object-cover"
                />
                <div className="text-left truncate">
                  <p className="font-medium truncate">{playlist.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{playlist.songs.length} songs</p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
    </aside>
  )
}
