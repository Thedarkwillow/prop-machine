import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, subDays, startOfDay } from "date-fns";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Check, X, Minus, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const USER_ID = 1;

type BetWithProp = {
  id: number;
  userId: number;
  slipId: number | null;
  propId: number | null;
  amount: string;
  odds: string;
  potentialReturn: string;
  status: "pending" | "won" | "lost" | "pushed";
  openingLine: string | null;
  closingLine: string | null;
  clv: string | null;
  settledAt: Date | null;
  createdAt: Date;
  prop?: {
    player: string;
    team: string;
    sport: string;
    stat: string;
    line: string;
    direction: "over" | "under";
  };
  slip?: {
    id: number;
    title: string;
    picks: any[];
    confidence: number;
    platform: string;
  };
};

export default function BetHistory() {
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedOutcome, setSelectedOutcome] = useState('all');
  const [selectedDateRange, setSelectedDateRange] = useState('all');

  const { data: bets = [], isLoading } = useQuery<BetWithProp[]>({
    queryKey: ['/api/bets', USER_ID],
  });

  const { data: user } = useQuery({
    queryKey: ['/api/user', USER_ID],
  });

  // Mutation for settling bets
  const settleBetMutation = useMutation({
    mutationFn: async ({ betId, outcome }: { betId: number; outcome: 'won' | 'lost' | 'pushed' }) => {
      return await apiRequest('PATCH', `/api/bets/${betId}/settle`, { status: outcome });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/bets', USER_ID] });
      queryClient.invalidateQueries({ queryKey: ['/api/user', USER_ID] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard', USER_ID] });
      
      const outcomeLabels = { won: 'Won', lost: 'Lost', pushed: 'Pushed' };
      const bankrollChange = data.bankrollChange || 0;
      
      toast({
        title: `Bet Settled: ${outcomeLabels[variables.outcome]}`,
        description: bankrollChange > 0 
          ? `Bankroll updated: +$${bankrollChange.toFixed(2)}`
          : variables.outcome === 'lost'
          ? 'Better luck next time!'
          : 'Bet amount refunded',
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to settle bet",
        description: error.message || "An error occurred while settling the bet",
      });
    },
  });

  // Filter bets
  const filteredBets = bets.filter((bet) => {
    // For slip-based bets, search in slip picks
    let matchesSearch = true;
    if (searchQuery) {
      if (bet.slip) {
        matchesSearch = bet.slip.picks.some((pick: any) => 
          pick.player?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      } else {
        matchesSearch = bet.prop?.player?.toLowerCase().includes(searchQuery.toLowerCase()) ?? true;
      }
    }
    
    // For slip-based bets, check sport across all picks
    let matchesSport = true;
    if (selectedSport !== 'all') {
      if (bet.slip) {
        // Check if any pick matches the sport (defensive: allow undefined sport)
        matchesSport = bet.slip.picks.some((pick: any) => 
          pick.sport === selectedSport || !pick.sport
        );
      } else {
        matchesSport = bet.prop?.sport === selectedSport;
      }
    }
    
    const matchesOutcome = selectedOutcome === 'all' || bet.status === selectedOutcome;
    
    // Date range filtering
    let matchesDate = true;
    if (selectedDateRange !== 'all') {
      const betDate = new Date(bet.createdAt);
      const daysAgo = parseInt(selectedDateRange);
      const cutoffDate = startOfDay(subDays(new Date(), daysAgo));
      matchesDate = betDate >= cutoffDate;
    }
    
    return matchesSearch && matchesSport && matchesOutcome && matchesDate;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      won: "default",
      lost: "destructive",
      pending: "secondary",
      pushed: "outline",
    };
    return (
      <Badge variant={variants[status] || "secondary"} data-testid={`badge-status-${status}`}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getClvDisplay = (clv: string | null, status: string) => {
    if (!clv || status === "pending") return "-";
    const clvNum = parseFloat(clv);
    const isPositive = clvNum >= 0;
    return (
      <span className={isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
        {isPositive ? "+" : ""}{clvNum.toFixed(1)}%
      </span>
    );
  };

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
          alertCount={0}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold">Bet History</h1>
                <p className="text-muted-foreground mt-1">
                  Track all your placed bets and performance
                </p>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-2" data-testid="badge-total-bets">
                {filteredBets.length} / {bets.length} Bets
              </Badge>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Select value={selectedSport} onValueChange={setSelectedSport}>
                <SelectTrigger className="w-32" data-testid="select-sport">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sports</SelectItem>
                  <SelectItem value="NHL">NHL</SelectItem>
                  <SelectItem value="NBA">NBA</SelectItem>
                  <SelectItem value="NFL">NFL</SelectItem>
                  <SelectItem value="MLB">MLB</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedOutcome} onValueChange={setSelectedOutcome}>
                <SelectTrigger className="w-32" data-testid="select-outcome">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="pushed">Pushed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
                <SelectTrigger className="w-40" data-testid="select-date-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search player..."
                  className="pl-10 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading bet history...
              </div>
            ) : bets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">No bets placed yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Start placing bets from the dashboard to track your performance
                </p>
              </div>
            ) : filteredBets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">No bets match your filters</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Date</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Sport</TableHead>
                      <TableHead>Stat</TableHead>
                      <TableHead className="text-right">Line</TableHead>
                      <TableHead>Dir</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Odds</TableHead>
                      <TableHead className="text-right">Return</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">CLV</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBets.map((bet) => {
                      const isParlay = bet.slip && bet.slip.picks && bet.slip.picks.length > 1;
                      const pickCount = bet.slip?.picks?.length || 1;
                      
                      return (
                        <TableRow key={bet.id} data-testid={`row-bet-${bet.id}`}>
                          <TableCell className="font-medium" data-testid={`text-date-${bet.id}`}>
                            {format(new Date(bet.createdAt), "MMM d, h:mm a")}
                          </TableCell>
                          <TableCell data-testid={`text-player-${bet.id}`}>
                            {isParlay ? (
                              <div className="flex items-center gap-2">
                                <Badge variant="default">{pickCount}-Pick Parlay</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {bet.slip.picks.map((p: any) => p.player).join(", ").slice(0, 30)}...
                                </span>
                              </div>
                            ) : (
                              bet.prop?.player || "-"
                            )}
                          </TableCell>
                          <TableCell data-testid={`text-sport-${bet.id}`}>
                            {isParlay ? (
                              <Badge variant="outline">Multi</Badge>
                            ) : (
                              <Badge variant="outline">{bet.prop?.sport || "-"}</Badge>
                            )}
                          </TableCell>
                          <TableCell data-testid={`text-stat-${bet.id}`}>
                            {isParlay ? `${pickCount} picks` : (bet.prop?.stat || "-")}
                          </TableCell>
                          <TableCell className="text-right font-mono" data-testid={`text-line-${bet.id}`}>
                            {isParlay ? "-" : (bet.prop?.line || "-")}
                          </TableCell>
                          <TableCell data-testid={`text-direction-${bet.id}`}>
                            {isParlay ? (
                              <Badge variant="secondary">Mix</Badge>
                            ) : (
                              <Badge variant={bet.prop?.direction === "over" ? "default" : "secondary"}>
                                {bet.prop?.direction === "over" ? "O" : "U"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono" data-testid={`text-amount-${bet.id}`}>
                            ${parseFloat(bet.amount).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono" data-testid={`text-odds-${bet.id}`}>
                            {parseFloat(bet.odds).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono" data-testid={`text-return-${bet.id}`}>
                            ${parseFloat(bet.potentialReturn).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(bet.status)}
                          </TableCell>
                          <TableCell className="text-right font-mono" data-testid={`text-clv-${bet.id}`}>
                            {getClvDisplay(bet.clv, bet.status)}
                          </TableCell>
                          <TableCell className="text-center">
                            {bet.status === 'pending' ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    data-testid={`button-settle-${bet.id}`}
                                    disabled={settleBetMutation.isPending}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    onClick={() => settleBetMutation.mutate({ betId: bet.id, outcome: 'won' })}
                                    data-testid={`action-won-${bet.id}`}
                                  >
                                    <Check className="h-4 w-4 mr-2 text-green-600" />
                                    Mark as Won
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => settleBetMutation.mutate({ betId: bet.id, outcome: 'lost' })}
                                    data-testid={`action-lost-${bet.id}`}
                                  >
                                    <X className="h-4 w-4 mr-2 text-red-600" />
                                    Mark as Lost
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => settleBetMutation.mutate({ betId: bet.id, outcome: 'pushed' })}
                                    data-testid={`action-pushed-${bet.id}`}
                                  >
                                    <Minus className="h-4 w-4 mr-2 text-gray-600" />
                                    Mark as Pushed
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <span className="text-xs text-muted-foreground">Settled</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
