import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface Prop {
  id: number;
  player: string;
  team: string;
  stat: string;
  line: number;
  direction: string;
  confidence: number;
  ev: number;
  platform: string;
  createdAt: string;
}

const HIGH_CONFIDENCE_THRESHOLD = 85;
const POLL_INTERVAL = 30000; // Poll every 30 seconds
const FRESHNESS_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const SEEN_PROPS_KEY = 'seen_high_confidence_props';

// Helper to create unique prop key (ID + createdAt)
// This prevents ID reuse after backend resets from suppressing new notifications
function getPropKey(prop: Prop): string {
  return `${prop.id}-${prop.createdAt}`;
}

export function useHighConfidenceNotifications(sport: string = 'NHL') {
  const { toast } = useToast();
  const [seenProps, setSeenProps] = useState<Set<string>>(() => {
    // Initialize from localStorage
    if (typeof window === 'undefined') return new Set();
    
    const stored = localStorage.getItem(SEEN_PROPS_KEY);
    if (stored) {
      try {
        const keys = JSON.parse(stored);
        return new Set(keys);
      } catch (e) {
        console.error('Failed to parse seen props', e);
        return new Set();
      }
    }
    return new Set();
  });

  const { data: props } = useQuery<Prop[]>({
    queryKey: ['/api/props', sport],
    refetchInterval: POLL_INTERVAL,
    staleTime: 0, // Always consider data stale to trigger refetch
  });

  useEffect(() => {
    if (!props) return;

    const now = Date.now();
    
    // Filter for high-confidence AND fresh props
    const highConfidenceProps = props.filter(
      (prop: Prop) => {
        if (prop.confidence < HIGH_CONFIDENCE_THRESHOLD) return false;
        
        // Only include props created within freshness window
        const createdAt = new Date(prop.createdAt).getTime();
        return (now - createdAt) <= FRESHNESS_WINDOW_MS;
      }
    );

    // Cleanup: Remove stale keys from seenProps that no longer exist in current props
    const currentPropKeys = new Set(props.map(getPropKey));
    const staleKeys = Array.from(seenProps).filter(key => !currentPropKeys.has(key));
    
    // Only update state if there are stale keys to remove (prevents infinite loop)
    if (staleKeys.length > 0) {
      const cleanedSeenProps = new Set(Array.from(seenProps).filter(key => currentPropKeys.has(key)));
      setSeenProps(cleanedSeenProps);
      if (typeof window !== 'undefined') {
        localStorage.setItem(SEEN_PROPS_KEY, JSON.stringify(Array.from(cleanedSeenProps)));
      }
      return; // Exit early, let next effect run with cleaned state
    }

    const newHighConfidenceProps = highConfidenceProps.filter(
      (prop: Prop) => !seenProps.has(getPropKey(prop))
    );

    if (newHighConfidenceProps.length > 0) {
      // Update seen props state
      const newSeenProps = new Set(seenProps);
      newHighConfidenceProps.forEach((prop: Prop) => {
        newSeenProps.add(getPropKey(prop));

        toast({
          title: "High-Confidence Pick Available",
          description: (
            <div className="flex flex-col gap-1" data-testid={`notification-prop-${prop.id}`}>
              <div className="font-semibold">
                {prop.player} - {prop.direction.toUpperCase()} {prop.line}
              </div>
              <div className="text-sm text-muted-foreground">
                {prop.stat} • {prop.confidence}% confidence • {parseFloat(prop.ev as any).toFixed(1)}% EV
              </div>
              <div className="text-xs text-muted-foreground">
                {prop.platform}
              </div>
            </div>
          ),
          duration: 10000, // Show for 10 seconds
        });
      });

      // Update state (triggers re-render)
      setSeenProps(newSeenProps);

      // Save seen props to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          SEEN_PROPS_KEY,
          JSON.stringify(Array.from(newSeenProps))
        );
      }
    }
  }, [props, toast, seenProps]);

  // Calculate unseen high-confidence count for badge
  const unseenCount = props?.filter((prop: Prop) => {
    if (prop.confidence < HIGH_CONFIDENCE_THRESHOLD) return false;
    if (seenProps.has(getPropKey(prop))) return false; // Filter out seen props
    const createdAt = new Date(prop.createdAt).getTime();
    // Note: Using Date.now() here is stable enough as badge only updates on data/state changes
    return (Date.now() - createdAt) <= FRESHNESS_WINDOW_MS;
  }).length ?? 0;

  return {
    highConfidenceCount: unseenCount,
  };
}
