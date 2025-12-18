"use client";

import React, { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SignOutConfirmButtonProps
  extends Omit<React.ComponentProps<typeof Button>, "onClick" | "children"> {
  callbackUrl?: string;
  label?: string;
  fullWidth?: boolean;
}

export function SignOutConfirmButton({
  callbackUrl = "/login",
  label = "Sign Out",
  fullWidth = false,
  className,
  variant = "default",
  ...buttonProps
}: SignOutConfirmButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          className={cn(fullWidth && "w-full", className)}
          {...buttonProps}
        >
          <LogOut className="w-4 h-4 mr-2" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign out</DialogTitle>
          <DialogDescription>
            You will need to sign in again to access your account. Do you want
            to continue?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={() => signOut({ callbackUrl })} autoFocus>
            Sign Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
