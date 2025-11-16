import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Target, DollarSign, BarChart3 } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center text-center gap-8 mb-16">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-12 w-12 text-primary" />
            <h1 className="text-5xl font-bold" data-testid="text-app-title">Prop Machine</h1>
          </div>
          
          <p className="text-xl text-muted-foreground max-w-2xl">
            AI-powered sports betting intelligence platform that helps you make informed decisions 
            through ML-driven prop analysis, confidence scoring, and Kelly criterion bankroll management.
          </p>
          
          <Button 
            size="lg" 
            onClick={handleLogin}
            className="text-lg px-8"
            data-testid="button-login"
          >
            Get Started
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="hover-elevate">
            <CardHeader>
              <Target className="h-10 w-10 text-primary mb-2" />
              <CardTitle>ML Prop Analysis</CardTitle>
              <CardDescription>
                Advanced machine learning models analyze player props across NHL, NBA, NFL, and MLB
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Get confidence scores, expected value calculations, and model probabilities for every pick
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <DollarSign className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Smart Bankroll Management</CardTitle>
              <CardDescription>
                Kelly criterion-based betting strategy to optimize your long-term growth
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Automated bet sizing with risk tolerance controls and bankroll tracking
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <BarChart3 className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>
                Track your betting performance with comprehensive metrics and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Monitor win rate, ROI, closing line value (CLV), and Kelly compliance over time
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
