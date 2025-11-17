import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlayerComparison() {
  const [player1Name, setPlayer1Name] = useState("");
  const [player2Name, setPlayer2Name] = useState("");
  const [sport, setSport] = useState<"NBA" | "NHL" | "NFL">("NBA");
  const [searchKey, setSearchKey] = useState("");

  const { data: comparison, isLoading } = useQuery<any>({
    queryKey: ["/api/player-comparison", sport, searchKey],
    enabled: searchKey.length > 0,
  });

  const handleCompare = (e: React.FormEvent) => {
    e.preventDefault();
    if (player1Name && player2Name) {
      setSearchKey(`${player1Name}/${player2Name}/${sport}`);
    }
  };

  const getDiffIcon = (diff: number) => {
    if (diff > 1) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (diff < -1) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const renderNBAStats = (playerStats: any) => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="text-sm text-muted-foreground">PPG</div>
        <div className="text-2xl font-bold font-mono">{playerStats.ppg.toFixed(1)}</div>
      </div>
      <div>
        <div className="text-sm text-muted-foreground">RPG</div>
        <div className="text-2xl font-bold font-mono">{playerStats.rpg.toFixed(1)}</div>
      </div>
      <div>
        <div className="text-sm text-muted-foreground">APG</div>
        <div className="text-2xl font-bold font-mono">{playerStats.apg.toFixed(1)}</div>
      </div>
      <div>
        <div className="text-sm text-muted-foreground">FG%</div>
        <div className="text-2xl font-bold font-mono">{(playerStats.fg_pct * 100).toFixed(1)}%</div>
      </div>
    </div>
  );

  const renderNHLStats = (playerStats: any) => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="text-sm text-muted-foreground">Goals</div>
        <div className="text-2xl font-bold font-mono">{playerStats.goals}</div>
      </div>
      <div>
        <div className="text-sm text-muted-foreground">Assists</div>
        <div className="text-2xl font-bold font-mono">{playerStats.assists}</div>
      </div>
      <div>
        <div className="text-sm text-muted-foreground">Points</div>
        <div className="text-2xl font-bold font-mono">{playerStats.points}</div>
      </div>
      <div>
        <div className="text-sm text-muted-foreground">+/-</div>
        <div className="text-2xl font-bold font-mono">{playerStats.plusMinus > 0 ? '+' : ''}{playerStats.plusMinus}</div>
      </div>
    </div>
  );

  const renderNFLStats = (playerStats: any) => (
    <div className="grid grid-cols-2 gap-4">
      {(playerStats.passingYards > 0) && (
        <>
          <div>
            <div className="text-sm text-muted-foreground">Pass Yds</div>
            <div className="text-2xl font-bold font-mono">{playerStats.passingYards || 0}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Pass TDs</div>
            <div className="text-2xl font-bold font-mono">{playerStats.passingTDs || 0}</div>
          </div>
        </>
      )}
      {(playerStats.rushingYards > 0) && (
        <>
          <div>
            <div className="text-sm text-muted-foreground">Rush Yds</div>
            <div className="text-2xl font-bold font-mono">{playerStats.rushingYards || 0}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Rush TDs</div>
            <div className="text-2xl font-bold font-mono">{playerStats.rushingTDs || 0}</div>
          </div>
        </>
      )}
      {(playerStats.receivingYards > 0) && (
        <>
          <div>
            <div className="text-sm text-muted-foreground">Rec Yds</div>
            <div className="text-2xl font-bold font-mono">{playerStats.receivingYards || 0}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Rec TDs</div>
            <div className="text-2xl font-bold font-mono">{playerStats.receivingTDs || 0}</div>
          </div>
        </>
      )}
      {(playerStats.passingYards === 0 && playerStats.rushingYards === 0 && playerStats.receivingYards === 0) && (
        <div className="col-span-2 text-center text-muted-foreground">
          No statistics available for this player
        </div>
      )}
    </div>
  );

  const renderNBAComparison = (comp: any) => (
    <>
      <div className="flex items-center justify-between p-3 rounded-md border">
        <div className="flex items-center gap-2">
          {getDiffIcon(comp.ppgDiff)}
          <span className="font-medium">Points Per Game</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="font-mono">{comparison.player1.stats.ppg.toFixed(1)}</span>
          <Badge variant="secondary">
            {comp.ppgDiff > 0 ? '+' : ''}{comp.ppgDiff.toFixed(1)}
          </Badge>
          <span className="font-mono">{comparison.player2.stats.ppg.toFixed(1)}</span>
        </div>
      </div>
      <div className="flex items-center justify-between p-3 rounded-md border">
        <div className="flex items-center gap-2">
          {getDiffIcon(comp.rpgDiff)}
          <span className="font-medium">Rebounds Per Game</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="font-mono">{comparison.player1.stats.rpg.toFixed(1)}</span>
          <Badge variant="secondary">
            {comp.rpgDiff > 0 ? '+' : ''}{comp.rpgDiff.toFixed(1)}
          </Badge>
          <span className="font-mono">{comparison.player2.stats.rpg.toFixed(1)}</span>
        </div>
      </div>
      <div className="flex items-center justify-between p-3 rounded-md border">
        <div className="flex items-center gap-2">
          {getDiffIcon(comp.apgDiff)}
          <span className="font-medium">Assists Per Game</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="font-mono">{comparison.player1.stats.apg.toFixed(1)}</span>
          <Badge variant="secondary">
            {comp.apgDiff > 0 ? '+' : ''}{comp.apgDiff.toFixed(1)}
          </Badge>
          <span className="font-mono">{comparison.player2.stats.apg.toFixed(1)}</span>
        </div>
      </div>
    </>
  );

  const renderNHLComparison = (comp: any) => (
    <>
      <div className="flex items-center justify-between p-3 rounded-md border">
        <div className="flex items-center gap-2">
          {getDiffIcon(comp.goalsDiff)}
          <span className="font-medium">Goals</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="font-mono">{comparison.player1.stats.goals}</span>
          <Badge variant="secondary">
            {comp.goalsDiff > 0 ? '+' : ''}{comp.goalsDiff}
          </Badge>
          <span className="font-mono">{comparison.player2.stats.goals}</span>
        </div>
      </div>
      <div className="flex items-center justify-between p-3 rounded-md border">
        <div className="flex items-center gap-2">
          {getDiffIcon(comp.assistsDiff)}
          <span className="font-medium">Assists</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="font-mono">{comparison.player1.stats.assists}</span>
          <Badge variant="secondary">
            {comp.assistsDiff > 0 ? '+' : ''}{comp.assistsDiff}
          </Badge>
          <span className="font-mono">{comparison.player2.stats.assists}</span>
        </div>
      </div>
      <div className="flex items-center justify-between p-3 rounded-md border">
        <div className="flex items-center gap-2">
          {getDiffIcon(comp.pointsDiff)}
          <span className="font-medium">Total Points</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="font-mono">{comparison.player1.stats.points}</span>
          <Badge variant="secondary">
            {comp.pointsDiff > 0 ? '+' : ''}{comp.pointsDiff}
          </Badge>
          <span className="font-mono">{comparison.player2.stats.points}</span>
        </div>
      </div>
    </>
  );

  const renderNFLComparison = (comp: any) => (
    <>
      {comp.betterPasser && (
        <div className="flex items-center justify-between p-3 rounded-md border">
          <span className="font-medium">Passing</span>
          <Badge variant={comp.betterPasser === 'player1' ? 'default' : 'secondary'}>
            {comp.betterPasser === 'player1' ? comparison.player1.name : comparison.player2.name} leads
          </Badge>
        </div>
      )}
      {comp.betterRusher && (
        <div className="flex items-center justify-between p-3 rounded-md border">
          <span className="font-medium">Rushing</span>
          <Badge variant={comp.betterRusher === 'player1' ? 'default' : 'secondary'}>
            {comp.betterRusher === 'player1' ? comparison.player1.name : comparison.player2.name} leads
          </Badge>
        </div>
      )}
      {comp.betterReceiver && (
        <div className="flex items-center justify-between p-3 rounded-md border">
          <span className="font-medium">Receiving</span>
          <Badge variant={comp.betterReceiver === 'player1' ? 'default' : 'secondary'}>
            {comp.betterReceiver === 'player1' ? comparison.player1.name : comparison.player2.name} leads
          </Badge>
        </div>
      )}
    </>
  );

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Users className="h-8 w-8" />
          Player Comparison
        </h1>
        <p className="text-muted-foreground">
          Compare player stats side-by-side across NBA, NHL, and NFL
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Players to Compare</CardTitle>
          <CardDescription>Choose a sport and enter two player names</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCompare} className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Sport</label>
              <Select value={sport} onValueChange={(value: "NBA" | "NHL" | "NFL") => setSport(value)}>
                <SelectTrigger data-testid="select-sport">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NBA">NBA (Basketball)</SelectItem>
                  <SelectItem value="NHL">NHL (Hockey)</SelectItem>
                  <SelectItem value="NFL">NFL (Football)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder={sport === "NBA" ? "e.g., LeBron James" : sport === "NHL" ? "e.g., Connor McDavid" : "e.g., Patrick Mahomes"}
                value={player1Name}
                onChange={(e) => setPlayer1Name(e.target.value)}
                data-testid="input-player1"
              />
              <Input
                placeholder={sport === "NBA" ? "e.g., Kevin Durant" : sport === "NHL" ? "e.g., Auston Matthews" : "e.g., Josh Allen"}
                value={player2Name}
                onChange={(e) => setPlayer2Name(e.target.value)}
                data-testid="input-player2"
              />
              <Button type="submit" disabled={!player1Name || !player2Name} data-testid="button-compare">
                <Users className="h-4 w-4 mr-2" />
                Compare
              </Button>
            </div>
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
                {comparison.sport === "NBA" && renderNBAStats(comparison.player1.stats)}
                {comparison.sport === "NHL" && renderNHLStats(comparison.player1.stats)}
                {comparison.sport === "NFL" && renderNFLStats(comparison.player1.stats)}
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
                {comparison.sport === "NBA" && renderNBAStats(comparison.player2.stats)}
                {comparison.sport === "NHL" && renderNHLStats(comparison.player2.stats)}
                {comparison.sport === "NFL" && renderNFLStats(comparison.player2.stats)}
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
                {comparison.sport === "NBA" && renderNBAComparison(comparison.comparison)}
                {comparison.sport === "NHL" && renderNHLComparison(comparison.comparison)}
                {comparison.sport === "NFL" && renderNFLComparison(comparison.comparison)}
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
