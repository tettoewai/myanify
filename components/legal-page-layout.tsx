import Link from "next/link";
import { Music } from "lucide-react";
import type React from "react";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";

interface LegalPageLayoutProps {
  title: string;
  effectiveDate: string;
  children: React.ReactNode;
}

export function LegalPageLayout({
  title,
  effectiveDate,
  children,
}: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-foreground hover:opacity-80 transition"
          >
            <Music className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">Myanify</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground transition">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition">
              Privacy
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Effective Date: {effectiveDate}
          </p>
        </div>

        <article className="space-y-8">{children}</article>
      </main>

      <footer className="border-t border-border bg-card/50 py-8">
        <div className="container mx-auto px-4 sm:px-6 text-center text-sm text-muted-foreground">
          <p>
            Questions? Contact us at{" "}
            <a
              href={`mailto:${LEGAL_CONTACT_EMAIL}`}
              className="text-primary hover:underline"
            >
              {LEGAL_CONTACT_EMAIL}
            </a>
          </p>
          <p className="mt-2">
            © {new Date().getFullYear()} Myanify. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

interface LegalSectionProps {
  title: string;
  children: React.ReactNode;
}

export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-foreground mb-3">{title}</h2>
      <div className="space-y-3 text-muted-foreground leading-relaxed">
        {children}
      </div>
    </section>
  );
}
