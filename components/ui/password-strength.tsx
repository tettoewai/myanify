"use client";

import { useState, useEffect } from "react";

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const [strength, setStrength] = useState(0);

  useEffect(() => {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    setStrength(Math.min(score, 4));
  }, [password]);

  const colors = [
    "bg-red-500",
    "bg-yellow-500",
    "bg-orange-500",
    "bg-green-500",
  ];
  const labels = ["Weak", "Fair", "Good", "Strong"];

  if (!password) return null;

  return (
    <div className="space-y-1">
      <div className="flex gap-1 h-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`flex-1 rounded-full transition-colors ${i < strength ? colors[strength - 1] : "bg-muted"
              }`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Password strength: {labels[strength - 1] || "None"}
      </p>
    </div>
  );
}
