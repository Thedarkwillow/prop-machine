import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

export default function LiveScoreboard() {
  const { data: allScores, isLoading } = useQuery<any>({
    queryKey: ["/api/scoreboard"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const renderGame = (game: any) => {
    const isLive = game.status === 'in_progress';
    const isFinal = game.status === 'final';
    
    return (
      <Card key={game.gameId} className={isLive ? 'border-primary' : ''}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold">{game.awayTeam}</span>
                <span className="text-2xl font-bold font-mono">{game.awayScore}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{game.homeTeam}</span>
                <span className="text-2xl font-bold font-mono">{game.homeScore}</span>
              </div>
            </div>
            <div className="text-right">
              {isLive && (
                <Badge variant="destructive" className="mb-2">
                  <Activity className="h-3 w-3 mr-1" />
                  LIVE
                </Badge>
              )}
              {isFinal && (
                <Badge variant="secondary" className="mb-2">
                  FINAL
                </Badge>
              )}
              {!isLive && !isFinal && (
                <Badge variant="outline" className="mb-2">
                  <Clock className="h-3 w-3 mr-1" />
                  Upcoming
                </Badge>
              )}
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(game.gameTime), { addSuffix: true })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Live Scoreboard</h1>
          <p className="text-muted-foreground">Real-time scores across all sports</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Live Scoreboard</h1>
          <p className="text-muted-foreground">Real-time scores across all sports</p>
        </div>
        <Badge variant="outline">
          Auto-refreshing every 30s
        </Badge>
      </div>

      <Tabs defaultValue="NBA" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="NBA" data-testid="tab-nba">NBA</TabsTrigger>
          <TabsTrigger value="NHL" data-testid="tab-nhl">NHL</TabsTrigger>
          <TabsTrigger value="NFL" data-testid="tab-nfl">NFL</TabsTrigger>
          <TabsTrigger value="MLB" data-testid="tab-mlb">MLB</TabsTrigger>
        </TabsList>

        <TabsContent value="NBA" className="space-y-3">
          {allScores?.NBA && allScores.NBA.length > 0 ? (
            allScores.NBA.map(renderGame)
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No NBA games today
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="NHL" className="space-y-3">
          {allScores?.NHL && allScores.NHL.length > 0 ? (
            allScores.NHL.map(renderGame)
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No NHL games today
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="NFL" className="space-y-3">
          {allScores?.NFL && allScores.NFL.length > 0 ? (
            allScores.NFL.map(renderGame)
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No NFL games today
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="MLB" className="space-y-3">
          {allScores?.MLB && allScores.MLB.length > 0 ? (
            allScores.MLB.map(renderGame)
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No MLB games today
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
