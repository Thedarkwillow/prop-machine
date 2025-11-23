import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayerSearchDropdown, Player } from "@/components/PlayerSearchDropdown";

export default function PropComparison() {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [sport, setSport] = useState<"NBA" | "NHL" | "NFL" | "MLB">("NBA");

  useEffect(() => {
    setSelectedPlayer(null);
  }, [sport]);

  const { data: comparisons, isLoading } = useQuery<any[]>({
    queryKey: ['/api/prop-comparison/player', { player: selectedPlayer?.displayName || "", sport }],
    enabled: !!selectedPlayer,
  });

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Prop Comparison</h1>
        <p className="text-muted-foreground">
          Compare prop lines across platforms to find the best value
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Player Props</CardTitle>
          <CardDescription>Search for a player to compare their props across platforms</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Sport</label>
            <Select value={sport} onValueChange={(value: any) => setSport(value)}>
              <SelectTrigger data-testid="select-sport-prop">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NBA">NBA (Basketball)</SelectItem>
                <SelectItem value="NHL">NHL (Hockey)</SelectItem>
                <SelectItem value="NFL">NFL (Football)</SelectItem>
                <SelectItem value="MLB">MLB (Baseball)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Player</label>
            <PlayerSearchDropdown
              value={selectedPlayer}
              onChange={setSelectedPlayer}
              sport={sport}
              placeholder="Search for a player..."
              triggerTestId="button-player-prop-search"
              inputTestId="input-player-prop-search"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && comparisons && comparisons.length > 0 && (
        <div className="space-y-4">
          {comparisons.map((comparison, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {comparison.player} - {comparison.stat}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {comparison.recommendation}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Best Line</div>
                    <div className="text-2xl font-bold font-mono">{comparison.bestLine}</div>
                    {comparison.lineSpread >= 0.5 && (
                      <Badge variant={comparison.lineSpread >= 1.0 ? "default" : "secondary"}>
                        {comparison.lineSpread.toFixed(1)} point advantage
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {comparison.platforms.map((platform: any, i: number) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-3 rounded-md border ${
                        i === 0 ? 'bg-primary/5 border-primary' : ''
                      }`}
                      data-testid={`platform-${platform.platform}`}
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="font-semibold">{platform.platform}</div>
                          <div className="text-sm text-muted-foreground capitalize">
                            {platform.direction}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Line</div>
                          <div className="text-lg font-bold font-mono">{platform.line}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Confidence</div>
                          <div className="text-lg font-semibold">{platform.confidence}%</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">EV</div>
                          <div className={`text-lg font-semibold ${parseFloat(platform.ev) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {parseFloat(platform.ev) > 0 ? '+' : ''}{platform.ev}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && comparisons && comparisons.length === 0 && selectedPlayer && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No props found for "{selectedPlayer.displayName}"
          </CardContent>
        </Card>
      )}
    </div>
  );
}
