import { useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export interface Player {
  id: string;
  fullName: string;
  displayName: string;
  team: { name: string };
  position?: { abbreviation?: string };
  sport: string;
}

interface PlayerSearchDropdownProps {
  value?: Player | null;
  onChange?: (player: Player | null) => void;
  sport?: string;
  placeholder?: string;
  triggerTestId?: string;
  inputTestId?: string;
}

export function PlayerSearchDropdown({ 
  value = null,
  onChange,
  sport = "All",
  placeholder = "Search players...",
  triggerTestId = "button-player-search",
  inputTestId = "input-player-search"
}: PlayerSearchDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const { data: players = [], isLoading } = useQuery<Player[]>({
    queryKey: [`/api/players/search?search=${search}&sport=${sport}`],
    enabled: search.length >= 2,
  });

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange?.(null);
    setSearch("");
  };

  return (
    <div className="w-full max-w-md">
      <Popover open={open} onOpenChange={setOpen}>
        <div className="flex gap-1">
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-between"
              data-testid={triggerTestId}
            >
              <div className="flex items-center flex-1 min-w-0">
                <Search className="mr-2 h-4 w-4 flex-shrink-0" />
                {value ? (
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className="font-medium truncate">{value.displayName}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {value.sport} - {value.team.name}
                    </span>
                  </div>
                ) : (
                  <span className="truncate">{placeholder}</span>
                )}
              </div>
              <ChevronDown className="ml-2 h-4 w-4 opacity-50 flex-shrink-0" />
            </Button>
          </PopoverTrigger>
          {value && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleClear}
              data-testid={`${triggerTestId}-clear`}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={placeholder}
              value={search}
              onValueChange={setSearch}
              data-testid={inputTestId}
            />
            <CommandList>
              <CommandEmpty>
                {isLoading ? "Searching..." : search.length < 2 ? "Type to search..." : "No players found"}
              </CommandEmpty>
              {players.length > 0 && (
                <CommandGroup>
                  {players.slice(0, 10).map((player) => (
                    <CommandItem
                      key={player.id}
                      value={player.id}
                      onSelect={() => {
                        onChange?.(player);
                        setOpen(false);
                        setSearch("");
                      }}
                      data-testid={`player-result-${player.id}`}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{player.displayName}</span>
                        <span className="text-sm text-muted-foreground">
                          {player.sport} - {player.team.name}
                        </span>
                      </div>
                      {player.position?.abbreviation && (
                        <Badge variant="secondary" className="ml-2">
                          {player.position.abbreviation}
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {players.length > 10 && (
                <div className="p-2 text-center border-t">
                  <Button variant="ghost" size="sm" className="text-xs">
                    More suggestions ({players.length - 10})
                  </Button>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
