import { BarChart3, TrendingUp, Activity, Settings, Target, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface SidebarProps {
  currentPage?: string;
}

export default function Sidebar({ currentPage = 'dashboard' }: SidebarProps) {
  const [activePage, setActivePage] = useState(currentPage);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'slips', label: 'Slips', icon: Sparkles, badge: 3 },
    { id: 'props', label: 'Props Feed', icon: Target },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'models', label: 'Models', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="w-64 h-screen border-r bg-sidebar flex flex-col">
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold">PF</span>
          </div>
          <div>
            <h1 className="font-bold text-lg">PickFinder</h1>
            <p className="text-xs text-muted-foreground">NHL Props</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => {
                setActivePage(item.id);
                console.log('Navigate to:', item.id);
              }}
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
