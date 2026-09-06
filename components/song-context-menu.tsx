"use client";

import type { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { shareContent } from "@/lib/share";
import { usePlayer } from "@/components/player-context";
import { useDownloadSong } from "@/components/download-button";
import type { Song } from "@/lib/types";

interface SongContextMenuProps {
  song: Song;
  children: ReactNode;
}

export function SongContextMenu({ song, children }: SongContextMenuProps) {
  const {
    playSong,
    playNextInQueue,
    addToQueue,
    startRadio,
    isSongQueued,
  } = usePlayer();

  const queued = isSongQueued(song.id);
  const { track, start: startDownload } = useDownloadSong(song);

  const downloadLabel =
    !track || track.status === "cancelled"
      ? "Download for offline"
      : track.status === "queued"
        ? "Queued for download"
        : track.status === "downloading"
          ? `Downloading ${track.progress}%`
          : track.status === "completed"
            ? "Downloaded ✓"
            : track.status === "failed"
              ? "Retry download"
              : track.status === "evicted"
                ? "Download again"
                : "Download expired";

  const downloadDisabled =
    track?.status === "queued" ||
    track?.status === "downloading" ||
    track?.status === "expired";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem onSelect={() => playSong(song)}>
          Play Now
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => playNextInQueue(song)}>
          Play Next
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => addToQueue(song)}>
          Add to Queue
          {queued ? " (in queue)" : ""}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={downloadDisabled}
          onSelect={() => void startDownload()}
        >
          {downloadLabel}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => startRadio(song)}>
          Play Similar Radio
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() =>
            void shareContent({
              type: "song",
              slug: song.slug,
              title: song.title,
              text: `${song.title} by ${song.artist}`,
            })
          }
        >
          Share
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
