import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
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

  useEffect(() => {
    if (isError) {
      toast({
        variant: "destructive",
        title: "Error loading props",
        description: "Failed to fetch props feed. Please refresh the page.",
      });
    }
  }, [isError, toast]);

  const handlePlaceSlip = (propIds: number[]) => {
    // TODO: Implement slip placement
    toast({
      title: "Slip Placement",
      description: `Placing slip with ${propIds.length} props...`,
    });
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
