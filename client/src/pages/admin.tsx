import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Settings, Database, TrendingUp, Play, RefreshCw, Radio, Activity } from "lucide-react";

export default function Admin() {
  const { toast } = useToast();
  const [isSettling, setIsSettling] = useState(false);
  const [isRescoring, setIsRescoring] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [isStreamingAction, setIsStreamingAction] = useState(false);

  const { data: stats, refetch: refetchStats } = useQuery<{
    stats: {
      activeProps: number;
      models: number;
      sportBreakdown: Record<string, number>;
      fixtureIdCoverage?: {
        total: number;
        withFixtureId: number;
        percentage: number;
        dfsTotal: number;
        dfsWithFixtureId: number;
        dfsPercentage: number;
      };
    };
  }>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: streamStatus, refetch: refetchStreams } = useQuery<{
    success: boolean;
    activeStreams: string[];
    count: number;
  }>({
    queryKey: ["/api/admin/streaming/status"],
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  const handleSettlement = async (sport?: string) => {
    setIsSettling(true);
    try {
      const res = await apiRequest("POST", "/api/admin/settlement/run", { sport });
      const response: any = await res.json();

      toast({
        title: "Settlement Complete",
        description: `Settled ${response?.report?.betsSettled || 0} bets`,
      });

      refetchStats();
    } catch (error: any) {
      toast({
        title: "Settlement Failed",
        description: error.message || "Failed to run settlement",
        variant: "destructive",
      });
    } finally {
      setIsSettling(false);
    }
  };

  const handleRescore = async () => {
    setIsRescoring(true);
    try {
      const res = await apiRequest("POST", "/api/admin/props/rescore");
      const response: any = await res.json();

      toast({
        title: "Rescore Complete",
        description: `Rescored ${response?.propsRescored || 0} props`,
      });

      refetchStats();
    } catch (error: any) {
      toast({
        title: "Rescore Failed",
        description: error.message || "Failed to rescore props",
        variant: "destructive",
      });
    } finally {
      setIsRescoring(false);
    }
  };

  const handleRefreshSampleProps = async () => {
    setIsRefreshing(true);
    try {
      const res = await apiRequest("POST", "/api/admin/props/refresh-samples");
      const response: any = await res.json();

      toast({
        title: "Props Refreshed",
        description: response?.message || `Refreshed ${response?.count || 0} sample props`,
      });

      refetchStats();
    } catch (error: any) {
      toast({
        title: "Refresh Failed",
        description: error.message || "Failed to refresh props",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTestBalldontlie = async () => {
    try {
      const res = await apiRequest("GET", "/api/admin/test/balldontlie");
      const response: any = await res.json();

      setTestResults({
        type: "BALLDONTLIE",
        data: response,
      });

      toast({
        title: "Test Complete",
        description: `Found ${response?.gamesCount || 0} games`,
      });
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test BALLDONTLIE API",
        variant: "destructive",
      });
    }
  };

  const handleStartStream = async (sport: string) => {
    setIsStreamingAction(true);
    try {
      const res = await apiRequest("POST", "/api/admin/streaming/start", { sport, sportsbooks: ['PrizePicks', 'Underdog'] });
      const response: any = await res.json();

      toast({
        title: "Stream Started",
        description: response?.message || `Started streaming for ${sport}`,
      });

      refetchStreams();
    } catch (error: any) {
      toast({
        title: "Start Failed",
        description: error.message || "Failed to start stream",
        variant: "destructive",
      });
    } finally {
      setIsStreamingAction(false);
    }
  };

  const handleStopStream = async (streamId: string) => {
    setIsStreamingAction(true);
    try {
      const res = await apiRequest("POST", "/api/admin/streaming/stop", { streamId });
      const response: any = await res.json();

      toast({
        title: "Stream Stopped",
        description: response?.message || `Stopped stream: ${streamId}`,
      });

      refetchStreams();
    } catch (error: any) {
      toast({
        title: "Stop Failed",
        description: error.message || "Failed to stop stream",
        variant: "destructive",
      });
    } finally {
      setIsStreamingAction(false);
    }
  };

  const handleStopAllStreams = async () => {
    setIsStreamingAction(true);
    try {
      const res = await apiRequest("POST", "/api/admin/streaming/stop-all");
      const response: any = await res.json();

      toast({
        title: "All Streams Stopped",
        description: response?.message || "All streams stopped",
      });

      refetchStreams();
    } catch (error: any) {
      toast({
        title: "Stop Failed",
        description: error.message || "Failed to stop streams",
        variant: "destructive",
      });
    } finally {
      setIsStreamingAction(false);
    }
  };

  const handleTestModel = async () => {
    try {
      const res = await apiRequest("POST", "/api/admin/test/model", {
        playerName: "Luka Doncic",
        stat: "Points",
        line: 28.5,
        direction: "over",
        sport: "NBA",
        recentAverage: 31.2,
        seasonAverage: 29.8,
        opponentRanking: 25,
        homeAway: "home",
        lineMovement: 0.5,
      });
      const response: any = await res.json();

      setTestResults({
        type: "MODEL",
        data: response,
      });

      toast({
        title: "Model Test Complete",
        description: `Confidence: ${response?.score?.confidence}%`,
      });
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test model",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-admin-title">Admin Dashboard</h1>
          <p className="text-muted-foreground">System management and testing tools</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchStats()}
          data-testid="button-refresh-stats"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Props</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-props">
              {stats?.stats?.activeProps || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all sports
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fixture ID Coverage</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-fixture-coverage">
              {stats?.stats?.fixtureIdCoverage?.percentage || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.stats?.fixtureIdCoverage?.withFixtureId || 0} of {stats?.stats?.fixtureIdCoverage?.total || 0} props
            </p>
            {(stats?.stats?.fixtureIdCoverage?.dfsTotal ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                DFS: {stats?.stats?.fixtureIdCoverage?.dfsPercentage || 0}% ({stats?.stats?.fixtureIdCoverage?.dfsWithFixtureId || 0}/{stats?.stats?.fixtureIdCoverage?.dfsTotal || 0})
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ML Models</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-models-count">
              {stats?.stats?.models || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active model versions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sports Coverage</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {stats?.stats?.sportBreakdown && Object.entries(stats.stats.sportBreakdown).map(([sport, count]) => (
                <Badge key={sport} variant="secondary" data-testid={`badge-sport-${sport}`}>
                  {sport}: {count as number}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="settlement" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settlement" data-testid="tab-settlement">Settlement</TabsTrigger>
          <TabsTrigger value="streaming" data-testid="tab-streaming">Streaming</TabsTrigger>
          <TabsTrigger value="testing" data-testid="tab-testing">API Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="settlement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual Settlement</CardTitle>
              <CardDescription>
                Trigger bet settlement for completed games
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button
                  onClick={() => handleSettlement()}
                  disabled={isSettling}
                  data-testid="button-settle-all"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isSettling ? "Settling..." : "Settle All"}
                </Button>
                <Button
                  onClick={() => handleSettlement("NBA")}
                  disabled={isSettling}
                  variant="outline"
                  data-testid="button-settle-nba"
                >
                  NBA
                </Button>
                <Button
                  onClick={() => handleSettlement("NHL")}
                  disabled={isSettling}
                  variant="outline"
                  data-testid="button-settle-nhl"
                >
                  NHL
                </Button>
                <Button
                  onClick={() => handleSettlement("NFL")}
                  disabled={isSettling}
                  variant="outline"
                  data-testid="button-settle-nfl"
                >
                  NFL
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rescore Props</CardTitle>
              <CardDescription>
                Re-run ML model scoring for all active props
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleRescore}
                disabled={isRescoring}
                variant="secondary"
                data-testid="button-rescore-props"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                {isRescoring ? "Rescoring..." : "Rescore All Props"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Refresh Sample Props</CardTitle>
              <CardDescription>
                Replace old props with fresh sample data and current game times
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleRefreshSampleProps}
                disabled={isRefreshing}
                variant="default"
                data-testid="button-refresh-sample-props"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {isRefreshing ? "Refreshing..." : "Refresh Sample Props"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="streaming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real-Time Streaming Status</CardTitle>
              <CardDescription>
                OpticOdds live streams for PrizePicks and Underdog props
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-medium" data-testid="text-stream-count">
                      {streamStatus?.count || 0} Active Streams
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Auto-refreshes every 5 seconds
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleStopAllStreams}
                  disabled={isStreamingAction || !streamStatus?.count}
                  variant="destructive"
                  size="sm"
                  data-testid="button-stop-all-streams"
                >
                  Stop All Streams
                </Button>
              </div>

              {streamStatus?.activeStreams && streamStatus.activeStreams.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Active Streams:</p>
                  {streamStatus.activeStreams.map((streamId) => (
                    <div
                      key={streamId}
                      className="flex items-center justify-between p-3 border rounded-md"
                      data-testid={`stream-${streamId}`}
                    >
                      <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-green-500 animate-pulse" />
                        <span className="font-mono text-sm">{streamId}</span>
                      </div>
                      <Button
                        onClick={() => handleStopStream(streamId)}
                        disabled={isStreamingAction}
                        variant="outline"
                        size="sm"
                        data-testid={`button-stop-${streamId}`}
                      >
                        Stop
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {(!streamStatus?.activeStreams || streamStatus.activeStreams.length === 0) && (
                <p className="text-sm text-muted-foreground">No active streams</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Start New Streams</CardTitle>
              <CardDescription>
                Launch real-time streaming for PrizePicks and Underdog props
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <Button
                  onClick={() => handleStartStream('basketball_nba')}
                  disabled={isStreamingAction}
                  variant="default"
                  data-testid="button-stream-nba"
                >
                  <Radio className="w-4 h-4 mr-2" />
                  NBA Stream
                </Button>
                <Button
                  onClick={() => handleStartStream('americanfootball_nfl')}
                  disabled={isStreamingAction}
                  variant="default"
                  data-testid="button-stream-nfl"
                >
                  <Radio className="w-4 h-4 mr-2" />
                  NFL Stream
                </Button>
                <Button
                  onClick={() => handleStartStream('icehockey_nhl')}
                  disabled={isStreamingAction}
                  variant="default"
                  data-testid="button-stream-nhl"
                >
                  <Radio className="w-4 h-4 mr-2" />
                  NHL Stream
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Streams auto-start on server boot. Use these controls to manually manage streams.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Integration Tests</CardTitle>
              <CardDescription>
                Test external API connections and functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Button
                  onClick={handleTestBalldontlie}
                  variant="outline"
                  data-testid="button-test-balldontlie"
                >
                  Test BALLDONTLIE
                </Button>
                <Button
                  onClick={handleTestModel}
                  variant="outline"
                  data-testid="button-test-model"
                >
                  Test ML Model
                </Button>
              </div>

              {testResults && (
                <div className="mt-4 p-4 bg-muted rounded-md">
                  <h3 className="font-semibold mb-2">{testResults.type} Test Results</h3>
                  <pre className="text-xs overflow-auto" data-testid="text-test-results">
                    {JSON.stringify(testResults.data, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
