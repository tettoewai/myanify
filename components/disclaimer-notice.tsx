"use client";

import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

const DISCLAIMER_LEAD = "Non-commercial project. ";
const DISCLAIMER_TEXT =
  "Myanify is an independent, non-commercial project built solely for learning and portfolio purposes. It is completely free to use and not officially affiliated with any artists or record labels.";

interface DisclaimerNoticeProps {
  variant?: "banner" | "footer";
  className?: string;
}

/**
 * Non-commercial disclaimer notice.
 *
 * - `banner`: compact inline notice for dashboard / content areas.
 * - `footer`: centered footer-style notice with divider styling.
 *
 * High-visibility amber treatment (border + tinted background + bold lead)
 * so the notice reads instantly, while staying compact enough not to
 * disrupt the streaming experience.
 */
export function DisclaimerNotice({
  variant = "banner",
  className,
}: DisclaimerNoticeProps) {
  if (variant === "footer") {
    return (
      <footer
        role="note"
        aria-label="Non-commercial disclaimer"
        className={cn("w-full px-4 pb-6 md:px-6 lg:px-8", className)}
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-4 text-center shadow-sm sm:flex-row sm:text-left">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
            <Info
              className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
          </span>
          <p className="text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
            <strong className="font-semibold text-foreground">
              {DISCLAIMER_LEAD}
            </strong>
            {DISCLAIMER_TEXT}
          </p>
        </div>
      </footer>
    );
  }

  return (
    <div
      role="note"
      aria-label="Non-commercial disclaimer"
      className={cn(
        "flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-3.5 py-3 shadow-sm sm:items-center sm:px-4",
        className,
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
        <Info
          className="h-4 w-4 text-amber-600 dark:text-amber-400"
          aria-hidden="true"
        />
      </span>
      <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
        <strong className="font-semibold text-foreground">
          {DISCLAIMER_LEAD}
        </strong>
        {DISCLAIMER_TEXT}
      </p>
    </div>
  );
}

export const DISCLAIMER_NOTICE_TEXT = `${DISCLAIMER_LEAD}${DISCLAIMER_TEXT}`;
