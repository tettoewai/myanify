"use client";

import { PlayerProvider } from "@/components/player-context";

export function ListenerLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PlayerProvider>{children}</PlayerProvider>;
}
