import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Music } from "lucide-react";

export default function SongNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-full gap-6 p-8 text-center">
      <Music className="w-16 h-16 text-muted-foreground" />
      <div>
        <h1 className="text-2xl font-bold mb-2">Song Not Found</h1>
        <p className="text-muted-foreground">
          This song doesn&apos;t exist or is no longer available.
        </p>
      </div>
      <Button asChild>
        <Link href="/home">Back to Home</Link>
      </Button>
    </div>
  );
}
