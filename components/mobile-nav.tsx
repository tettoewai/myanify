"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Search, Library, Download, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { path: "/home", label: "Home", icon: Home },
    { path: "/search", label: "Search", icon: Search },
    { path: "/library", label: "Library", icon: Library },
    { path: "/downloads", label: "Downloads", icon: Download },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === "/home") {
      return pathname === "/home";
    }
    return pathname.startsWith(path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-40 pb-safe">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[64px]",
              isActive(item.path) ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon
              className={cn("w-6 h-6", isActive(item.path) && "text-primary")}
            />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
