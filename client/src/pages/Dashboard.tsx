import DashboardHeader from "@/components/DashboardHeader";
import Sidebar from "@/components/Sidebar";
import MetricCard from "@/components/MetricCard";
import SlipCard from "@/components/SlipCard";
import PropsTable from "@/components/PropsTable";
import Week1Progress from "@/components/Week1Progress";
import PerformanceChart from "@/components/PerformanceChart";
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
import { useState } from "react";

//todo: remove mock functionality
const MOCK_SLIPS = [
  {
    title: "Safe Grind",
    type: 'conservative' as const,
    picks: [
      { player: 'Connor McDavid', stat: 'SOG', line: 3.5, direction: 'over' as const, confidence: 87 },
      { player: 'Auston Matthews', stat: 'Points', line: 1.5, direction: 'over' as const, confidence: 82 },
      { player: 'Igor Shesterkin', stat: 'Saves', line: 30.5, direction: 'over' as const, confidence: 78 }
    ],
    confidence: 82,
    suggestedBet: 8.50,
    potentialReturn: 34.00,
    platform: "PrizePicks"
  },
  {
    title: "Value Play",
    type: 'balanced' as const,
    picks: [
      { player: 'Nathan MacKinnon', stat: 'SOG', line: 4.5, direction: 'over' as const, confidence: 76 },
      { player: 'Cale Makar', stat: 'Points', line: 1.5, direction: 'over' as const, confidence: 72 },
      { player: 'Matthew Tkachuk', stat: 'Hits', line: 3.5, direction: 'over' as const, confidence: 68 },
      { player: 'Jack Hughes', stat: 'SOG', line: 3.5, direction: 'over' as const, confidence: 70 }
    ],
    confidence: 71,
    suggestedBet: 6.00,
    potentialReturn: 60.00,
    platform: "Underdog"
  },
  {
    title: "Moonshot",
    type: 'aggressive' as const,
    picks: [
      { player: 'Leon Draisaitl', stat: 'Points', line: 1.5, direction: 'over' as const, confidence: 65 },
      { player: 'Artemi Panarin', stat: 'SOG', line: 3.5, direction: 'over' as const, confidence: 62 },
      { player: 'David Pastrnak', stat: 'Goals', line: 0.5, direction: 'over' as const, confidence: 58 },
      { player: 'Quinn Hughes', stat: 'Points', line: 1.5, direction: 'over' as const, confidence: 60 },
      { player: 'Andrei Vasilevskiy', stat: 'Saves', line: 28.5, direction: 'over' as const, confidence: 63 }
    ],
    confidence: 61,
    suggestedBet: 2.00,
    potentialReturn: 50.00,
    platform: "PrizePicks"
  }
];

const MOCK_PROPS = [
  {
    id: '1',
    player: 'Connor McDavid',
    team: 'EDM',
    stat: 'SOG',
    line: 3.5,
    confidence: 87,
    ev: 8.2,
    platform: 'PrizePicks'
  },
  {
    id: '2',
    player: 'Auston Matthews',
    team: 'TOR',
    stat: 'Points',
    line: 1.5,
    confidence: 78,
    ev: 6.1,
    platform: 'Underdog'
  },
  {
    id: '3',
    player: 'Igor Shesterkin',
    team: 'NYR',
    stat: 'Saves',
    line: 30.5,
    confidence: 81,
    ev: 7.4,
    platform: 'PrizePicks'
  },
  {
    id: '4',
    player: 'Nathan MacKinnon',
    team: 'COL',
    stat: 'SOG',
    line: 4.5,
    confidence: 65,
    ev: 3.2,
    platform: 'Underdog'
  },
  {
    id: '5',
    player: 'Leon Draisaitl',
    team: 'EDM',
    stat: 'Points',
    line: 1.5,
    confidence: 72,
    ev: 4.8,
    platform: 'PrizePicks'
  },
  {
    id: '6',
    player: 'Cale Makar',
    team: 'COL',
    stat: 'Points',
    line: 1.5,
    confidence: 74,
    ev: 5.3,
    platform: 'Underdog'
  }
];

const MOCK_BANKROLL_DATA = [
  { date: 'Mon', value: 100 },
  { date: 'Tue', value: 105 },
  { date: 'Wed', value: 98 },
  { date: 'Thu', value: 112 },
  { date: 'Fri', value: 118 },
  { date: 'Sat', value: 127 },
  { date: 'Sun', value: 125 }
];

const MOCK_WINRATE_DATA = [
  { date: 'Mon', value: 50 },
  { date: 'Tue', value: 52 },
  { date: 'Wed', value: 48 },
  { date: 'Thu', value: 55 },
  { date: 'Fri', value: 58 },
  { date: 'Sat', value: 57 },
  { date: 'Sun', value: 58 }
];

const MOCK_WEEK1_GOALS = [
  { label: 'Win Rate', target: '50%+', current: '58.2%', achieved: true },
  { label: 'CLV Positive', target: '55%+', current: '62.1%', achieved: true },
  { label: 'Kelly Sizing', target: '100%', current: '95.2%', achieved: false },
  { label: 'Daily Tracking', target: '7 days', current: '3 days', achieved: false }
];

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('NHL');
  const [selectedStat, setSelectedStat] = useState('all');

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
          bankroll={127.50}
          alertCount={3}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
            {/* Week 1 Progress Banner */}
            <Week1Progress
              day={3}
              betsPlaced={12}
              goals={MOCK_WEEK1_GOALS}
            />

            {/* Hero Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Bankroll" value="$127.50" change={27.5} mono />
              <MetricCard label="Win Rate" value={58.2} suffix="%" change={8.2} />
              <MetricCard label="CLV" value="+2.8" suffix="%" change={12.5} />
              <MetricCard label="ROI" value={7.4} suffix="%" change={-1.2} />
            </div>

            {/* Top Slips Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Top AI Slips</h2>
                <Badge variant="secondary">3 New Today</Badge>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {MOCK_SLIPS.map((slip, i) => (
                  <SlipCard key={i} {...slip} />
                ))}
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PerformanceChart
                title="Bankroll Growth"
                data={MOCK_BANKROLL_DATA}
              />
              <PerformanceChart
                title="Win Rate Trend"
                data={MOCK_WINRATE_DATA}
              />
            </div>

            {/* Props Feed */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Live Props Feed</h2>
                <div className="flex items-center gap-2">
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
                      <SelectItem value="SOG">SOG</SelectItem>
                      <SelectItem value="Points">Points</SelectItem>
                      <SelectItem value="Goals">Goals</SelectItem>
                      <SelectItem value="Assists">Assists</SelectItem>
                      <SelectItem value="Saves">Saves</SelectItem>
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
              <PropsTable props={MOCK_PROPS} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
