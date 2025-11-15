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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
