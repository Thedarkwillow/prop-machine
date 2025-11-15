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
import { Plus } from "lucide-react";
import ConfidenceBar from "./ConfidenceBar";

interface Prop {
  id: string;
  player: string;
  team: string;
  stat: string;
  line: number;
  direction: string;
  confidence: number;
  ev: number;
  platform: string;
}

interface PropsTableProps {
  props: Prop[];
}

export default function PropsTable({ props }: PropsTableProps) {
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
                    <span className="font-mono font-medium">{prop.line}</span>
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
                  variant="ghost"
                  onClick={() => console.log('Add prop:', prop.id)}
                  data-testid={`button-add-prop-${prop.id}`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
