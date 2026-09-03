"use client";

import React, { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Music,
  User,
  Send,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSongRequests } from "@/lib/swr";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

export default function RequestSongPage() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  const [songTitle, setSongTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    requests: songRequests,
    isLoading: requestsLoading,
    isError: requestsError,
    mutate: mutateRequests,
  } = useSongRequests();

  const handleSubmit = async () => {
    if (!songTitle.trim() || !artistName.trim()) {
      toast.error("Song title and artist name are required");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/song-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songTitle: songTitle.trim(),
          artistName: artistName.trim(),
          notes: notes.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit request");
      }
      toast.success("Song request submitted!");
      setSongTitle("");
      setArtistName("");
      setNotes("");
      await mutateRequests();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-full p-4 md:p-6 lg:p-8 pb-32">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-full p-4 md:p-6 lg:p-8 pb-32">
        <div className="max-w-2xl mx-auto">
          <Card className="border-border/60 shadow-sm">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <Music className="h-12 w-12 text-muted-foreground/30" />
              <div>
                <p className="font-semibold">Sign in to request songs</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You need to be signed in to submit song requests.
                </p>
              </div>
              <Button asChild className="rounded-full">
                <Link href="/login">Sign in</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-4 md:p-6 lg:p-8 pb-32">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back link + header */}
        <div className="space-y-4">
          <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2">
            <Link href="/settings">
              <ArrowLeft className="w-4 h-4" />
              Back to Settings
            </Link>
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Request a Song
            </h1>
            <p className="text-muted-foreground text-sm">
              Tell us what song you would like to see on Myanify
            </p>
          </div>
        </div>

        {/* Request form */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Send className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">New Request</CardTitle>
                <CardDescription className="text-xs">
                  Fill in the song details below
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="songTitle" className="text-sm font-medium">
                Song Title <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Music className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="songTitle"
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  className="pl-10"
                  placeholder="e.g. မိုးကြိုးပစ်"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="artistName" className="text-sm font-medium">
                Artist Name <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="artistName"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  className="pl-10"
                  placeholder="e.g. ရတနာမိုင်"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-sm font-medium">
                Notes <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional details (YouTube link, version, etc.)"
                rows={3}
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting || !songTitle.trim() || !artistName.trim()}
              className="gap-2 rounded-full"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {submitting ? "Submitting…" : "Submit Request"}
            </Button>
          </CardContent>
        </Card>

        {/* Request history */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Music className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Your Requests</CardTitle>
                <CardDescription className="text-xs">
                  Track the status of your song requests
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {requestsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : requestsError ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm text-muted-foreground">Failed to load requests</p>
                <Button variant="outline" size="sm" onClick={() => mutateRequests()} className="gap-2">
                  <RefreshCw className="w-3 h-3" /> Retry
                </Button>
              </div>
            ) : songRequests.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Music className="h-10 w-10 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">No requests yet</p>
                <p className="text-xs text-muted-foreground/70">
                  Submit your first song request above
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {songRequests.map((request: { id: string; songTitle: string; artistName: string; notes: string | null; status: string; createdAt: string }) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{request.songTitle}</p>
                      <p className="text-xs text-muted-foreground truncate">{request.artistName}</p>
                      {request.notes && (
                        <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{request.notes}</p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "ml-3 shrink-0",
                        request.status === "PENDING" && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                        request.status === "APPROVED" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                        request.status === "REJECTED" && "bg-destructive/10 text-destructive border-destructive/20",
                      )}
                    >
                      {request.status.charAt(0) + request.status.slice(1).toLowerCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
