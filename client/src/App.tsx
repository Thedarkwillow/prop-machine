import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, History, TrendingUp, Plus } from "lucide-react";
import Dashboard from "@/pages/Dashboard";
import BetHistory from "@/pages/BetHistory";
import Performance from "@/pages/Performance";
import BuildSlip from "@/pages/BuildSlip";
import NotFound from "@/pages/not-found";
import { useHighConfidenceNotifications } from "@/hooks/use-high-confidence-notifications";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/build-slip" component={BuildSlip} />
      <Route path="/history" component={BetHistory} />
      <Route path="/performance" component={Performance} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Navigation({ highConfidenceCount }: { highConfidenceCount: number }) {
  const [location] = useLocation();
  
  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard", badge: highConfidenceCount },
    { path: "/build-slip", label: "Build Slip", icon: Plus, testId: "nav-build-slip" },
    { path: "/history", label: "Bet History", icon: History, testId: "nav-history" },
    { path: "/performance", label: "Performance", icon: TrendingUp, testId: "nav-performance" },
  ];

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto flex items-center gap-2 p-4">
        <div className="flex items-center gap-2 mr-6">
          <TrendingUp className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold" data-testid="text-app-name">PickFinder</span>
        </div>
        <div className="flex gap-2">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <Button
                variant={location === item.path ? "default" : "ghost"}
                size="sm"
                className="gap-2 relative"
                data-testid={item.testId}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.badge && item.badge > 0 && (
                  <span 
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium"
                    data-testid={`badge-${item.testId}`}
                  >
                    {item.badge}
                  </span>
                )}
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

function AppContent() {
  // Call notification hook inside QueryClientProvider (stable, mounts once)
  const { highConfidenceCount } = useHighConfidenceNotifications('NHL');
  
  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen">
        <Navigation highConfidenceCount={highConfidenceCount} />
        <main className="flex-1 overflow-auto">
          <Router />
        </main>
      </div>
      <Toaster />
    </TooltipProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
