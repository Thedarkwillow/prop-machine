import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import ConfidenceBar from "./ConfidenceBar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Prop {
  id: string;
  player: string;
  team: string;
  stat: string;
  line: number;
  currentLine?: number | null;
  direction: string;
  confidence: number;
  ev: number;
  platform: string;
}

interface LineMovement {
  delta: number;
  isFavorable: boolean;
  hasMovement: boolean;
}

interface PropsTableProps {
  props: Prop[];
  userId: number;
}

interface User {
  id: number;
  bankroll: string;
  kellyMultiplier: string;
}

function getLineMovement(prop: Prop): LineMovement {
  if (prop.currentLine === null || prop.currentLine === undefined || prop.currentLine === prop.line) {
    return { delta: 0, isFavorable: false, hasMovement: false };
  }
  
  const delta = prop.currentLine - prop.line;
  const isFavorable = prop.direction === 'over' ? delta > 0 : delta < 0;
  
  return { delta, isFavorable, hasMovement: true };
}

export default function PropsTable({ props, userId }: PropsTableProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProp, setSelectedProp] = useState<Prop | null>(null);
  const [betAmount, setBetAmount] = useState("");
  const { toast } = useToast();

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ['/api/user', userId],
  });

  const placeBetMutation = useMutation({
    mutationFn: async (data: { 
      propId: number; 
      amount: number; 
      odds: number; 
      direction: string;
      openingLine: number;
    }) => {
      return await apiRequest("POST", `/api/bets/${userId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bets', userId] });
      queryClient.invalidateQueries({ queryKey: ['/api/user', userId] });
      toast({
        title: "Bet Placed",
        description: "Your bet has been placed successfully!",
      });
      setIsModalOpen(false);
      setBetAmount("");
      setSelectedProp(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to place bet",
        variant: "destructive",
      });
    },
  });

  const handleOpenModal = (prop: Prop) => {
    if (userLoading || !user) {
      toast({
        title: "Loading",
        description: "Please wait while we load your account data...",
      });
      return;
    }
    
    setSelectedProp(prop);
    // Calculate Kelly-suggested bet amount (simplified)
    const bankroll = parseFloat(user.bankroll ?? "0");
    const suggestedAmount = Math.max(5, bankroll * 0.02); // 2% of bankroll minimum $5
    setBetAmount(suggestedAmount.toFixed(2));
    setIsModalOpen(true);
  };

  const handlePlaceBet = () => {
    if (!selectedProp || !betAmount) return;
    
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid bet amount greater than $0",
        variant: "destructive",
      });
      return;
    }
    
    const odds = 1.91; // Simplified - would be calculated from prop data
    placeBetMutation.mutate({
      propId: parseInt(selectedProp.id),
      amount,
      odds,
      direction: selectedProp.direction, // Snapshot prop direction at bet time
      openingLine: selectedProp.line, // Snapshot opening line at bet time
    });
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Player</TableHead>
            <TableHead>Prop</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead className="text-right">EV</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.map((prop) => (
            <TableRow key={prop.id} className="hover-elevate">
              <TableCell>
                <div>
                  <div className="font-medium">{prop.player}</div>
                  <div className="text-sm text-muted-foreground">{prop.team}</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={prop.direction === 'over' ? 'default' : 'secondary'} className="text-xs">
                      {prop.direction === 'over' ? 'O' : 'U'}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-medium">{prop.line}</span>
                      {(() => {
                        const movement = getLineMovement(prop);
                        if (!movement.hasMovement) return null;
                        const Icon = movement.delta > 0 ? TrendingUp : TrendingDown;
                        return (
                          <div 
                            className={`flex items-center gap-0.5 text-xs ${
                              movement.isFavorable 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}
                            data-testid={`line-movement-${prop.id}`}
                          >
                            <Icon className="h-3 w-3" />
                            <span className="font-mono">{movement.delta > 0 ? '+' : ''}{movement.delta.toFixed(1)}</span>
                          </div>
                        );
                      })()}
                    </div>
                    <Badge variant="outline" className="text-xs">{prop.stat}</Badge>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="w-32">
                  <ConfidenceBar confidence={prop.confidence} showLabel={false} />
                </div>
              </TableCell>
              <TableCell className="text-right">
                <span className={`font-mono font-bold ${
                  prop.ev >= 5 ? 'text-green-600 dark:text-green-400' : 
                  prop.ev >= 0 ? 'text-yellow-600 dark:text-yellow-400' : 
                  'text-red-600 dark:text-red-400'
                }`}>
                  {prop.ev >= 0 ? '+' : ''}{prop.ev.toFixed(1)}%
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm">{prop.platform}</span>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleOpenModal(prop)}
                  data-testid={`button-place-bet-${prop.id}`}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Bet
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent data-testid="dialog-place-bet">
          <DialogHeader>
            <DialogTitle>Place Bet</DialogTitle>
            <DialogDescription>
              Enter your bet amount to place this bet
            </DialogDescription>
          </DialogHeader>
          {selectedProp && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-md space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Player:</span>
                  <span className="font-medium">{selectedProp.player}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Prop:</span>
                  <span className="font-medium">
                    {selectedProp.direction === 'over' ? 'Over' : 'Under'} {selectedProp.line} {selectedProp.stat}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Confidence:</span>
                  <span className="font-mono font-bold">{selectedProp.confidence}%</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bet-amount">Bet Amount ($)</Label>
                <Input
                  id="bet-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  data-testid="input-bet-amount"
                />
                <p className="text-xs text-muted-foreground">
                  Suggested: ${betAmount} (based on Kelly Criterion)
                </p>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <div className="flex justify-between text-sm">
                  <span>Potential Return:</span>
                  <span className="font-mono font-bold text-green-600 dark:text-green-400">
                    ${(parseFloat(betAmount || "0") * 1.91).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              data-testid="button-cancel-bet"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePlaceBet}
              disabled={placeBetMutation.isPending || !betAmount || parseFloat(betAmount) <= 0}
              data-testid="button-confirm-bet"
            >
              {placeBetMutation.isPending ? "Placing..." : "Place Bet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
