"use client"

import { Crown, Check, Music, Download, Ban, Headphones, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface PremiumViewProps {
  onUpgrade: () => void
  isPremium: boolean
}

export function PremiumView({ onUpgrade, isPremium }: PremiumViewProps) {
  const features = [
    { icon: Ban, title: "Ad-free listening", description: "Enjoy music without interruptions" },
    { icon: Download, title: "Offline mode", description: "Download songs and listen anywhere" },
    { icon: Headphones, title: "High quality audio", description: "Crystal clear 320kbps streaming" },
    { icon: Music, title: "Unlimited skips", description: "Skip as many songs as you want" },
    { icon: Sparkles, title: "Exclusive content", description: "Access premium-only releases" },
  ]

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
  ]

  if (isPremium) {
    return (
      <div className="p-6 md:p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
            <Crown className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-3">You're Premium!</h1>
          <p className="text-muted-foreground mb-6">
            Enjoy all the benefits of Myanify Premium. Thank you for your support!
          </p>
          <div className="grid gap-3">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-center gap-3 p-3 rounded-lg bg-card text-left">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="font-medium">{feature.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 space-y-12">
      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/30">
          <Crown className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">Upgrade to Myanify Premium</h1>
        <p className="text-xl text-muted-foreground text-balance">
          Experience Myanmar music like never before with ad-free listening, offline mode, and exclusive content
        </p>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
        {features.map((feature) => (
          <Card key={feature.title} className="p-6 text-center bg-card border-border">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <feature.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </Card>
        ))}
      </section>

      {/* Pricing */}
      <section className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">Choose Your Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`p-6 relative ${
                plan.popular ? "border-primary bg-primary/5 ring-2 ring-primary" : "border-border bg-card"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  Most Popular
                </span>
              )}
              <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
              <div className="mb-6">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground"> MMK/{plan.period}</span>
              </div>
              <Button
                className={`w-full ${plan.popular ? "bg-primary hover:bg-primary/90 text-primary-foreground" : ""}`}
                variant={plan.popular ? "default" : "outline"}
                onClick={onUpgrade}
              >
                Get Started
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-8">
        <p className="text-muted-foreground mb-4">Try Premium free for 7 days. Cancel anytime.</p>
        <Button
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
          onClick={onUpgrade}
        >
          Start Free Trial
        </Button>
      </section>
    </div>
  )
}
