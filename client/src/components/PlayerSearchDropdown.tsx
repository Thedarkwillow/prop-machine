import { useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Player {
  id: string;
  fullName: string;
  displayName: string;
  team: { name: string };
  position?: { abbreviation?: string };
  sport: string;
}

export function PlayerSearchDropdown({ onPlayerSelect }: { onPlayerSelect?: (player: Player) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedSport, setSelectedSport] = useState("All");
  
  const { data: players = [], isLoading } = useQuery<Player[]>({
    queryKey: [`/api/players/search?search=${search}&sport=${selectedSport}`],
    enabled: search.length >= 2,
  });

  const sports = ["All", "NBA", "NHL", "NFL", "MLB"];

  return (
    <div className="w-full max-w-md">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            data-testid="button-player-search"
          >
            <Search className="mr-2 h-4 w-4" />
            Search players...
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="flex gap-2 p-2 border-b">
            {sports.map((sport) => (
              <Button
                key={sport}
                variant={selectedSport === sport ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedSport(sport)}
                data-testid={`button-sport-${sport.toLowerCase()}`}
                className="text-xs"
              >
                {sport}
              </Button>
            ))}
          </div>
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search players..."
              value={search}
              onValueChange={setSearch}
              data-testid="input-player-search"
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
                        onPlayerSelect?.(player);
                        setOpen(false);
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
