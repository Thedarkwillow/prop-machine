import { Bell, Menu, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

interface DashboardHeaderProps {
  bankroll: number;
  alertCount: number;
  onMenuClick?: () => void;
}

export default function DashboardHeader({ bankroll, alertCount, onMenuClick }: DashboardHeaderProps) {
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
    console.log('Dark mode toggled:', !darkMode);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-4 md:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
          data-testid="button-menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">PM</span>
          </div>
          <span className="font-bold text-lg hidden sm:inline">Prop Machine</span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-card border">
            <span className="text-sm text-muted-foreground">Bankroll:</span>
            <span className="font-mono font-bold text-lg" data-testid="text-bankroll">
              ${bankroll.toFixed(2)}
            </span>
          </div>

          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              data-testid="button-alerts"
              onClick={() => console.log('Alerts clicked')}
            >
              <Bell className="h-5 w-5" />
            </Button>
            {alertCount > 0 && (
              <Badge
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                variant="destructive"
                data-testid="badge-alert-count"
              >
                {alertCount}
              </Badge>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            data-testid="button-theme-toggle"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-user-menu">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground text-sm font-medium">U</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => console.log('Settings clicked')}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => console.log('Logout clicked')}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
