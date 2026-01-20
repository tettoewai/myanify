"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Music,
  Users,
  User,
  Tag,
  Megaphone,
  Settings,
  Disc,
  CreditCard,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOutConfirmButton } from "@/components/sign-out-confirm-button";

const navItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/songs", label: "Songs", icon: Music },
  { path: "/admin/artists", label: "Artists", icon: Users },
  { path: "/admin/albums", label: "Albums", icon: Disc },
  { path: "/admin/genres", label: "Genres", icon: Tag },
  { path: "/admin/plans", label: "Plans", icon: CreditCard },
  { path: "/admin/payment-methods", label: "Payment Methods", icon: Wallet },
  { path: "/admin/ads", label: "Ads", icon: Megaphone },
  { path: "/admin/users", label: "Users", icon: User },
  { path: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(path);
  };

  return (
    <aside className="w-64 h-full bg-card border-r border-border flex flex-col">
      <nav className="p-4 space-y-1 flex-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
              isActive(item.path)
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <SignOutConfirmButton fullWidth variant="outline" />
      </div>
    </aside>
  );
}
