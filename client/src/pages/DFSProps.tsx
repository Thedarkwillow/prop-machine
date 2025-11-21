import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Target, Star } from "lucide-react";
import { useState, useMemo } from "react";
import type { Prop } from "@shared/schema";

export default function DFSProps() {
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [statFilter, setStatFilter] = useState<string>("all");
  const [confidenceFilter, setConfidenceFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  const { data: props, isLoading } = useQuery<Prop[]>({
    queryKey: ["/api/props"],
  });

  // Memoize filtered and grouped props for performance
  const { dfsProps, filteredProps, sortedGroups, topPicks, sports, stats, platforms } = useMemo(() => {
    // Filter for DFS platforms: DraftKings, FanDuel, PrizePicks, Underdog Fantasy
    const dfsPropsFiltered = props?.filter(
      (p) =>
        p.isActive &&
        (p.platform.toLowerCase().includes("draftkings") ||
          p.platform.toLowerCase().includes("fanduel") ||
          p.platform.toLowerCase().includes("prizepicks") ||
          p.platform.toLowerCase().includes("underdog"))
    ) || [];

    // Apply filters
    const filtered = dfsPropsFiltered.filter((prop) => {
      if (sportFilter !== "all" && prop.sport !== sportFilter) return false;
      if (statFilter !== "all" && prop.stat !== statFilter) return false;
      if (confidenceFilter === "high" && prop.confidence < 75) return false;
      if (confidenceFilter === "medium" && (prop.confidence < 60 || prop.confidence >= 75)) return false;
      if (confidenceFilter === "low" && prop.confidence >= 60) return false;
      if (platformFilter !== "all" && prop.platform !== platformFilter) return false;
      return true;
    });

    // Group props by sport/player/stat/direction/period to avoid collisions
    const groupedProps = filtered.reduce((acc, prop) => {
      const key = `${prop.sport}-${prop.player}-${prop.stat}-${prop.direction}-${prop.period}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(prop);
      return acc;
    }, {} as Record<string, Prop[]>);

    // Sort by highest confidence first
    const sorted = Object.entries(groupedProps).sort((a, b) => {
      const maxConfA = Math.max(...a[1].map(p => p.confidence));
      const maxConfB = Math.max(...b[1].map(p => p.confidence));
      return maxConfB - maxConfA;
    });

    // Top picks (confidence >= 75)
    const top = sorted.filter(([_, props]) => 
      props.some(p => p.confidence >= 75)
    ).slice(0, 6);

    const sportsList = ["all", ...Array.from(new Set(dfsPropsFiltered.map(p => p.sport)))];
    const statsList = ["all", ...Array.from(new Set(dfsPropsFiltered.map(p => p.stat)))];
    const platformsList = ["all", ...Array.from(new Set(dfsPropsFiltered.map(p => p.platform)))];

    return {
      dfsProps: dfsPropsFiltered,
      filteredProps: filtered,
      sortedGroups: sorted,
      topPicks: top,
      sports: sportsList,
      stats: statsList,
      platforms: platformsList
    };
  }, [props, sportFilter, statFilter, confidenceFilter, platformFilter]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium">Loading DFS Props...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-dfs-title">DFS Props</h1>
          <p className="text-muted-foreground mt-1">
            DraftKings, FanDuel, PrizePicks & Underdog Fantasy player props
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {filteredProps.length} Props
        </Badge>
      </div>

      {/* Top Picks Section */}
      {topPicks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              Top Picks (75%+ Confidence)
            </CardTitle>
            <CardDescription>
              Highest confidence props from our ML model
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {topPicks.map(([key, props]) => {
                const mainProp = props[0];
                const maxConfidence = Math.max(...props.map(p => p.confidence));
                const avgEV = props.reduce((sum, p) => sum + parseFloat(p.ev.toString()), 0) / props.length;
                
                return (
                  <Card key={key} className="hover-elevate" data-testid={`card-top-pick-${mainProp.id}`}>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-bold text-lg" data-testid={`text-player-${mainProp.id}`}>
                              {mainProp.player}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {mainProp.team} vs {mainProp.opponent}
                            </div>
                          </div>
                          <Badge 
                            variant="default" 
                            className="ml-2"
                            data-testid={`badge-confidence-${mainProp.id}`}
                          >
                            {maxConfidence}%
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          {mainProp.direction === "over" ? (
                            <TrendingUp className="h-4 w-4 text-primary" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-destructive" />
                          )}
                          <span className="font-semibold text-2xl" data-testid={`text-line-${mainProp.id}`}>
                            {parseFloat(mainProp.line.toString()).toFixed(1)}
                          </span>
                          <span className="text-muted-foreground">{mainProp.stat}</span>
                          <Badge variant="outline" className="ml-auto">
                            {mainProp.direction.toUpperCase()}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            <span className="text-muted-foreground">EV:</span>
                            <span className="font-semibold text-primary">
                              +{avgEV.toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            {props.length} book{props.length > 1 ? 's' : ''}
                          </div>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          {props.map((p) => {
                            const platformName = p.platform.toLowerCase().includes('draftkings') ? 'DK' : 
                                               p.platform.toLowerCase().includes('fanduel') ? 'FD' :
                                               p.platform.toLowerCase().includes('prizepicks') ? 'PP' : 'UF';
                            return (
                              <Badge key={p.id} variant="secondary" className="text-xs">
                                {platformName}: {parseFloat(p.line.toString()).toFixed(1)}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Select value={sportFilter} onValueChange={setSportFilter}>
                <SelectTrigger data-testid="select-sport-filter">
                  <SelectValue placeholder="Sport" />
                </SelectTrigger>
                <SelectContent>
                  {sports.map((sport) => (
                    <SelectItem key={sport} value={sport}>
                      {sport === "all" ? "All Sports" : sport}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger data-testid="select-platform-filter">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      {platform === "all" ? "All Platforms" : platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Select value={statFilter} onValueChange={setStatFilter}>
                <SelectTrigger data-testid="select-stat-filter">
                  <SelectValue placeholder="Stat Type" />
                </SelectTrigger>
                <SelectContent>
                  {stats.map((stat) => (
                    <SelectItem key={stat} value={stat}>
                      {stat === "all" ? "All Stats" : stat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
                <SelectTrigger data-testid="select-confidence-filter">
                  <SelectValue placeholder="Confidence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Confidence</SelectItem>
                  <SelectItem value="high">High (75%+)</SelectItem>
                  <SelectItem value="medium">Medium (60-74%)</SelectItem>
                  <SelectItem value="low">Low (&lt;60%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setSportFilter("all");
                setPlatformFilter("all");
                setStatFilter("all");
                setConfidenceFilter("all");
              }}
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* All Props */}
      <div className="space-y-4">
        {sortedGroups.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No props match your filters. Try adjusting your selections.
              </p>
            </CardContent>
          </Card>
        ) : (
          sortedGroups.map(([key, props]) => {
            const mainProp = props[0];
            const maxConfidence = Math.max(...props.map(p => p.confidence));
            const avgEV = props.reduce((sum, p) => sum + parseFloat(p.ev.toString()), 0) / props.length;
            
            return (
              <Card key={key} className="hover-elevate" data-testid={`card-prop-${mainProp.id}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-lg" data-testid={`text-player-name-${mainProp.id}`}>
                            {mainProp.player}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {mainProp.sport} • {mainProp.team} vs {mainProp.opponent}
                          </div>
                        </div>
                        <Badge 
                          variant={maxConfidence >= 75 ? "default" : maxConfidence >= 60 ? "secondary" : "outline"}
                          data-testid={`badge-conf-${mainProp.id}`}
                        >
                          {maxConfidence}% confidence
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3">
                        {mainProp.direction === "over" ? (
                          <TrendingUp className="h-5 w-5 text-primary" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-destructive" />
                        )}
                        <span className="font-bold text-3xl" data-testid={`text-prop-line-${mainProp.id}`}>
                          {parseFloat(mainProp.line.toString()).toFixed(1)}
                        </span>
                        <span className="text-lg text-muted-foreground">{mainProp.stat}</span>
                        <Badge variant="outline" className="ml-2">
                          {mainProp.direction.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          <span className="text-muted-foreground">Expected Value:</span>
                          <span className="font-semibold text-primary">
                            +{avgEV.toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-muted-foreground">
                          Available on {props.length} book{props.length > 1 ? 's' : ''}
                        </div>
                      </div>

                      <div className="flex gap-3 flex-wrap pt-2">
                        {props.map((p) => {
                          const platformName = p.platform.toLowerCase().includes('draftkings') ? 'DraftKings' : 
                                             p.platform.toLowerCase().includes('fanduel') ? 'FanDuel' :
                                             p.platform.toLowerCase().includes('prizepicks') ? 'PrizePicks' : 'Underdog Fantasy';
                          return (
                            <div key={p.id} className="flex items-center gap-2 text-sm">
                              <Badge variant="secondary">
                                {platformName}
                              </Badge>
                              <span className="font-mono font-semibold">
                                {parseFloat(p.line.toString()).toFixed(1)}
                              </span>
                              <span className="text-muted-foreground">
                                ({p.confidence}% • +{parseFloat(p.ev.toString()).toFixed(1)}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
