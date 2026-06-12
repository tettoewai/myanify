"use client";

import { PremiumView } from "@/components/views/premium-view";
import { usePlayer } from "@/components/player-context";

export default function PremiumPage() {
  const { isPremium } = usePlayer();

  return (
    <div className="min-h-full pb-32">
      <PremiumView isPremium={isPremium} />
    </div>
  );
}
