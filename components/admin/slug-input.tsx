"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SlugInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onGenerate?: () => void;
  required?: boolean;
}

export function SlugInput({
  id = "slug",
  value,
  onChange,
  onGenerate,
  required,
}: SlugInputProps) {
  return (
    <div>
      <Label htmlFor={id}>URL slug {required ? "*" : ""}</Label>
      <div className="mt-2 flex gap-2">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder="my-artist-name"
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          title="Lowercase letters, numbers, and hyphens only"
        />
        {onGenerate ? (
          <Button type="button" variant="outline" onClick={onGenerate}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Generate
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Used in public URLs, e.g. /artist/{value || "your-slug"}
      </p>
    </div>
  );
}
