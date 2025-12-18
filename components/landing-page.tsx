"use client";

import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Check,
  FileText,
  Headphones,
  Heart,
  Music,
  Play,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function LandingPageContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const loginUrl = callbackUrl
    ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/login";
  const features = [
    {
      icon: FileText,
      title: "Synchronized Lyrics",
      description:
        "Experience music like never before with real-time synchronized lyrics that highlight as the song plays.",
    },
    {
      icon: Search,
      title: "Discover Music",
      description:
        "Explore thousands of Myanmar songs, from traditional classics to modern hits. Find your next favorite artist.",
    },
    {
      icon: Heart,
      title: "Create Playlists",
      description:
        "Build your personal music collection. Create and organize playlists for every mood and occasion.",
    },
    {
      icon: Headphones,
      title: "High Quality Audio",
      description:
        "Enjoy crystal-clear audio streaming. Every song is optimized for the best listening experience.",
    },
    {
      icon: Music,
      title: "Rich Music Library",
      description:
        "Access a vast collection of Myanmar music spanning genres, decades, and artists.",
    },
    {
      icon: Sparkles,
      title: "Premium Features",
      description:
        "Unlock ad-free listening, offline mode, and exclusive content with Myanify Premium.",
    },
  ];

  const stats = [
    { value: "10K+", label: "Songs" },
    { value: "500+", label: "Artists" },
    { value: "50+", label: "Genres" },
    { value: "25K+", label: "Active Listeners" },
  ];

  const testimonials = [
    {
      name: "Aung Min",
      role: "Music Lover",
      content:
        "Myanify has transformed how I experience Myanmar music. The synchronized lyrics feature is incredible!",
      rating: 5,
    },
    {
      name: "Thiri Win",
      role: "Student",
      content:
        "Perfect for learning Myanmar language through music. The lyrics sync perfectly with the songs.",
      rating: 5,
    },
    {
      name: "Ko Zaw",
      role: "Musician",
      content:
        "As an artist, I love how Myanify showcases Myanmar music. The platform is beautifully designed.",
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-linear-to-br from-primary/20 via-background to-background pt-20 pb-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.1),transparent_50%)]" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Myanmar's Premier Music Platform
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Discover Myanmar's
              <br />
              <span className="bg-linear-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Musical Heritage
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Stream thousands of Myanmar songs with real-time synchronized
              lyrics. Experience traditional melodies and modern beats in one
              beautiful platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 px-8 py-6 text-lg"
                asChild
              >
                <Link href={loginUrl}>
                  <Play className="w-5 h-5 mr-2" />
                  Start Listening Free
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="px-8 py-6 text-lg border-2"
                asChild
              >
                <Link href={loginUrl}>
                  Explore Music
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-card/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to
              <br />
              <span className="text-primary">Enjoy Myanmar Music</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to enhance your music listening
              experience
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-8 rounded-2xl bg-background border border-border hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes and start enjoying Myanmar music
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "Sign Up Free",
                  description:
                    "Create your account in seconds. No credit card required.",
                },
                {
                  step: "02",
                  title: "Explore Music",
                  description:
                    "Browse genres, discover artists, and search for your favorite songs.",
                },
                {
                  step: "03",
                  title: "Start Listening",
                  description:
                    "Play songs with synchronized lyrics and create your playlists.",
                },
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <div className="text-6xl font-bold text-primary/20 mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-card/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Loved by Music Lovers
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands of users enjoying Myanmar music on Myanify
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="p-8 rounded-2xl bg-background border border-border"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 fill-primary text-primary"
                    />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  "{testimonial.content}"
                </p>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-primary/20 via-primary/10 to-transparent" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Start Your
              <br />
              <span className="text-primary">Musical Journey?</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Join thousands of music lovers discovering Myanmar's rich musical
              heritage. Start listening for free today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 px-10 py-7 text-lg"
                asChild
              >
                <Link href={loginUrl}>
                  <Play className="w-5 h-5 mr-2" />
                  Get Started Free
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="px-10 py-7 text-lg border-2"
                asChild
              >
                <Link href={loginUrl}>Learn More</Link>
              </Button>
            </div>
            <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-primary" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-primary" />
                <span>Free forever plan available</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-primary" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Music className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold">Myanify</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link
                href={loginUrl}
                className="hover:text-foreground transition"
              >
                Sign In
              </Link>
              <Link
                href={loginUrl}
                className="hover:text-foreground transition"
              >
                Get Started
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>© 2024 Myanify. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
