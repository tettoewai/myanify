import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ListMusic } from "lucide-react";

export default function PlaylistNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-full gap-6 p-8 text-center">
      <ListMusic className="w-16 h-16 text-muted-foreground" />
      <div>
        <h1 className="text-2xl font-bold mb-2">Playlist Not Found</h1>
        <p className="text-muted-foreground">
          This playlist doesn&apos;t exist or is private.
        </p>
      </div>
      <Button asChild>
        <Link href="/home">Back to Home</Link>
      </Button>
    </div>
  );
}
