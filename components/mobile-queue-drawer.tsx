"use client";

import { Drawer } from "vaul";
import { GripVertical, ListMusic, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePlayer } from "@/components/player-context";
import type { QueueItem } from "@/lib/types";
import { cn, getSongCoverUrl } from "@/lib/utils";
import Image from "next/image";

interface MobileQueueDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function QueueRow({
  item,
  canReorder,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  item: QueueItem;
  canReorder: boolean;
  onRemove: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}) {
  const isSuggested = item.source === "radio" || item.source === "autoplay";

  return (
    <div
      draggable={canReorder}
      onDragStart={canReorder ? onDragStart : undefined}
      onDragOver={canReorder ? onDragOver : undefined}
      onDrop={canReorder ? onDrop : undefined}
      className={cn(
        "flex items-center gap-3 py-3 px-4 rounded-lg group",
        canReorder && "cursor-grab active:cursor-grabbing",
        isSuggested && "opacity-90",
      )}
    >
      {canReorder ? (
        <GripVertical className="w-5 h-5 text-muted-foreground shrink-0" />
      ) : (
        <Sparkles className="w-5 h-5 text-primary/70 shrink-0" />
      )}
      <div className="relative w-12 h-12 rounded overflow-hidden shrink-0">
        <Image
          src={getSongCoverUrl(item.song)}
          alt=""
          fill
          className="object-cover"
          unoptimized
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium truncate">{item.song.title}</p>
        <p className="text-sm text-muted-foreground truncate">
          {item.song.artist}
          {isSuggested && <span className="text-primary/80"> · Suggested</span>}
        </p>
      </div>
      {canReorder && (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-10 w-10"
          onClick={onRemove}
          aria-label="Remove from queue"
        >
          <X className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}

export function MobileQueueDrawer({
  open,
  onOpenChange,
}: MobileQueueDrawerProps) {
  const {
    currentSong,
    upNext,
    removeFromQueue,
    reorderUpNext,
    clearQueue,
    radioMode,
    radioSeedSongId,
    isFetchingRadio,
  } = usePlayer();

  const userItems = upNext.filter(
    (i) => i.source !== "radio" && i.source !== "autoplay",
  );
  const suggestedItems = upNext.filter(
    (i) => i.source === "radio" || i.source === "autoplay",
  );

  const dragIndexRef = { current: -1 };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 z-[60]" />
        <Drawer.Title className="sr-only">Queue</Drawer.Title>
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[70] mx-auto rounded-t-2xl bg-background border-t border-border flex flex-col max-h-[85vh]">
          <div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-muted mt-3 mb-2" />
          <div className="flex items-center justify-between px-4 pt-2 pb-2">
            <div className="flex items-center gap-2">
              <ListMusic className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Queue</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearQueue()}
              disabled={upNext.length === 0}
              className="text-muted-foreground"
            >
              Clear
            </Button>
          </div>

          <ScrollArea className="flex-1 px-2 pb-6">
            {currentSong && (
              <div className="px-2 py-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Now Playing
                </p>
                <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-primary/10 ring-1 ring-primary/20">
                  <div className="relative w-12 h-12 rounded overflow-hidden shrink-0">
                    <Image
                      src={getSongCoverUrl(currentSong)}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium truncate">
                      {currentSong.title}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {currentSong.artist}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {userItems.length > 0 && (
              <div className="px-2 py-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Your Queue
                </p>
                {userItems.map((item, idx) => {
                  const globalIndex = upNext.findIndex(
                    (u) => u.qid === item.qid,
                  );
                  return (
                    <QueueRow
                      key={item.qid}
                      item={item}
                      canReorder
                      onRemove={() => removeFromQueue(item.qid)}
                      onDragStart={() => {
                        dragIndexRef.current = globalIndex;
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (
                          dragIndexRef.current >= 0 &&
                          dragIndexRef.current !== globalIndex
                        ) {
                          reorderUpNext(dragIndexRef.current, globalIndex);
                        }
                        dragIndexRef.current = -1;
                      }}
                    />
                  );
                })}
              </div>
            )}

            {suggestedItems.length > 0 && (
              <div className="px-2 py-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Suggested
                </p>
                {suggestedItems.map((item) => (
                  <QueueRow
                    key={item.qid}
                    item={item}
                    canReorder={false}
                    onRemove={() => removeFromQueue(item.qid)}
                    onDragStart={() => {}}
                    onDragOver={() => {}}
                    onDrop={() => {}}
                  />
                ))}
              </div>
            )}

            {radioMode && radioSeedSongId && (
              <p className="px-4 text-xs text-muted-foreground pb-2">
                Smart Radio is on
                {isFetchingRadio ? " · Loading…" : ""}
              </p>
            )}

            {upNext.length === 0 && !currentSong && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Queue is empty. Play a song to get started.
              </p>
            )}
            {upNext.length === 0 && currentSong && !radioMode && (
              <p className="text-center text-sm text-muted-foreground py-6">
                Nothing else queued. Turn on Smart Radio for endless playback.
              </p>
            )}
          </ScrollArea>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
