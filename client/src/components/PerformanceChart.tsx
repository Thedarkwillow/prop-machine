import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface DataPoint {
  date: string;
  value: number;
}

interface PerformanceChartProps {
  title: string;
  data: DataPoint[];
  dataKey?: string;
  color?: string;
}

export default function PerformanceChart({ 
  title, 
  data, 
  color = 'hsl(var(--primary))' 
}: PerformanceChartProps) {
  return (
    <Card className="p-6">
      <h3 className="font-semibold text-lg mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="date" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={color}
            strokeWidth={2}
            fill="url(#colorValue)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
