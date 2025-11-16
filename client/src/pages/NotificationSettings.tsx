import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface NotificationPreferences {
  emailEnabled: boolean;
  newPropsEnabled: boolean;
  highConfidenceOnly: boolean;
  minConfidence: number;
  sports: string[];
  platforms: string[];
}

const availableSports = ["NHL", "NBA", "NFL", "MLB"];
const availablePlatforms = ["PrizePicks", "Underdog"];

export default function NotificationSettings() {
  const { toast } = useToast();

  const { data: preferences, isLoading } = useQuery<NotificationPreferences>({
    queryKey: ["/api/notifications/preferences"],
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      return await apiRequest("PATCH", "/api/notifications/preferences", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/preferences"] });
      toast({
        title: "Preferences updated",
        description: "Your notification preferences have been saved",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update preferences",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !preferences) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading preferences...</div>
      </div>
    );
  }

  const handleToggle = (field: keyof NotificationPreferences, value: boolean) => {
    updateMutation.mutate({ [field]: value });
  };

  const handleMinConfidenceChange = (value: number[]) => {
    updateMutation.mutate({ minConfidence: value[0] });
  };

  const handleSportToggle = (sport: string, checked: boolean) => {
    const newSports = checked
      ? [...preferences.sports, sport]
      : preferences.sports.filter(s => s !== sport);
    
    if (newSports.length === 0) {
      toast({
        title: "Error",
        description: "You must select at least one sport",
        variant: "destructive",
      });
      return;
    }
    
    updateMutation.mutate({ sports: newSports });
  };

  const handlePlatformToggle = (platform: string, checked: boolean) => {
    const newPlatforms = checked
      ? [...preferences.platforms, platform]
      : preferences.platforms.filter(p => p !== platform);
    
    if (newPlatforms.length === 0) {
      toast({
        title: "Error",
        description: "You must select at least one platform",
        variant: "destructive",
      });
      return;
    }
    
    updateMutation.mutate({ platforms: newPlatforms });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" data-testid="heading-notification-settings">
          Notification Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage when and how you receive notifications about props and bets
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>General Notifications</CardTitle>
            <CardDescription>
              Control which types of notifications you receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="email-enabled">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email alerts for important notifications
                </p>
              </div>
              <Switch
                id="email-enabled"
                checked={preferences.emailEnabled}
                onCheckedChange={(checked) => handleToggle('emailEnabled', checked)}
                disabled={updateMutation.isPending}
                data-testid="switch-email-enabled"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="new-props">New Props Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when new props matching your preferences are added
                </p>
              </div>
              <Switch
                id="new-props"
                checked={preferences.newPropsEnabled}
                onCheckedChange={(checked) => handleToggle('newPropsEnabled', checked)}
                disabled={updateMutation.isPending}
                data-testid="switch-new-props"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="high-confidence">High Confidence Only</Label>
                <p className="text-sm text-muted-foreground">
                  Only notify for props above your minimum confidence threshold
                </p>
              </div>
              <Switch
                id="high-confidence"
                checked={preferences.highConfidenceOnly}
                onCheckedChange={(checked) => handleToggle('highConfidenceOnly', checked)}
                disabled={updateMutation.isPending}
                data-testid="switch-high-confidence"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Confidence Threshold</CardTitle>
            <CardDescription>
              Minimum confidence level for high-confidence notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <Label>Minimum Confidence</Label>
                <span className="text-2xl font-bold text-primary" data-testid="text-min-confidence">
                  {preferences.minConfidence}%
                </span>
              </div>
              <Slider
                value={[preferences.minConfidence]}
                onValueChange={handleMinConfidenceChange}
                min={60}
                max={95}
                step={5}
                disabled={updateMutation.isPending}
                data-testid="slider-min-confidence"
              />
              <p className="text-sm text-muted-foreground">
                Props with confidence scores above {preferences.minConfidence}% will trigger notifications
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sports Preferences</CardTitle>
            <CardDescription>
              Choose which sports you want to receive notifications for
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {availableSports.map((sport) => (
                <div key={sport} className="flex items-center space-x-2">
                  <Checkbox
                    id={`sport-${sport}`}
                    checked={preferences.sports.includes(sport)}
                    onCheckedChange={(checked) => handleSportToggle(sport, checked as boolean)}
                    disabled={updateMutation.isPending}
                    data-testid={`checkbox-sport-${sport.toLowerCase()}`}
                  />
                  <Label htmlFor={`sport-${sport}`} className="font-normal cursor-pointer">
                    {sport}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Preferences</CardTitle>
            <CardDescription>
              Choose which platforms you want to receive notifications for
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {availablePlatforms.map((platform) => (
                <div key={platform} className="flex items-center space-x-2">
                  <Checkbox
                    id={`platform-${platform}`}
                    checked={preferences.platforms.includes(platform)}
                    onCheckedChange={(checked) => handlePlatformToggle(platform, checked as boolean)}
                    disabled={updateMutation.isPending}
                    data-testid={`checkbox-platform-${platform.toLowerCase()}`}
                  />
                  <Label htmlFor={`platform-${platform}`} className="font-normal cursor-pointer">
                    {platform}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
