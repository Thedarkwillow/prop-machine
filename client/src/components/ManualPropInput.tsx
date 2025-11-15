import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PlusCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ConfidenceBar from "./ConfidenceBar";

const manualPropSchema = z.object({
  sport: z.string().min(1, "Sport is required"),
  player: z.string().min(1, "Player name is required"),
  team: z.string().min(1, "Team is required"),
  opponent: z.string().min(1, "Opponent is required"),
  stat: z.string().min(1, "Stat type is required"),
  line: z.string().min(1, "Line is required"),
  direction: z.enum(["over", "under"]),
  platform: z.string().min(1, "Platform is required"),
});

type ManualPropFormData = z.infer<typeof manualPropSchema>;

export default function ManualPropInput() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const form = useForm<ManualPropFormData>({
    resolver: zodResolver(manualPropSchema),
    defaultValues: {
      sport: "",
      player: "",
      team: "",
      opponent: "",
      stat: "",
      line: "",
      direction: "over",
      platform: "",
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (data: ManualPropFormData) => {
      const res = await apiRequest("POST", "/api/props/analyze", data);
      return await res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "Prop analyzed",
        description: `Confidence: ${data.confidence}% | EV: ${data.ev}%`,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: "Could not analyze this prop. Please try again.",
      });
    },
  });

  const onSubmit = (data: ManualPropFormData) => {
    analyzeMutation.mutate(data);
  };

  const handleClose = () => {
    setOpen(false);
    setResult(null);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-open-manual-prop">
          <PlusCircle className="h-4 w-4 mr-2" />
          Analyze Custom Prop
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Analyze Custom Prop</DialogTitle>
          <DialogDescription>
            Enter prop details to get ML-powered confidence and EV analysis
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sport"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sport</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-manual-sport">
                          <SelectValue placeholder="Select sport" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NHL">NHL</SelectItem>
                        <SelectItem value="NBA">NBA</SelectItem>
                        <SelectItem value="NFL">NFL</SelectItem>
                        <SelectItem value="MLB">MLB</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platform</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-manual-platform">
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PrizePicks">PrizePicks</SelectItem>
                        <SelectItem value="Underdog">Underdog</SelectItem>
                        <SelectItem value="Sleeper">Sleeper</SelectItem>
                        <SelectItem value="Chalkboard">Chalkboard</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="player"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Player Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Connor McDavid"
                      {...field}
                      data-testid="input-manual-player"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="team"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., EDM"
                        {...field}
                        data-testid="input-manual-team"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="opponent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opponent</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., TOR"
                        {...field}
                        data-testid="input-manual-opponent"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="stat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stat</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., SOG"
                        {...field}
                        data-testid="input-manual-stat"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="direction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-manual-direction">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="over">Over</SelectItem>
                        <SelectItem value="under">Under</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="line"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Line</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.5"
                        placeholder="e.g., 3.5"
                        {...field}
                        data-testid="input-manual-line"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {result && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <div className="text-sm font-medium">Analysis Result</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className="font-mono font-bold">{result.confidence}%</span>
                  </div>
                  <ConfidenceBar confidence={result.confidence} showLabel={false} />
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">EV:</span>
                      <span className={`font-mono font-bold ${
                        result.ev >= 5 ? 'text-green-600 dark:text-green-400' : 
                        result.ev >= 0 ? 'text-yellow-600 dark:text-yellow-400' : 
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {result.ev >= 0 ? '+' : ''}{result.ev.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prob:</span>
                      <span className="font-mono text-xs">
                        {(result.modelProbability * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={analyzeMutation.isPending}
                data-testid="button-analyze"
              >
                {analyzeMutation.isPending ? "Analyzing..." : "Analyze"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
