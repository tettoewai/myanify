import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mic2 } from "lucide-react";

export default function ArtistNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-full gap-6 p-8 text-center">
      <Mic2 className="w-16 h-16 text-muted-foreground" />
      <div>
        <h1 className="text-2xl font-bold mb-2">Artist Not Found</h1>
        <p className="text-muted-foreground">
          This artist doesn&apos;t exist or has been removed.
        </p>
      </div>
      <Button asChild>
        <Link href="/home">Back to Home</Link>
      </Button>
    </div>
  );
}
