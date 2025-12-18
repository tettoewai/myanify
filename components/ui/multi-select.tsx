"use client";

import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select items...",
  className,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const selectedOptions = React.useMemo(
    () => options.filter((option) => value.includes(option.value)),
    [options, value]
  );

  const handleToggle = React.useCallback(
    (optionValue: string) => {
      if (value.includes(optionValue)) {
        onChange(value.filter((v) => v !== optionValue));
      } else {
        onChange([...value, optionValue]);
      }
    },
    [value, onChange]
  );

  const handleRemove = React.useCallback(
    (optionValue: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onChange(value.filter((v) => v !== optionValue));
    },
    [value, onChange]
  );

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className={cn(
          "w-full justify-between h-auto min-h-9 px-3 py-2",
          !value.length && "text-muted-foreground"
        )}
        onClick={() => setOpen(!open)}
        disabled={disabled}
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {selectedOptions.length === 0 ? (
            <span>{placeholder}</span>
          ) : (
            selectedOptions.map((option) => (
              <span
                key={option.value}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs"
              >
                {option.label}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleRemove(option.value, e)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleRemove(option.value, e as any);
                    }
                  }}
                  className="ml-1 hover:bg-primary/20 rounded-full p-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <X className="h-3 w-3" />
                </span>
              </span>
            ))
          )}
        </div>
        <ChevronDown
          className={cn(
            "ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform",
            open && "rotate-180"
          )}
        />
      </Button>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md">
          <div className="max-h-60 overflow-y-auto p-1">
            {options.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                No options available
              </div>
            ) : (
              <div className="space-y-1">
                {options.map((option) => {
                  const isSelected = value.includes(option.value);
                  return (
                    <div
                      key={option.value}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer hover:bg-accent",
                        isSelected && "bg-accent"
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        handleToggle(option.value);
                      }}
                    >
                      <div
                        className={cn(
                          "h-4 w-4 shrink-0 rounded-sm border border-primary flex items-center justify-center",
                          isSelected && "bg-primary text-primary-foreground"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <Label
                        className={cn(
                          "flex-1 cursor-pointer text-sm font-normal",
                          isSelected && "font-medium"
                        )}
                      >
                        {option.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
