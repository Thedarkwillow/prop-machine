import { Copy, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ConfidenceBar from "./ConfidenceBar";

interface Pick {
  player: string;
  stat: string;
  line: number;
  direction: 'over' | 'under';
  confidence: number;
}

interface SlipCardProps {
  title: string;
  type: 'conservative' | 'balanced' | 'aggressive';
  picks: Pick[];
  confidence: number;
  suggestedBet: number;
  potentialReturn: number;
  platform: string;
}

export default function SlipCard({
  title,
  type,
  picks,
  confidence,
  suggestedBet,
  potentialReturn,
  platform
}: SlipCardProps) {
  const typeColors = {
    conservative: 'border-green-500',
    balanced: 'border-blue-500',
    aggressive: 'border-orange-500'
  };

  const typeBadgeVariants = {
    conservative: 'default',
    balanced: 'secondary',
    aggressive: 'destructive'
  } as const;

  const handleCopy = () => {
    console.log('Slip copied to clipboard');
  };

  const handleOpenPlatform = () => {
    console.log(`Opening ${platform}`);
  };

  return (
    <Card className={`p-4 border-l-4 ${typeColors[type]}`} data-testid={`card-slip-${type}`}>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">{title}</h3>
            <Badge variant={typeBadgeVariants[type]} className="mt-1 capitalize">
              {type}
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Confidence</p>
            <p className="text-2xl font-bold font-mono" data-testid="text-slip-confidence">{confidence}%</p>
          </div>
        </div>

        <div className="space-y-2">
          {picks.map((pick, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className={`h-2 w-2 rounded-full ${
                pick.confidence >= 80 ? 'bg-green-500' : 
                pick.confidence >= 65 ? 'bg-yellow-500' : 
                'bg-red-500'
              }`} />
              <span className="font-medium flex-1">
                {pick.player} {pick.direction === 'over' ? 'Over' : 'Under'} {pick.line} {pick.stat}
              </span>
              <span className="font-mono text-xs text-muted-foreground">{pick.confidence}</span>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Suggested Bet:</span>
            <span className="font-mono font-bold">${suggestedBet.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Potential Return:</span>
            <span className="font-mono font-bold text-green-600 dark:text-green-400">
              ${potentialReturn.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Platform:</span>
            <span className="font-medium">{platform}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleCopy}
            data-testid="button-copy-slip"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={handleOpenPlatform}
            data-testid="button-open-platform"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open {platform}
          </Button>
        </div>
      </div>
    </Card>
  );
}
