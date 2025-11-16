import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, MessageSquare, Trash2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";

const discordSettingsSchema = z.object({
  webhookUrl: z.string().url("Must be a valid Discord webhook URL"),
  enabled: z.boolean(),
  notifyNewProps: z.boolean(),
  notifyLineMovements: z.boolean(),
  notifyBetSettlement: z.boolean(),
  minConfidence: z.number().min(50).max(100),
});

type DiscordSettingsForm = z.infer<typeof discordSettingsSchema>;

export default function DiscordSettings() {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: settings, isLoading } = useQuery<any>({
    queryKey: ["/api/discord/settings"],
  });

  const form = useForm<DiscordSettingsForm>({
    resolver: zodResolver(discordSettingsSchema),
    values: settings || {
      webhookUrl: "",
      enabled: true,
      notifyNewProps: true,
      notifyLineMovements: true,
      notifyBetSettlement: true,
      minConfidence: 70,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: DiscordSettingsForm) => {
      return await apiRequest("POST", "/api/discord/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discord/settings"] });
      toast({
        title: "Settings saved",
        description: "Your Discord notification settings have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save Discord settings.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", "/api/discord/settings");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discord/settings"] });
      toast({
        title: "Settings deleted",
        description: "Discord notifications have been disabled.",
      });
      form.reset({
        webhookUrl: "",
        enabled: true,
        notifyNewProps: true,
        notifyLineMovements: true,
        notifyBetSettlement: true,
        minConfidence: 70,
      });
      setIsDeleting(false);
    },
  });

  const onSubmit = (data: DiscordSettingsForm) => {
    saveMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Discord Notifications</h1>
        <p className="text-muted-foreground">
          Get real-time prop alerts delivered directly to your Discord server
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Discord Webhook Setup
          </CardTitle>
          <CardDescription>
            Create a webhook in your Discord server settings, then paste the URL below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="webhookUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Webhook URL</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="https://discord.com/api/webhooks/..."
                        data-testid="input-webhook-url"
                      />
                    </FormControl>
                    <FormDescription>
                      Server Settings → Integrations → Webhooks → New Webhook
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-4 gap-4">
                    <div className="space-y-0.5">
                      <FormLabel>Enable Discord Notifications</FormLabel>
                      <FormDescription>
                        Master switch for all Discord notifications
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-enabled"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <h3 className="font-semibold">Notification Types</h3>

                <FormField
                  control={form.control}
                  name="notifyNewProps"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border p-3 gap-4">
                      <div className="space-y-0.5">
                        <FormLabel>New Props</FormLabel>
                        <FormDescription className="text-sm">
                          When new high-confidence props are added
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-new-props"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notifyLineMovements"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border p-3 gap-4">
                      <div className="space-y-0.5">
                        <FormLabel>Line Movements</FormLabel>
                        <FormDescription className="text-sm">
                          Steam moves (1+ point movement in 15 minutes)
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-line-movements"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notifyBetSettlement"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border p-3 gap-4">
                      <div className="space-y-0.5">
                        <FormLabel>Bet Settlements</FormLabel>
                        <FormDescription className="text-sm">
                          When your bets are settled (win/loss)
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-bet-settlement"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="minConfidence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Confidence: {field.value}%</FormLabel>
                    <FormControl>
                      <Slider
                        min={50}
                        max={100}
                        step={5}
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                        data-testid="slider-min-confidence"
                      />
                    </FormControl>
                    <FormDescription>
                      Only notify for props above this confidence level
                    </FormDescription>
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between gap-4">
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  data-testid="button-save-settings"
                >
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Save Settings
                </Button>

                {settings && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      if (isDeleting) {
                        deleteMutation.mutate();
                      } else {
                        setIsDeleting(true);
                        setTimeout(() => setIsDeleting(false), 3000);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    data-testid="button-delete-settings"
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    {isDeleting ? "Click again to confirm" : "Delete"}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">How to create a Discord webhook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Open your Discord server</p>
          <p>2. Go to Server Settings → Integrations</p>
          <p>3. Click "Webhooks" → "New Webhook"</p>
          <p>4. Give it a name (e.g., "Prop Machine")</p>
          <p>5. Select the channel where you want notifications</p>
          <p>6. Click "Copy Webhook URL" and paste it above</p>
        </CardContent>
      </Card>
    </div>
  );
}
