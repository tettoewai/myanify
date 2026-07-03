"use client";

import * as React from "react";
import { useArtists } from "@/lib/swr";
import {
  Combobox,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
} from "@/components/ui/combobox";
import { Loader2 } from "lucide-react";

interface Artist {
  id: string;
  name: string;
  englishName?: string | null;
}

interface ArtistComboboxProps {
  value: string[];
  onChange: (value: string[]) => void;
  initialArtists?: Artist[];
  placeholder?: string;
}

export function ArtistCombobox({
  value,
  onChange,
  initialArtists = [],
  placeholder = "Search artists...",
}: ArtistComboboxProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedArtists, setSelectedArtists] = React.useState<Artist[]>(initialArtists);

  // Clear selected artists if value is empty
  React.useEffect(() => {
    if (value.length === 0 && selectedArtists.length > 0) {
      setSelectedArtists([]);
    }
  }, [value, selectedArtists.length]);

  // Initialize selected artists on first load (e.g. edit page)
  React.useEffect(() => {
    if (initialArtists.length > 0 && selectedArtists.length === 0 && value.length > 0) {
      setSelectedArtists(initialArtists.filter((a) => value.includes(a.id)));
    }
  }, [initialArtists, value, selectedArtists.length]);

  // Debounce search query
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(inputValue);
    }, 300);
    return () => clearTimeout(handler);
  }, [inputValue]);

  const { artists, isLoading } = useArtists({
    search: searchQuery,
    limit: 10,
  });

  const handleValueChange = (newSelectedArtists: Artist[]) => {
    setSelectedArtists(newSelectedArtists);
    onChange(newSelectedArtists.map((a) => a.id));
  };

  return (
    <Combobox
      multiple
      value={selectedArtists}
      onValueChange={handleValueChange as any}
      onInputValueChange={(val) => setInputValue(val)}
      inputValue={inputValue}
      isItemEqualToValue={(item: Artist, val: Artist) => item.id === val.id}
      itemToStringLabel={(item: Artist) => item.name}
    >
      <ComboboxChips className="min-h-10 w-full flex-wrap">
        {selectedArtists.map((artist) => (
          <ComboboxChip key={artist.id}>
            {artist.name}
          </ComboboxChip>
        ))}
        <ComboboxChipsInput
          placeholder={selectedArtists.length === 0 ? placeholder : ""}
          className="flex-1 bg-transparent border-none outline-none min-w-[120px] text-sm py-1.5"
        />
      </ComboboxChips>

      <ComboboxContent align="start" className="w-[--anchor-width] z-50">
        <ComboboxList>
          {isLoading && artists.length === 0 ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : null}

          <ComboboxEmpty>
            {isLoading ? "Searching..." : "No artists found."}
          </ComboboxEmpty>

          {artists.map((artist) => (
            <ComboboxItem key={artist.id} value={artist}>
              <div className="flex flex-col">
                <span className="font-medium text-sm">{artist.name}</span>
                {artist.englishName && artist.englishName !== artist.name && (
                  <span className="text-xs text-muted-foreground">
                    {artist.englishName}
                  </span>
                )}
              </div>
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
