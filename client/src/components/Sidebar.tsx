import { BarChart3, TrendingUp, Activity, Settings, Target, Sparkles, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";

export default function Sidebar() {
  const [location] = useLocation();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, path: '/' },
    { id: 'history', label: 'Bet History', icon: History, path: '/history' },
    { id: 'slips', label: 'Slips', icon: Sparkles, path: '/slips' },
    { id: 'props', label: 'Props Feed', icon: Target, path: '/props' },
    { id: 'performance', label: 'Performance', icon: TrendingUp, path: '/performance' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings/notifications' }
  ];

  return (
    <div className="w-64 h-screen border-r bg-sidebar flex flex-col">
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold">PM</span>
          </div>
          <div>
            <h1 className="font-bold text-lg">Prop Machine</h1>
            <p className="text-xs text-muted-foreground">NHL Props</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link key={item.id} href={item.path}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className="w-full justify-start"
                data-testid={`nav-${item.id}`}
              >
                <Icon className="h-4 w-4 mr-3" />
                {item.label}
                {item.badge && (
                  <Badge variant="destructive" className="ml-auto">
                    {item.badge}
                  </Badge>
                )}
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="p-3 rounded-md bg-primary/10 border border-primary/20">
          <p className="text-xs font-medium mb-1">Micro Bankroll Mode</p>
          <p className="text-xs text-muted-foreground">
            $10 - $50 tier active
          </p>
        </div>
      </div>
    </div>
  );
}
