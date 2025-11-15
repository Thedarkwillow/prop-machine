import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Bet, Prop } from '@shared/schema';

const USER_ID = 1;

type BetWithProp = Bet & { prop: Prop | null };

type SportStats = {
  sport: string;
  totalBets: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
  totalWagered: number;
  totalReturns: number;
  roi: number;
  avgClv: number;
};

export default function Performance() {
  const { data: bets = [], isLoading } = useQuery<BetWithProp[]>({
    queryKey: ['/api/bets', USER_ID],
  });

  // Calculate sport-specific stats
  const sportStats: SportStats[] = ['NHL', 'NBA', 'NFL', 'MLB'].map(sport => {
    const sportBets = bets.filter(bet => bet.prop?.sport === sport);
    const settledBets = sportBets.filter(b => b.status !== 'pending');
    const wins = settledBets.filter(b => b.status === 'won').length;
    const losses = settledBets.filter(b => b.status === 'lost').length;
    const pushes = settledBets.filter(b => b.status === 'pushed').length;
    
    const totalWagered = settledBets.reduce((sum, b) => sum + parseFloat(b.amount), 0);
    const totalReturns = settledBets.reduce((sum, b) => {
      if (b.status === 'won') return sum + parseFloat(b.potentialReturn);
      if (b.status === 'pushed') return sum + parseFloat(b.amount); // stake returned
      return sum; // losses return $0
    }, 0);
    
    const clvBets = sportBets.filter(b => b.clv !== null);
    const avgClv = clvBets.length > 0
      ? clvBets.reduce((sum, b) => sum + parseFloat(b.clv!), 0) / clvBets.length
      : 0;

    return {
      sport,
      totalBets: sportBets.length,
      wins,
      losses,
      pushes,
      winRate: settledBets.length > 0 ? (wins / settledBets.length) * 100 : 0,
      totalWagered,
      totalReturns,
      roi: totalWagered > 0 ? ((totalReturns - totalWagered) / totalWagered) * 100 : 0,
      avgClv,
    };
  }).filter(stat => stat.wins + stat.losses + stat.pushes > 0); // Only show sports with settled bets

  // Prepare chart data
  const chartData = sportStats.map(stat => ({
    sport: stat.sport,
    'Win Rate %': parseFloat(stat.winRate.toFixed(1)),
    'ROI %': parseFloat(stat.roi.toFixed(1)),
  }));

  // Calculate CLV distribution
  const settledBetsWithClv = bets.filter(b => b.status !== 'pending' && b.clv !== null);
  const positiveCLV = settledBetsWithClv.filter(b => parseFloat(b.clv!) > 0).length;
  const negativeCLV = settledBetsWithClv.filter(b => parseFloat(b.clv!) < 0).length;
  const neutralCLV = settledBetsWithClv.filter(b => parseFloat(b.clv!) === 0).length;
  
  const clvDistributionData = [
    { name: 'Positive CLV', value: positiveCLV, fill: 'hsl(var(--chart-1))' },
    { name: 'Negative CLV', value: negativeCLV, fill: 'hsl(var(--chart-5))' },
    { name: 'Neutral CLV', value: neutralCLV, fill: 'hsl(var(--muted))' },
  ].filter(item => item.value > 0);

  // Calculate stat-type performance
  type StatTypeStats = {
    statType: string;
    totalBets: number;
    wins: number;
    losses: number;
    winRate: number;
    totalWagered: number;
    totalReturns: number;
    roi: number;
  };

  const statTypeMap = new Map<string, BetWithProp[]>();
  bets.forEach(bet => {
    if (bet.prop?.stat) {
      const existing = statTypeMap.get(bet.prop.stat) || [];
      statTypeMap.set(bet.prop.stat, [...existing, bet]);
    }
  });

  const statTypeStats: StatTypeStats[] = Array.from(statTypeMap.entries())
    .map(([statType, statBets]) => {
      const settledBets = statBets.filter(b => b.status !== 'pending');
      const wins = settledBets.filter(b => b.status === 'won').length;
      const losses = settledBets.filter(b => b.status === 'lost').length;
      const totalWagered = settledBets.reduce((sum, b) => sum + parseFloat(b.amount), 0);
      const totalReturns = settledBets.reduce((sum, b) => {
        if (b.status === 'won') return sum + parseFloat(b.potentialReturn);
        if (b.status === 'pushed') return sum + parseFloat(b.amount);
        return sum;
      }, 0);

      return {
        statType,
        totalBets: statBets.length,
        wins,
        losses,
        winRate: settledBets.length > 0 ? (wins / settledBets.length) * 100 : 0,
        totalWagered,
        totalReturns,
        roi: totalWagered > 0 ? ((totalReturns - totalWagered) / totalWagered) * 100 : 0,
      };
    })
    .filter(stat => stat.wins + stat.losses > 0) // Only show stat types with settled bets
    .sort((a, b) => b.roi - a.roi); // Sort by ROI descending

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-performance">
        <p className="text-muted-foreground">Loading performance data...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-performance">
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="title-performance">Performance Analytics</h1>
        <p className="text-muted-foreground">Sport-specific win rate and ROI breakdown</p>
      </div>

      {sportStats.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <p className="text-center text-muted-foreground" data-testid="text-no-bets">
              No settled bets yet. Place some bets to see your performance stats!
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle data-testid="title-performance-chart">Performance by Sport</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sport" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Win Rate %" fill="hsl(var(--primary))" />
                  <Bar dataKey="ROI %" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* CLV Distribution Chart */}
          {settledBetsWithClv.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle data-testid="title-clv-chart">Closing Line Value Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="w-full md:w-1/2">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={clvDistributionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value, percent }) => 
                            `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                          }
                          outerRadius={80}
                          dataKey="value"
                        >
                          {clvDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-4 w-full md:w-1/2">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">CLV Summary</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Positive CLV Bets:</span>
                          <span className="font-medium text-green-600 dark:text-green-400" data-testid="text-positive-clv">
                            {positiveCLV} ({settledBetsWithClv.length > 0 ? ((positiveCLV / settledBetsWithClv.length) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Negative CLV Bets:</span>
                          <span className="font-medium text-red-600 dark:text-red-400" data-testid="text-negative-clv">
                            {negativeCLV} ({settledBetsWithClv.length > 0 ? ((negativeCLV / settledBetsWithClv.length) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                        {neutralCLV > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Neutral CLV Bets:</span>
                            <span className="font-medium text-muted-foreground" data-testid="text-neutral-clv">
                              {neutralCLV} ({settledBetsWithClv.length > 0 ? ((neutralCLV / settledBetsWithClv.length) * 100).toFixed(1) : 0}%)
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center border-t pt-2">
                          <span className="text-sm font-medium">Total Bets with CLV:</span>
                          <span className="font-bold" data-testid="text-total-clv">{settledBetsWithClv.length}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Positive CLV indicates the line moved in your favor after placing the bet, suggesting edge over the closing market.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stat-Type Performance Analysis */}
          {statTypeStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle data-testid="title-stat-type-table">Stat-Type Performance Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead data-testid="header-stat-type">Stat Type</TableHead>
                      <TableHead data-testid="header-stat-bets">Bets</TableHead>
                      <TableHead data-testid="header-stat-record">Record</TableHead>
                      <TableHead data-testid="header-stat-win-rate">Win Rate</TableHead>
                      <TableHead data-testid="header-stat-roi">ROI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statTypeStats.map((stat) => (
                      <TableRow key={stat.statType} data-testid={`row-stat-${stat.statType.toLowerCase().replace(/\s+/g, '-')}`}>
                        <TableCell className="font-medium" data-testid={`text-stat-type-${stat.statType.toLowerCase().replace(/\s+/g, '-')}`}>
                          {stat.statType}
                        </TableCell>
                        <TableCell data-testid={`text-stat-bets-${stat.statType.toLowerCase().replace(/\s+/g, '-')}`}>
                          {stat.totalBets}
                        </TableCell>
                        <TableCell data-testid={`text-stat-record-${stat.statType.toLowerCase().replace(/\s+/g, '-')}`}>
                          {stat.wins}-{stat.losses}
                        </TableCell>
                        <TableCell data-testid={`text-stat-win-rate-${stat.statType.toLowerCase().replace(/\s+/g, '-')}`}>
                          <span className={stat.winRate >= 52.4 ? 'text-green-600 dark:text-green-400' : ''}>
                            {stat.winRate.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell data-testid={`text-stat-roi-${stat.statType.toLowerCase().replace(/\s+/g, '-')}`}>
                          <span className={stat.roi > 0 ? 'text-green-600 dark:text-green-400' : stat.roi < 0 ? 'text-red-600 dark:text-red-400' : ''}>
                            {stat.roi > 0 ? '+' : ''}{stat.roi.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="text-xs text-muted-foreground mt-4">
                  Sorted by ROI descending. Identifies which prop types (SOG, Points, Assists, etc.) deliver the best returns.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle data-testid="title-stats-table">Sport-Specific Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead data-testid="header-sport">Sport</TableHead>
                    <TableHead data-testid="header-total-bets">Total Bets</TableHead>
                    <TableHead data-testid="header-record">Record</TableHead>
                    <TableHead data-testid="header-win-rate">Win Rate</TableHead>
                    <TableHead data-testid="header-wagered">Wagered</TableHead>
                    <TableHead data-testid="header-returns">Returns</TableHead>
                    <TableHead data-testid="header-roi">ROI</TableHead>
                    <TableHead data-testid="header-avg-clv">Avg CLV</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sportStats.map((stat) => (
                    <TableRow key={stat.sport} data-testid={`row-sport-${stat.sport.toLowerCase()}`}>
                      <TableCell className="font-medium" data-testid={`text-sport-${stat.sport.toLowerCase()}`}>
                        {stat.sport}
                      </TableCell>
                      <TableCell data-testid={`text-total-bets-${stat.sport.toLowerCase()}`}>
                        {stat.totalBets}
                      </TableCell>
                      <TableCell data-testid={`text-record-${stat.sport.toLowerCase()}`}>
                        {stat.wins}-{stat.losses}-{stat.pushes}
                      </TableCell>
                      <TableCell data-testid={`text-win-rate-${stat.sport.toLowerCase()}`}>
                        <span className={stat.winRate >= 52.4 ? 'text-green-600 dark:text-green-400' : ''}>
                          {stat.winRate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell data-testid={`text-wagered-${stat.sport.toLowerCase()}`}>
                        ${stat.totalWagered.toFixed(2)}
                      </TableCell>
                      <TableCell data-testid={`text-returns-${stat.sport.toLowerCase()}`}>
                        ${stat.totalReturns.toFixed(2)}
                      </TableCell>
                      <TableCell data-testid={`text-roi-${stat.sport.toLowerCase()}`}>
                        <span className={stat.roi > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {stat.roi > 0 ? '+' : ''}{stat.roi.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell data-testid={`text-avg-clv-${stat.sport.toLowerCase()}`}>
                        <span className={stat.avgClv > 0 ? 'text-green-600 dark:text-green-400' : stat.avgClv < 0 ? 'text-red-600 dark:text-red-400' : ''}>
                          {stat.avgClv > 0 ? '+' : ''}{stat.avgClv.toFixed(2)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
