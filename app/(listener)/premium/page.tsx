"use client";

import { PremiumView } from "@/components/views/premium-view";
import { usePlayer } from "@/components/player-context";

export const dynamic = "force-dynamic";

export default function PremiumPage() {
  const { isPremium, upgradePremium } = usePlayer();

  return (
    <div className="min-h-full pb-32">
      <PremiumView onUpgrade={upgradePremium} isPremium={isPremium} />
    </div>
  );
}
