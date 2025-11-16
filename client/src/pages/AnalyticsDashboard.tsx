import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Cell } from "recharts";
import { TrendingUp, TrendingDown, Target, Percent } from "lucide-react";

interface AnalyticsData {
  overview: {
    totalBets: number;
    winRate: number;
    roi: number;
    avgClv: number;
    currentStreak: { type: string; count: number };
  };
  bySport: Array<{
    sport: string;
    bets: number;
    wins: number;
    winRate: number;
    roi: number;
    avgConfidence: number;
  }>;
  byPlatform: Array<{
    platform: string;
    bets: number;
    wins: number;
    winRate: number;
    roi: number;
  }>;
  confidenceBrackets: Record<string, {
    bracket: string;
    predictedWinRate: number;
    actualWinRate: number;
    totalBets: number;
    accuracy: number;
  }>;
  trends: Array<{
    date: string;
    winRate: number;
    roi: number;
    clv: number;
  }>;
}

export default function AnalyticsDashboard() {
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics/overview"],
  });

  if (isLoading || !analytics) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading analytics...</div>
      </div>
    );
  }

  const confidenceBracketData = Object.values(analytics.confidenceBrackets).map(bracket => ({
    bracket: bracket.bracket,
    predicted: bracket.predictedWinRate,
    actual: bracket.actualWinRate,
    bets: bracket.totalBets,
    accuracy: bracket.accuracy,
  }));

  const getStreakColor = (type: string) => {
    return type === 'hot' ? 'text-green-600' : 'text-red-600';
  };

  const getStreakIcon = (type: string) => {
    return type === 'hot' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  const getRoiColor = (roi: number) => {
    if (roi > 10) return 'hsl(var(--chart-2))';
    if (roi > 0) return 'hsl(var(--chart-1))';
    return 'hsl(var(--chart-5))';
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" data-testid="heading-analytics">Advanced Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Deep insights into your betting performance and model accuracy
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Bets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-bets">{analytics.overview.totalBets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Win Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-win-rate">{analytics.overview.winRate.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>ROI</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${analytics.overview.roi > 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-roi">
              {analytics.overview.roi > 0 ? '+' : ''}{analytics.overview.roi.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current Streak</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold flex items-center gap-2 ${getStreakColor(analytics.overview.currentStreak.type)}`} data-testid="text-current-streak">
              {getStreakIcon(analytics.overview.currentStreak.type)}
              {analytics.overview.currentStreak.count}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sports" className="space-y-6">
        <TabsList data-testid="tabs-analytics">
          <TabsTrigger value="sports" data-testid="tab-sports">By Sport</TabsTrigger>
          <TabsTrigger value="platforms" data-testid="tab-platforms">By Platform</TabsTrigger>
          <TabsTrigger value="confidence" data-testid="tab-confidence">Confidence Accuracy</TabsTrigger>
          <TabsTrigger value="trends" data-testid="tab-trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="sports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Sport</CardTitle>
              <CardDescription>Compare your betting results across different sports</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics.bySport}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sport" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="winRate" fill="hsl(var(--chart-1))" name="Win Rate (%)" />
                  <Bar yAxisId="right" dataKey="roi" fill="hsl(var(--chart-2))" name="ROI (%)">
                    {analytics.bySport.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getRoiColor(entry.roi)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {analytics.bySport.map((sport) => (
                  <Card key={sport.sport}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{sport.sport}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">Bets:</span>
                        <span className="font-medium" data-testid={`text-sport-${sport.sport.toLowerCase()}-bets`}>{sport.bets}</span>
                      </div>
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">Win Rate:</span>
                        <span className="font-medium" data-testid={`text-sport-${sport.sport.toLowerCase()}-winrate`}>{sport.winRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">ROI:</span>
                        <span className={`font-medium ${sport.roi > 0 ? 'text-green-600' : 'text-red-600'}`} data-testid={`text-sport-${sport.sport.toLowerCase()}-roi`}>
                          {sport.roi > 0 ? '+' : ''}{sport.roi.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">Avg Confidence:</span>
                        <span className="font-medium" data-testid={`text-sport-${sport.sport.toLowerCase()}-confidence`}>{sport.avgConfidence.toFixed(0)}%</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Platform</CardTitle>
              <CardDescription>Compare results across betting platforms</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics.byPlatform}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="platform" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="winRate" fill="hsl(var(--chart-3))" name="Win Rate (%)" />
                  <Bar dataKey="roi" fill="hsl(var(--chart-4))" name="ROI (%)">
                    {analytics.byPlatform.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getRoiColor(entry.roi)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {analytics.byPlatform.map((platform) => (
                  <Card key={platform.platform}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{platform.platform}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">Bets:</span>
                        <span className="font-medium" data-testid={`text-platform-${platform.platform.toLowerCase()}-bets`}>{platform.bets}</span>
                      </div>
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">Wins:</span>
                        <span className="font-medium" data-testid={`text-platform-${platform.platform.toLowerCase()}-wins`}>{platform.wins}</span>
                      </div>
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">Win Rate:</span>
                        <span className="font-medium" data-testid={`text-platform-${platform.platform.toLowerCase()}-winrate`}>{platform.winRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">ROI:</span>
                        <span className={`font-medium ${platform.roi > 0 ? 'text-green-600' : 'text-red-600'}`} data-testid={`text-platform-${platform.platform.toLowerCase()}-roi`}>
                          {platform.roi > 0 ? '+' : ''}{platform.roi.toFixed(1)}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="confidence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Confidence Bracket Accuracy</CardTitle>
              <CardDescription>How well do our confidence scores predict actual outcomes?</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={confidenceBracketData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bracket" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="predicted" fill="hsl(var(--chart-1))" name="Predicted Win Rate (%)" />
                  <Bar dataKey="actual" fill="hsl(var(--chart-2))" name="Actual Win Rate (%)" />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {confidenceBracketData.map((bracket) => (
                  <Card key={bracket.bracket}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        {bracket.bracket}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">Bets:</span>
                        <span className="font-medium" data-testid={`text-bracket-${bracket.bracket}-bets`}>{bracket.bets}</span>
                      </div>
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">Predicted:</span>
                        <span className="font-medium" data-testid={`text-bracket-${bracket.bracket}-predicted`}>{bracket.predicted.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">Actual:</span>
                        <span className="font-medium" data-testid={`text-bracket-${bracket.bracket}-actual`}>{bracket.actual.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">Accuracy:</span>
                        <Badge variant={bracket.accuracy > 85 ? "default" : bracket.accuracy > 70 ? "secondary" : "destructive"} data-testid={`badge-bracket-${bracket.bracket}-accuracy`}>
                          {bracket.accuracy.toFixed(0)}%
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Track your performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analytics.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="winRate" stroke="hsl(var(--chart-1))" name="Win Rate (%)" strokeWidth={2} />
                  <Line type="monotone" dataKey="roi" stroke="hsl(var(--chart-2))" name="ROI (%)" strokeWidth={2} />
                  <Line type="monotone" dataKey="clv" stroke="hsl(var(--chart-3))" name="CLV (%)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
