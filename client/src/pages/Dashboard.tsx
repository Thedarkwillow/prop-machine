import DashboardHeader from "@/components/DashboardHeader";
import Sidebar from "@/components/Sidebar";
import MetricCard from "@/components/MetricCard";
import SlipCard from "@/components/SlipCard";
import PropsTable from "@/components/PropsTable";
import Week1Progress from "@/components/Week1Progress";
import PerformanceChart from "@/components/PerformanceChart";
import ManualPropInput from "@/components/ManualPropInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const USER_ID = 1; // Default user ID

// Sport-specific stat types
const SPORT_STATS: Record<string, string[]> = {
  NHL: ['SOG', 'Points', 'Goals', 'Assists', 'Saves'],
  NBA: ['Points', 'Rebounds', 'Assists', 'Threes'],
  NFL: ['Pass Yards', 'Rush Yards', 'Receptions', 'Pass TDs'],
  MLB: ['Hits', 'Strikeouts', 'Total Bases', 'Runs + RBIs'],
};

export default function Dashboard() {
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('NHL');
  const [selectedStat, setSelectedStat] = useState('all');

  // Reset stat filter when sport changes
  useEffect(() => {
    setSelectedStat('all');
  }, [selectedSport]);

  // Fetch dashboard data
  const { data: dashboardData, isLoading: dashboardLoading, isError: dashboardError } = useQuery({
    queryKey: ['/api/dashboard', USER_ID],
  });

  // Fetch props
  const { data: props = [], isLoading: propsLoading, isError: propsError } = useQuery({
    queryKey: ['/api/props', selectedSport],
  });

  // Fetch performance history
  const { data: performanceHistory = [], isLoading: perfLoading, isError: perfError } = useQuery({
    queryKey: ['/api/performance', USER_ID, 'history'],
  });

  // Show error toasts
  useEffect(() => {
    if (dashboardError) {
      toast({
        variant: "destructive",
        title: "Error loading dashboard",
        description: "Failed to fetch dashboard data. Please refresh the page.",
      });
    }
  }, [dashboardError, toast]);

  useEffect(() => {
    if (propsError) {
      toast({
        variant: "destructive",
        title: "Error loading props",
        description: "Failed to fetch props feed. Some data may be unavailable.",
      });
    }
  }, [propsError, toast]);

  useEffect(() => {
    if (perfError) {
      toast({
        variant: "destructive",
        title: "Error loading performance data",
        description: "Failed to fetch performance history. Charts may be unavailable.",
      });
    }
  }, [perfError, toast]);

  if (dashboardLoading || propsLoading || perfLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium">Loading dashboard...</div>
          <p className="text-sm text-muted-foreground mt-2">Fetching your betting data</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-destructive">Failed to load dashboard</div>
          <p className="text-sm text-muted-foreground mt-2">Please refresh the page</p>
        </div>
      </div>
    );
  }

  const user = dashboardData?.user;
  const metrics = dashboardData?.metrics || {};
  const pendingSlips = dashboardData?.pendingSlips || [];
  const week1Progress = dashboardData?.week1Progress || { betsPlaced: 0, targetBets: 20 };

  // Transform performance history for charts
  const bankrollData = performanceHistory.map((snapshot: any) => ({
    date: new Date(snapshot.date).toLocaleDateString('en-US', { weekday: 'short' }),
    value: parseFloat(snapshot.bankroll),
  }));

  const winRateData = performanceHistory.map((snapshot: any) => ({
    date: new Date(snapshot.date).toLocaleDateString('en-US', { weekday: 'short' }),
    value: parseFloat(snapshot.winRate),
  }));

  // Transform slips for SlipCard component
  const transformedSlips = pendingSlips.map((slip: any) => ({
    title: slip.title,
    type: slip.type,
    picks: slip.picks,
    confidence: slip.confidence,
    suggestedBet: parseFloat(slip.suggestedBet),
    potentialReturn: parseFloat(slip.potentialReturn),
    platform: slip.platform,
  }));

  // Transform props for PropsTable component
  const transformedProps = props.map((prop: any) => ({
    id: prop.id.toString(),
    player: prop.player,
    team: prop.team,
    stat: prop.stat,
    line: parseFloat(prop.line),
    direction: prop.direction,
    confidence: prop.confidence,
    ev: parseFloat(prop.ev),
    platform: prop.platform,
  }));

  // Filter props by search query and stat type
  const filteredProps = transformedProps.filter((prop: any) => {
    const matchesSearch = prop.player.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStat = selectedStat === 'all' || prop.stat === selectedStat;
    return matchesSearch && matchesStat;
  });

  // Week 1 goals calculation
  const week1Goals = [
    {
      label: 'Win Rate',
      target: '50%+',
      current: `${metrics.winRate}%`,
      achieved: parseFloat(metrics.winRate || 0) >= 50,
    },
    {
      label: 'CLV Positive',
      target: '55%+',
      current: `${metrics.avgClv >= 0 ? '+' : ''}${metrics.avgClv}%`,
      achieved: parseFloat(metrics.avgClv || 0) >= 0,
    },
    {
      label: 'Bets Placed',
      target: '20 bets',
      current: `${week1Progress.betsPlaced} bets`,
      achieved: week1Progress.betsPlaced >= 20,
    },
    {
      label: 'ROI',
      target: '5%+',
      current: `${metrics.roi >= 0 ? '+' : ''}${metrics.roi}%`,
      achieved: parseFloat(metrics.roi || 0) >= 5,
    },
  ];

  const currentDay = Math.min(Math.ceil(week1Progress.betsPlaced / 3), 7);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - desktop */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          bankroll={parseFloat(user?.bankroll ?? "0")}
          alertCount={3}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
            {/* Week 1 Progress Banner */}
            <Week1Progress
              day={currentDay}
              betsPlaced={week1Progress.betsPlaced}
              goals={week1Goals}
            />

            {/* Hero Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Bankroll"
                value={`$${parseFloat(user?.bankroll ?? "0").toFixed(2)}`}
                change={27.5}
                mono
              />
              <MetricCard
                label="Win Rate"
                value={parseFloat(metrics.winRate || 0).toFixed(1)}
                suffix="%"
                change={8.2}
              />
              <MetricCard
                label="CLV"
                value={`${metrics.avgClv >= 0 ? '+' : ''}${parseFloat(metrics.avgClv || 0).toFixed(1)}`}
                suffix="%"
                change={12.5}
              />
              <MetricCard
                label="ROI"
                value={parseFloat(metrics.roi || 0).toFixed(1)}
                suffix="%"
                change={-1.2}
              />
            </div>

            {/* Top Slips Section */}
            {transformedSlips.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Top Slips</h2>
                  <Badge variant="secondary">{transformedSlips.length} New Today</Badge>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {transformedSlips.map((slip: any, i: number) => (
                    <SlipCard key={i} {...slip} />
                  ))}
                </div>
              </div>
            )}

            {/* Charts */}
            {bankrollData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <PerformanceChart
                  title="Bankroll Growth"
                  data={bankrollData}
                />
                <PerformanceChart
                  title="Win Rate Trend"
                  data={winRateData}
                />
              </div>
            )}

            {/* Props Feed */}
            <div>
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Live Props Feed</h2>
                  <ManualPropInput />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={selectedSport} onValueChange={setSelectedSport}>
                    <SelectTrigger className="w-32" data-testid="select-sport">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NHL">NHL</SelectItem>
                      <SelectItem value="NBA">NBA</SelectItem>
                      <SelectItem value="NFL">NFL</SelectItem>
                      <SelectItem value="MLB">MLB</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedStat} onValueChange={setSelectedStat}>
                    <SelectTrigger className="w-40" data-testid="select-stat">
                      <SelectValue placeholder="All Stats" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stats</SelectItem>
                      {SPORT_STATS[selectedSport]?.map((stat) => (
                        <SelectItem key={stat} value={stat}>
                          {stat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search players..."
                      className="pl-10 w-64"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="input-search"
                    />
                  </div>
                </div>
              </div>
              {propsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading props...
                </div>
              ) : filteredProps.length > 0 ? (
                <PropsTable props={filteredProps} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No props found matching your criteria
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
