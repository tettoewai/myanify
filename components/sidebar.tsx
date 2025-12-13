"use client";

import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Home,
  Search,
  Library,
  Crown,
  Music2,
  Plus,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePlaylists } from "@/lib/swr";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isPremium: boolean;
}

export function Sidebar({ isPremium }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { playlists } = usePlaylists({ isPublic: true });

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/search", label: "Search", icon: Search },
    { path: "/library", label: "Your Library", icon: Library },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  return (
    <aside className="hidden md:flex w-64 h-full bg-card border-r border-border flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg group-hover:shadow-primary/20 transition-shadow">
            <Music2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground tracking-tight">
            Myanify
          </span>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
              isActive(item.path)
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Premium Upgrade */}
      {!isPremium && (
        <div className="mx-4 p-4 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm">Go Premium</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Ad-free music, offline mode, and exclusive content
          </p>
          <Button
            size="sm"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => router.push("/premium")}
          >
            Upgrade Now
          </Button>
        </div>
      )}

      {/* Playlists */}
      <div className="flex-1 flex flex-col mt-4 border-t border-border">
        <div className="p-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">
            Your Playlists
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            title="Create new playlist"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1">
            {playlists.map((playlist) => (
              <Link
                key={playlist.id}
                href={`/playlist/${playlist.id}`}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                  pathname === `/playlist/${playlist.id}`
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <Image
                  src={playlist.coverUrl || "/placeholder.svg"}
                  alt={playlist.name}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-md object-cover"
                  unoptimized
                />
                <div className="text-left truncate">
                  <p className="font-medium truncate">{playlist.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {playlist.songs.length} songs
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Settings Link */}
      <div className="p-4 border-t border-border">
        <Link
          href="/settings"
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
            pathname === "/settings"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <Settings className="w-5 h-5" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
