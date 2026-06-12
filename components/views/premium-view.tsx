"use client";

import {
  Crown,
  Check,
  Music,
  Download,
  Ban,
  Headphones,
  Sparkles,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface PremiumViewProps {
  isPremium: boolean;
}

export function PremiumView({ isPremium }: PremiumViewProps) {
  const features = [
    {
      icon: Ban,
      title: "Ad-free listening",
      description: "Enjoy music without interruptions",
    },
    {
      icon: Download,
      title: "Offline mode",
      description: "Download songs and listen anywhere",
    },
    {
      icon: Headphones,
      title: "High quality audio",
      description: "Crystal clear 320kbps streaming",
    },
    {
      icon: Music,
      title: "Unlimited skips",
      description: "Skip as many songs as you want",
    },
    {
      icon: Sparkles,
      title: "Exclusive content",
      description: "Access premium-only releases",
    },
  ];

  const plans = [
    {
      name: "Individual",
      price: "5,000",
      period: "month",
      description: "Perfect for one person",
      popular: true,
    },
    {
      name: "Duo",
      price: "8,000",
      period: "month",
      description: "For 2 accounts",
      popular: false,
    },
    {
      name: "Family",
      price: "12,000",
      period: "month",
      description: "Up to 6 accounts",
      popular: false,
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-12">
      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/30">
          <Crown className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">
          Premium is available on the Myanify mobile app
        </h1>
        <p className="text-xl text-muted-foreground text-balance">
          To enjoy ad-free listening, offline mode, and exclusive VIP features,
          install the Myanify mobile app on your device.
        </p>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
        {features.map((feature) => (
          <Card
            key={feature.title}
            className="p-6 text-center bg-card border-border"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <feature.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">
              {feature.description}
            </p>
          </Card>
        ))}
      </section>

      {/* CTA */}
      <section className="text-center py-8">
        <p className="text-muted-foreground mb-4">
          Premium features are only available in the Myanify mobile app.
        </p>
        <Button
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
        >
          <Smartphone className="w-5 h-5" />
          <span>Download mobile app</span>
        </Button>
      </section>
    </div>
  );
}
