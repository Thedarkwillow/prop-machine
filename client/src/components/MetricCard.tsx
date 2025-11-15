import { ArrowDown, ArrowUp } from "lucide-react";
import { Card } from "@/components/ui/card";

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: number;
  suffix?: string;
  mono?: boolean;
}

export default function MetricCard({ label, value, change, suffix = "", mono = false }: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;
  
  return (
    <Card className="p-6 hover-elevate" data-testid={`card-metric-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className={`text-3xl font-bold ${mono ? 'font-mono' : ''}`} data-testid={`text-${label.toLowerCase().replace(/\s+/g, '-')}`}>
            {value}{suffix}
          </p>
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {isPositive ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            <span className="font-medium">{Math.abs(change)}%</span>
            <span className="text-muted-foreground">vs last week</span>
          </div>
        )}
      </div>
    </Card>
  );
}
