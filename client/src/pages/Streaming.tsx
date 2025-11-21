import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Activity, Play, Square, Radio } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ActiveStream {
  streamId: string;
  config: {
    sport: string;
    sportsbooks: string[];
  };
}

export default function Streaming() {
  const { toast } = useToast();
  const [selectedSport, setSelectedSport] = useState("basketball_nba");

  // Query active odds streams
  const { data: oddsStreams, isLoading: oddsLoading } = useQuery<{ streams: string[] }>({
    queryKey: ["/api/streaming/odds/active"],
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Query active results streams
  const { data: resultsStreams, isLoading: resultsLoading } = useQuery<{ streams: string[] }>({
    queryKey: ["/api/streaming/results/active"],
    refetchInterval: 5000,
  });

  // Start odds stream mutation
  const startOddsMutation = useMutation({
    mutationFn: async (config: { sport: string; sportsbooks: string[]; isMain: boolean }) => {
      return await apiRequest("POST", "/api/streaming/odds/start", config);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Odds Stream Started",
        description: `Stream ID: ${data.streamId}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/streaming/odds/active"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Start Odds Stream",
        description: error.message || "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Start results stream mutation
  const startResultsMutation = useMutation({
    mutationFn: async (config: { sport: string; leagues?: string[] }) => {
      return await apiRequest("POST", "/api/streaming/results/start", config);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Results Stream Started",
        description: `Stream ID: ${data.streamId}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/streaming/results/active"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Start Results Stream",
        description: error.message || "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Stop odds stream mutation
  const stopOddsMutation = useMutation({
    mutationFn: async (streamId: string) => {
      return await apiRequest("POST", `/api/streaming/odds/stop/${streamId}`);
    },
    onSuccess: () => {
      toast({
        title: "Odds Stream Stopped",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/streaming/odds/active"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Stop Stream",
        description: error.message || "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Stop results stream mutation
  const stopResultsMutation = useMutation({
    mutationFn: async (streamId: string) => {
      return await apiRequest("POST", `/api/streaming/results/stop/${streamId}`);
    },
    onSuccess: () => {
      toast({
        title: "Results Stream Stopped",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/streaming/results/active"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Stop Stream",
        description: error.message || "Unknown error",
        variant: "destructive",
      });
    },
  });

  const handleStartDFSStreams = () => {
    // Start PrizePicks + Underdog odds stream
    startOddsMutation.mutate({
      sport: selectedSport,
      sportsbooks: ["PrizePicks", "Underdog"],
      isMain: true,
    });

    // Start results stream for auto-grading
    const league = selectedSport === "basketball_nba" ? "nba" : 
                  selectedSport === "icehockey_nhl" ? "nhl" :
                  selectedSport === "americanfootball_nfl" ? "nfl" : "mlb";
    
    startResultsMutation.mutate({
      sport: selectedSport === "basketball_nba" ? "basketball" :
             selectedSport === "icehockey_nhl" ? "hockey" :
             selectedSport === "americanfootball_nfl" ? "football" : "baseball",
      leagues: [league],
    });
  };

  const isStreaming = (oddsStreams?.streams?.length ?? 0) > 0 || (resultsStreams?.streams?.length ?? 0) > 0;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <Radio className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Real-Time Streaming</h1>
          <p className="text-muted-foreground">Manage live odds and results streams</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* DFS Stream Control */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              DFS Streaming (PrizePicks + Underdog)
            </CardTitle>
            <CardDescription>
              Start real-time odds streaming and auto-grading
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Sport</label>
              <select
                data-testid="select-sport"
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
                className="w-full p-2 border rounded-md bg-background"
              >
                <option value="basketball_nba">NBA</option>
                <option value="icehockey_nhl">NHL</option>
                <option value="americanfootball_nfl">NFL</option>
                <option value="baseball_mlb">MLB</option>
              </select>
            </div>

            <Button
              data-testid="button-start-dfs-streams"
              onClick={handleStartDFSStreams}
              disabled={isStreaming || startOddsMutation.isPending || startResultsMutation.isPending}
              className="w-full"
              size="lg"
            >
              <Play className="h-4 w-4 mr-2" />
              {isStreaming ? "Streaming Active" : "Start DFS Streams"}
            </Button>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Stream Status</CardTitle>
            <CardDescription>Currently active streams</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Odds Streams</span>
                  <Badge variant={oddsStreams?.streams?.length ? "default" : "secondary"}>
                    {oddsLoading ? "Loading..." : oddsStreams?.streams?.length || 0}
                  </Badge>
                </div>
                {oddsStreams?.streams && oddsStreams.streams.length > 0 && (
                  <div className="space-y-2">
                    {oddsStreams.streams.map((streamId) => (
                      <div
                        key={streamId}
                        className="flex items-center justify-between p-2 bg-muted rounded-md text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Radio className="h-3 w-3 text-green-500 animate-pulse" />
                          <span className="font-mono text-xs">{streamId}</span>
                        </div>
                        <Button
                          data-testid={`button-stop-odds-${streamId}`}
                          size="sm"
                          variant="ghost"
                          onClick={() => stopOddsMutation.mutate(streamId)}
                          disabled={stopOddsMutation.isPending}
                        >
                          <Square className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Results Streams</span>
                  <Badge variant={resultsStreams?.streams?.length ? "default" : "secondary"}>
                    {resultsLoading ? "Loading..." : resultsStreams?.streams?.length || 0}
                  </Badge>
                </div>
                {resultsStreams?.streams && resultsStreams.streams.length > 0 && (
                  <div className="space-y-2">
                    {resultsStreams.streams.map((streamId) => (
                      <div
                        key={streamId}
                        className="flex items-center justify-between p-2 bg-muted rounded-md text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Radio className="h-3 w-3 text-blue-500 animate-pulse" />
                          <span className="font-mono text-xs">{streamId}</span>
                        </div>
                        <Button
                          data-testid={`button-stop-results-${streamId}`}
                          size="sm"
                          variant="ghost"
                          onClick={() => stopResultsMutation.mutate(streamId)}
                          disabled={stopResultsMutation.isPending}
                        >
                          <Square className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <div className="text-primary font-bold">1.</div>
            <div>
              <strong>Odds Stream</strong> - Receives real-time price updates from PrizePicks and Underdog.
              Updates props in database when lines move.
            </div>
          </div>
          <div className="flex gap-3">
            <div className="text-primary font-bold">2.</div>
            <div>
              <strong>Results Stream</strong> - Monitors live games and automatically grades bets when games finish.
              Updates user bankrolls and slip statuses.
            </div>
          </div>
          <div className="flex gap-3">
            <div className="text-primary font-bold">3.</div>
            <div>
              <strong>Auto-Reconnect</strong> - Streams automatically reconnect if connection drops, resuming from
              last event to prevent data loss.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
