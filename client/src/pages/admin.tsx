import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Settings, Database, TrendingUp, Play, RefreshCw } from "lucide-react";

export default function Admin() {
  const { toast } = useToast();
  const [isSettling, setIsSettling] = useState(false);
  const [isRescoring, setIsRescoring] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  const handleSettlement = async (sport?: string) => {
    setIsSettling(true);
    try {
      const response: any = await apiRequest({
        url: "/api/admin/settlement/run",
        method: "POST",
        data: { sport },
      });

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
      const response: any = await apiRequest({
        url: "/api/admin/props/rescore",
        method: "POST",
      });

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
      const response: any = await apiRequest({
        url: "/api/admin/props/refresh-samples",
        method: "POST",
      });

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
      const response: any = await apiRequest({
        url: "/api/admin/test/balldontlie",
        method: "GET",
      });

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

  const handleTestModel = async () => {
    try {
      const response: any = await apiRequest({
        url: "/api/admin/test/model",
        method: "POST",
        data: {
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
        },
      });

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settlement" data-testid="tab-settlement">Settlement</TabsTrigger>
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
