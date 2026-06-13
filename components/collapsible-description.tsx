"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const LINE_CLAMP_CLASSES = {
  1: "line-clamp-1",
  2: "line-clamp-2",
  3: "line-clamp-3",
  4: "line-clamp-4",
  5: "line-clamp-5",
  6: "line-clamp-6",
} as const;

type LineClamp = keyof typeof LINE_CLAMP_CLASSES;

interface CollapsibleDescriptionProps {
  description?: string | null;
  lines?: LineClamp;
  className?: string;
  buttonClassName?: string;
  descriptionClassName?: string;
  preserveLineBreaks?: boolean;
  /** Optional id for the description element (used for aria-controls). */
  id?: string;
}

export function CollapsibleDescription({
  description,
  lines = 2,
  className,
  buttonClassName,
  descriptionClassName,
  preserveLineBreaks = true,
  id,
}: CollapsibleDescriptionProps) {
  const generatedId = useId();
  const descriptionId = id ?? generatedId;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el || !description || isExpanded) return;

    const checkOverflow = () => {
      setIsOverflowing(el.scrollHeight > el.clientHeight + 1);
    };

    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [description, lines, isExpanded]);

  if (!description) return null;

  const showToggle = isExpanded || isOverflowing;

  return (
    <div className={cn("", className)}>
      <p
        id={descriptionId}
        ref={textRef}
        className={cn(
          "text-sm md:text-base text-muted-foreground/90 transition-all duration-300",
          preserveLineBreaks && "whitespace-pre-line",
          !isExpanded && LINE_CLAMP_CLASSES[lines],
          descriptionClassName,
        )}
      >
        {description}
      </p>
      {showToggle && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "inline-flex items-center gap-1 text-primary hover:text-primary/80 text-sm font-medium mt-1 transition-colors",
            buttonClassName,
          )}
          aria-expanded={isExpanded}
          aria-controls={descriptionId}
          aria-label={isExpanded ? "Show less" : "Show more"}
        >
          {isExpanded ? (
            <>
              See less
              <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              See more
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
