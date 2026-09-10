"use client";

import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import { toast } from "sonner";

function SpotifyIcon() {
  return (
    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 1C5.93 1 1 5.93 1 12s4.93 11 11 11 11-4.93 11-11S18.07 1 12 1Zm5.53 16.19a.75.75 0 0 1-1.03.25c-2.83-1.73-6.39-2.12-10.58-1.16a.75.75 0 1 1-.34-1.46c4.56-1.04 8.47-.59 11.7 1.33.35.21.46.68.25 1.04Zm1.47-3.08a.94.94 0 0 1-1.29.31c-3.24-1.98-8.18-2.55-12.01-1.4a.94.94 0 1 1-.54-1.8c4.36-1.32 9.81-.67 13.53 1.6.44.27.58.85.31 1.29Zm.13-3.2C15.24 8.59 8.82 8.35 5.1 9.49a1.13 1.13 0 1 1-.65-2.16c4.24-1.29 11.24-1.01 15.68 1.61a1.13 1.13 0 0 1-1 2c-.35-.21-.7-.41-1-.63Z"
      />
    </svg>
  );
}

export function SpotifySignInButton() {
  const handleSpotifySignIn = async () => {
    try {
      await signIn("spotify", {
        callbackUrl: "/auth/callback",
        redirect: true,
      });
    } catch {
      toast.error("An error occurred with Spotify sign-in. Please try again.");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleSpotifySignIn}
    >
      <SpotifyIcon />
      Continue with Spotify
    </Button>
  );
}
