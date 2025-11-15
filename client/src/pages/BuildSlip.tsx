import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import SlipBuilder from "@/components/SlipBuilder";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Prop } from "@shared/schema";

const USER_ID = 1;

export default function BuildSlip() {
  const [selectedSport, setSelectedSport] = useState('NHL');
  const { toast } = useToast();

  // Fetch props for selected sport
  const { data: props = [], isLoading, isError } = useQuery<Prop[]>({
    queryKey: ['/api/props', selectedSport],
  });

  // Fetch user data for bankroll info
  const { data: user } = useQuery({
    queryKey: ['/api/user', USER_ID],
  });

  useEffect(() => {
    if (isError) {
      toast({
        variant: "destructive",
        title: "Error loading props",
        description: "Failed to fetch props feed. Please refresh the page.",
      });
    }
  }, [isError, toast]);

  // Mutation for creating slip
  const createSlipMutation = useMutation({
    mutationFn: async (slipData: any) => {
      const response = await apiRequest('POST', `/api/slips`, slipData);
      return await response.json();
    },
  });

  // Mutation for placing a bet
  const placeBetMutation = useMutation({
    mutationFn: async (betData: any) => {
      const response = await apiRequest('POST', `/api/bets/${USER_ID}`, betData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bets', USER_ID] });
      queryClient.invalidateQueries({ queryKey: ['/api/user', USER_ID] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard', USER_ID] });
      queryClient.invalidateQueries({ queryKey: ['/api/slips', USER_ID] });
    },
  });

  const handlePlaceSlip = async (propIds: number[]) => {
    if (!user || propIds.length === 0) return;

    const selectedPropsList = props.filter(p => propIds.includes(p.id));
    const avgConfidence = Math.round(
      selectedPropsList.reduce((sum, p) => sum + p.confidence, 0) / selectedPropsList.length
    );
    
    // Calculate Kelly bet size (simplified - 1% of bankroll per parlay leg)
    const bankroll = parseFloat(user.bankroll || '100');
    const betAmount = Math.max(5, Math.min(bankroll * 0.01 * selectedPropsList.length, bankroll * 0.1));
    
    // Typical parlay odds calculation
    const avgOdds = 1.91;
    const parlayOdds = Math.pow(avgOdds, selectedPropsList.length);
    const potentialReturn = betAmount * parlayOdds;

    try {
      // First, create a slip with all the props
      const slipData = {
        userId: USER_ID,
        type: 'balanced' as const,
        title: `${selectedPropsList.length}-Pick Custom Parlay`,
        picks: selectedPropsList.map(p => ({
          propId: p.id,
          player: p.player,
          team: p.team,
          sport: p.sport,
          stat: p.stat,
          line: p.line,
          direction: p.direction,
          confidence: p.confidence,
        })),
        confidence: avgConfidence,
        suggestedBet: betAmount.toFixed(2),
        potentialReturn: potentialReturn.toFixed(2),
        platform: 'Custom',
        status: 'pending' as const,
      };

      const slip = await createSlipMutation.mutateAsync(slipData);

      // Then place the bet referencing the slip
      const betData = {
        userId: USER_ID,
        slipId: slip.id,
        propId: null, // Parlay bets reference the slip, not individual props
        amount: betAmount.toFixed(2),
        odds: parlayOdds.toFixed(2),
        potentialReturn: potentialReturn.toFixed(2),
        status: 'pending' as const,
        openingLine: null,
      };

      const result = await placeBetMutation.mutateAsync(betData);

      if (result.error) {
        toast({
          variant: "destructive",
          title: "Bet Placement Failed",
          description: result.error,
        });
      } else {
        toast({
          title: "Bet Placed Successfully!",
          description: `$${betAmount.toFixed(2)} placed on ${selectedPropsList.length}-pick parlay. Potential return: $${potentialReturn.toFixed(2)}`,
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Placing Bet",
        description: error.message || "Failed to place bet. Please try again.",
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold" data-testid="heading-build-slip">Build Your Slip</h1>
          <p className="text-muted-foreground">Create your own parlay with correlation analysis</p>
        </div>

        {/* Sport Filter */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Select Sport:</label>
          <Select value={selectedSport} onValueChange={setSelectedSport}>
            <SelectTrigger className="w-[180px]" data-testid="select-sport">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NHL">NHL</SelectItem>
              <SelectItem value="NBA">NBA</SelectItem>
              <SelectItem value="NFL">NFL</SelectItem>
              <SelectItem value="MLB">MLB</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Slip Builder */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-lg font-medium">Loading props...</div>
            <p className="text-sm text-muted-foreground mt-2">Fetching {selectedSport} propositions</p>
          </div>
        ) : (
          <SlipBuilder
            availableProps={props}
            onPlaceSlip={handlePlaceSlip}
          />
        )}
      </div>
    </div>
  );
}
