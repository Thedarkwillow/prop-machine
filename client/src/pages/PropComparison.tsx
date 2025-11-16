import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PropComparison() {
  const [playerName, setPlayerName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: comparisons, isLoading } = useQuery<any[]>({
    queryKey: ["/api/prop-comparison/player", searchQuery],
    enabled: searchQuery.length > 0,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(playerName);
  };

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
          <CardDescription>Enter a player name to compare their props across platforms</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Player name (e.g., Connor McDavid)"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              data-testid="input-player-search"
            />
            <Button type="submit" data-testid="button-search">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </form>
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

      {!isLoading && comparisons && comparisons.length === 0 && searchQuery && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No props found for "{searchQuery}"
          </CardContent>
        </Card>
      )}
    </div>
  );
}
