import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Goal {
  label: string;
  target: string;
  current: string;
  achieved: boolean;
}

interface Week1ProgressProps {
  day: number;
  betsPlaced: number;
  goals: Goal[];
}

export default function Week1Progress({ day, betsPlaced, goals }: Week1ProgressProps) {
  const betsTarget = 20;
  const betsProgress = (betsPlaced / betsTarget) * 100;

  return (
    <Card className="p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Week 1 Validation</h2>
            <p className="text-sm text-muted-foreground">Day {day} of 7 - Building your edge</p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {betsPlaced}/{betsTarget} Bets
          </Badge>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Bets Progress</span>
            <span className="font-mono font-medium">{betsProgress.toFixed(0)}%</span>
          </div>
          <Progress value={betsProgress} className="h-3" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {goals.map((goal, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-md bg-background/50 border"
              data-testid={`goal-${i}`}
            >
              {goal.achieved ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{goal.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Target: {goal.target} · Current: {goal.current}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
