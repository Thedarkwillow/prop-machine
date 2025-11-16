import { Switch, Route, Link, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, History, TrendingUp, Plus, LogOut, Settings, BarChart3 } from "lucide-react";
import Dashboard from "@/pages/Dashboard";
import BetHistory from "@/pages/BetHistory";
import Performance from "@/pages/Performance";
import BuildSlip from "@/pages/BuildSlip";
import Admin from "@/pages/admin";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";
import NotificationSettings from "@/pages/NotificationSettings";
import AnalyticsDashboard from "@/pages/AnalyticsDashboard";
import { useHighConfidenceNotifications } from "@/hooks/use-high-confidence-notifications";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/NotificationBell";

// Admin route guard - only admins can access
function AdminRoute() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium">Loading...</div>
        </div>
      </div>
    );
  }
  
  // Redirect non-admins to dashboard
  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }
  
  return <Admin />;
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/build-slip" component={BuildSlip} />
          <Route path="/history" component={BetHistory} />
          <Route path="/performance" component={Performance} />
          <Route path="/analytics" component={AnalyticsDashboard} />
          <Route path="/settings/notifications" component={NotificationSettings} />
          <Route path="/admin" component={AdminRoute} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function Navigation({ highConfidenceCount }: { highConfidenceCount: number }) {
  const [location] = useLocation();
  const { user } = useAuth();
  
  const baseNavItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard", badge: highConfidenceCount },
    { path: "/build-slip", label: "Build Slip", icon: Plus, testId: "nav-build-slip" },
    { path: "/history", label: "Bet History", icon: History, testId: "nav-history" },
    { path: "/performance", label: "Performance", icon: TrendingUp, testId: "nav-performance" },
    { path: "/analytics", label: "Analytics", icon: BarChart3, testId: "nav-analytics" },
  ];
  
  // Only show admin link to admin users
  const navItems = user?.isAdmin 
    ? [...baseNavItems, { path: "/admin", label: "Admin", icon: Settings, testId: "nav-admin" }]
    : baseNavItems;

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto flex items-center justify-between gap-2 p-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold" data-testid="text-app-name">Prop Machine</span>
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
        <div className="flex items-center gap-3">
          {user && <NotificationBell />}
          {user && (
            <span className="text-sm text-muted-foreground" data-testid="text-user-email">
              {user.email || 'User'}
            </span>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="gap-2"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const { highConfidenceCount } = useHighConfidenceNotifications('NHL');
  
  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen">
        {isAuthenticated && !isLoading && (
          <Navigation highConfidenceCount={highConfidenceCount} />
        )}
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
