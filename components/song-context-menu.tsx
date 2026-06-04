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
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => startRadio(song)}>
          Play Similar Radio
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() =>
            void shareContent({
              type: "song",
              id: song.id,
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
