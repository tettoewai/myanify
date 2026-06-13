"use client";

import { CreatePlaylistDialog } from "@/components/create-playlist-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePlaylists } from "@/lib/swr";
import { cn } from "@/lib/utils";
import {
  Home,
  LayoutDashboard,
  Library,
  Music2,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { playlists } = usePlaylists({
    userId: session?.user?.id,
    enabled: !!session?.user?.id,
  });

  const navItems = [
    { path: "/home", label: "Home", icon: Home },
    { path: "/search", label: "Search", icon: Search },
    { path: "/library", label: "Your Library", icon: Library },
  ];

  const isActive = (path: string) => {
    if (path === "/home") {
      return pathname === "/home";
    }
    return pathname.startsWith(path);
  };

  return (
    <aside className="hidden md:flex w-64 h-full bg-card border-r border-border flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link href="/home" className="flex items-center gap-3 group">
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
                ? "bg-primary/80 text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Premium Upgrade */}
      {/* {!isPremium && (
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
      )} */}

      {/* Playlists */}
      <div className="flex-1 flex flex-col mt-4 border-t border-border">
        <div className="p-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">
            Your Playlists
          </span>
          <CreatePlaylistDialog
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                title="Create new playlist"
              >
                <Plus className="w-4 h-4" />
              </Button>
            }
          />
        </div>
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1">
            {playlists.map((playlist) => (
              <Link
                key={playlist.id}
                href={`/playlist/${playlist.slug}`}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                  pathname === `/playlist/${playlist.slug}`
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
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

      {/* Settings and Admin Switch */}
      <div className="p-4 border-t border-border space-y-2">
        <Link
          href="/settings"
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
            pathname === "/settings"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-accent",
          )}
        >
          <Settings className="w-5 h-5" />
          Settings
        </Link>
        {session?.user?.role === "ADMIN" && (
          <Link
            href="/admin"
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
              pathname.startsWith("/admin")
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
            Admin dashboard
          </Link>
        )}
      </div>
    </aside>
  );
}
