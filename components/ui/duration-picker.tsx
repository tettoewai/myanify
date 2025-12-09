"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface DurationPickerProps {
  value: number; // Duration in seconds
  onChange: (seconds: number) => void;
  className?: string;
  label?: string;
  required?: boolean;
}

export function DurationPicker({
  value,
  onChange,
  className,
  label = "Duration",
  required = false,
}: DurationPickerProps) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMinutes = parseInt(e.target.value) || 0;
    const newSeconds = seconds;
    onChange(newMinutes * 60 + newSeconds);
  };

  const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSeconds = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
    onChange(minutes * 60 + newSeconds);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label>
        {label} {required && "*"}
      </Label>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Input
            id="duration-minutes"
            type="number"
            min="0"
            value={minutes}
            onChange={handleMinutesChange}
            placeholder="0"
            className="text-center"
          />
          <p className="text-xs text-muted-foreground mt-1 text-center">
            Minutes
          </p>
        </div>
        <span className="text-2xl font-bold text-muted-foreground pt-6">:</span>
        <div className="flex-1">
          <Input
            id="duration-seconds"
            type="number"
            min="0"
            max="59"
            value={seconds}
            onChange={handleSecondsChange}
            placeholder="0"
            className="text-center"
          />
          <p className="text-xs text-muted-foreground mt-1 text-center">
            Seconds
          </p>
        </div>
      </div>
    </div>
  );
}
