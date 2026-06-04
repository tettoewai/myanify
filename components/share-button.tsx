"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { shareContent, type SharePayload } from "@/lib/share";

interface ShareButtonProps {
  payload: SharePayload;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
  iconClassName?: string;
  label?: string;
}

export function ShareButton({
  payload,
  size = "icon",
  variant = "ghost",
  className,
  iconClassName,
  label,
}: ShareButtonProps) {
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={cn("rounded-full", className)}
      aria-label={label ?? "Share"}
      onClick={() => void shareContent(payload)}
    >
      <Share2 className={cn("w-5 h-5", iconClassName)} />
      {label && size !== "icon" ? (
        <span className="ml-2">{label}</span>
      ) : null}
    </Button>
  );
}
