"use client";

import dynamic from "next/dynamic";
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

// Create a client-only version to avoid hydration mismatches
const SignOutConfirmButtonContent = dynamic(() => Promise.resolve(SignOutConfirmButtonComponent), {
  ssr: false,
});

interface SignOutConfirmButtonProps
  extends Omit<React.ComponentProps<typeof Button>, "onClick" | "children"> {
  callbackUrl?: string;
  label?: string;
  fullWidth?: boolean;
}

function SignOutConfirmButtonComponent({
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

// Export the client-only version to avoid hydration mismatches
export function SignOutConfirmButton(props: SignOutConfirmButtonProps) {
  return <SignOutConfirmButtonContent {...props} />;
}
