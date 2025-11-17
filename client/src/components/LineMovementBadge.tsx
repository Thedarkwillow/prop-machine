import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";

interface LineMovementBadgeProps {
  lineMovement?: {
    previousLine: number;
    currentLine: number;
    change: number;
    timestamp: Date | string;
  } | null;
  direction: "over" | "under";
}

export default function LineMovementBadge({ lineMovement, direction }: LineMovementBadgeProps) {
  if (!lineMovement) {
    return null;
  }

  const { previousLine, currentLine, change, timestamp } = lineMovement;
  
  const absChange = Math.abs(change);
  const isSteamMove = absChange >= 1.0;
  
  // Over bettors want the line to go DOWN (easier to hit)
  // Under bettors want the line to go UP (easier to hit)
  const isFavorable = direction === "over" 
    ? change < 0
    : change > 0;

  const movementColor = isFavorable 
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";

  const Icon = change > 0 ? TrendingUp : TrendingDown;

  const timestampDate = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const timeAgo = formatDistanceToNow(timestampDate, { addSuffix: true });

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1" data-testid="line-movement-badge">
            {isSteamMove && (
              <Badge 
                variant="destructive" 
                className="h-5 px-1.5 text-xs font-bold"
                data-testid="badge-steam-move"
              >
                <Activity className="h-3 w-3 mr-0.5" />
                STEAM
              </Badge>
            )}
            <div className={`flex items-center gap-1 ${movementColor}`}>
              <Icon className="h-3 w-3" data-testid={`icon-movement-${change > 0 ? 'up' : 'down'}`} />
              <span className="font-mono text-xs font-medium" data-testid="text-line-change">
                {previousLine} → {currentLine}
              </span>
              <span className="font-mono text-xs" data-testid="text-change-amount">
                ({change > 0 ? '+' : ''}{change.toFixed(1)})
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <div>Line moved {timeAgo}</div>
            <div className="text-muted-foreground mt-1">
              {isFavorable ? 'Favorable' : 'Unfavorable'} for {direction === 'over' ? 'Over' : 'Under'} bettors
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
