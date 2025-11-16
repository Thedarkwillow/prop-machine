import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlayerComparison() {
  const [player1Name, setPlayer1Name] = useState("");
  const [player2Name, setPlayer2Name] = useState("");
  const [searchKey, setSearchKey] = useState("");

  const { data: comparison, isLoading } = useQuery<any>({
    queryKey: ["/api/player-comparison", searchKey],
    enabled: searchKey.length > 0,
  });

  const handleCompare = (e: React.FormEvent) => {
    e.preventDefault();
    if (player1Name && player2Name) {
      setSearchKey(`${player1Name}/${player2Name}`);
    }
  };

  const getDiffIcon = (diff: number) => {
    if (diff > 1) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (diff < -1) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getDiffColor = (diff: number) => {
    if (diff > 1) return "text-green-600 dark:text-green-400";
    if (diff < -1) return "text-red-600 dark:text-red-400";
    return "text-muted-foreground";
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Users className="h-8 w-8" />
          Player Comparison
        </h1>
        <p className="text-muted-foreground">
          Compare NBA player stats side-by-side using BallDontLie data
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Players to Compare</CardTitle>
          <CardDescription>Currently supports NBA players only</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCompare} className="flex gap-2">
            <Input
              placeholder="Player 1 (e.g., LeBron James)"
              value={player1Name}
              onChange={(e) => setPlayer1Name(e.target.value)}
              data-testid="input-player1"
            />
            <Input
              placeholder="Player 2 (e.g., Kevin Durant)"
              value={player2Name}
              onChange={(e) => setPlayer2Name(e.target.value)}
              data-testid="input-player2"
            />
            <Button type="submit" disabled={!player1Name || !player2Name} data-testid="button-compare">
              <Users className="h-4 w-4 mr-2" />
              Compare
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && comparison && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className={comparison.comparison.betterScorer === 'player1' ? 'border-primary' : ''}>
              <CardHeader>
                <CardTitle>{comparison.player1.name}</CardTitle>
                <CardDescription>{comparison.player1.team}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">PPG</div>
                    <div className="text-2xl font-bold font-mono">{comparison.player1.stats.ppg.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">RPG</div>
                    <div className="text-2xl font-bold font-mono">{comparison.player1.stats.rpg.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">APG</div>
                    <div className="text-2xl font-bold font-mono">{comparison.player1.stats.apg.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">FG%</div>
                    <div className="text-2xl font-bold font-mono">{(comparison.player1.stats.fg_pct * 100).toFixed(1)}%</div>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground">Games Played</div>
                  <div className="text-lg font-semibold">{comparison.player1.stats.gamesPlayed}</div>
                </div>
              </CardContent>
            </Card>

            <Card className={comparison.comparison.betterScorer === 'player2' ? 'border-primary' : ''}>
              <CardHeader>
                <CardTitle>{comparison.player2.name}</CardTitle>
                <CardDescription>{comparison.player2.team}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">PPG</div>
                    <div className="text-2xl font-bold font-mono">{comparison.player2.stats.ppg.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">RPG</div>
                    <div className="text-2xl font-bold font-mono">{comparison.player2.stats.rpg.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">APG</div>
                    <div className="text-2xl font-bold font-mono">{comparison.player2.stats.apg.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">FG%</div>
                    <div className="text-2xl font-bold font-mono">{(comparison.player2.stats.fg_pct * 100).toFixed(1)}%</div>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground">Games Played</div>
                  <div className="text-lg font-semibold">{comparison.player2.stats.gamesPlayed}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Head-to-Head Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-md border">
                  <div className="flex items-center gap-2">
                    {getDiffIcon(comparison.comparison.ppgDiff)}
                    <span className="font-medium">Points Per Game</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="font-mono">{comparison.player1.stats.ppg.toFixed(1)}</span>
                    <Badge variant="secondary">
                      {comparison.comparison.ppgDiff > 0 ? '+' : ''}{comparison.comparison.ppgDiff.toFixed(1)}
                    </Badge>
                    <span className="font-mono">{comparison.player2.stats.ppg.toFixed(1)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-md border">
                  <div className="flex items-center gap-2">
                    {getDiffIcon(comparison.comparison.rpgDiff)}
                    <span className="font-medium">Rebounds Per Game</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="font-mono">{comparison.player1.stats.rpg.toFixed(1)}</span>
                    <Badge variant="secondary">
                      {comparison.comparison.rpgDiff > 0 ? '+' : ''}{comparison.comparison.rpgDiff.toFixed(1)}
                    </Badge>
                    <span className="font-mono">{comparison.player2.stats.rpg.toFixed(1)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-md border">
                  <div className="flex items-center gap-2">
                    {getDiffIcon(comparison.comparison.apgDiff)}
                    <span className="font-medium">Assists Per Game</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="font-mono">{comparison.player1.stats.apg.toFixed(1)}</span>
                    <Badge variant="secondary">
                      {comparison.comparison.apgDiff > 0 ? '+' : ''}{comparison.comparison.apgDiff.toFixed(1)}
                    </Badge>
                    <span className="font-mono">{comparison.player2.stats.apg.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading && !comparison && searchKey && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Failed to compare players. Make sure player names are spelled correctly.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
