import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, AlertTriangle, Info } from "lucide-react";
import type { Prop } from "@shared/schema";
import { detectCorrelations, type CorrelationWarning } from "@shared/correlations";
import LineMovementBadge from "./LineMovementBadge";

// Extended prop type with optional line movement data
type PropWithLineMovement = Prop & {
  lineMovement?: {
    previousLine: number;
    currentLine: number;
    change: number;
    timestamp: Date | string;
  } | null;
};

interface SlipBuilderProps {
  availableProps: PropWithLineMovement[];
  onPlaceSlip?: (propIds: number[]) => void;
}

export default function SlipBuilder({ availableProps, onPlaceSlip }: SlipBuilderProps) {
  const [selectedProps, setSelectedProps] = useState<PropWithLineMovement[]>([]);

  const handleAddProp = (prop: PropWithLineMovement) => {
    if (selectedProps.some(p => p.id === prop.id)) {
      return; // Already added
    }
    setSelectedProps([...selectedProps, prop]);
  };

  const handleRemoveProp = (propId: number) => {
    setSelectedProps(selectedProps.filter(p => p.id !== propId));
  };

  const handleClearAll = () => {
    setSelectedProps([]);
  };

  const handlePlaceSlip = () => {
    if (selectedProps.length > 0 && onPlaceSlip) {
      onPlaceSlip(selectedProps.map(p => p.id));
    }
  };

  // Detect correlations in current slip
  const warnings = detectCorrelations(selectedProps);

  // Calculate overall slip confidence (average of all selected props)
  const slipConfidence = selectedProps.length > 0
    ? Math.round(selectedProps.reduce((sum, p) => sum + p.confidence, 0) / selectedProps.length)
    : 0;

  const getSeverityColor = (severity: CorrelationWarning['severity']) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
    }
  };

  const getSeverityIcon = (severity: CorrelationWarning['severity']) => {
    return severity === 'high' ? AlertTriangle : Info;
  };

  // Check if a prop would create a correlation if added
  const getCorrelationWarningForProp = (prop: PropWithLineMovement): CorrelationWarning | null => {
    if (selectedProps.length === 0) return null;
    
    const testSlip = [...selectedProps, prop];
    const testWarnings = detectCorrelations(testSlip);
    
    // Find a warning that includes this prop
    const newWarning = testWarnings.find(w => 
      w.propIds.includes(prop.id) && 
      w.propIds.some(id => selectedProps.some(p => p.id === id))
    );
    
    return newWarning || null;
  };

  return (
    <div className="space-y-4">
      {/* Current Slip */}
      <Card data-testid="card-slip-builder">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <CardTitle>Your Slip</CardTitle>
              {selectedProps.length > 0 && (
                <Badge variant="default" data-testid="badge-slip-confidence">
                  {slipConfidence}% Confidence
                </Badge>
              )}
            </div>
            <CardDescription>
              {selectedProps.length === 0 ? 'Add props to build your slip' : `${selectedProps.length} ${selectedProps.length === 1 ? 'prop' : 'props'} selected`}
            </CardDescription>
          </div>
          {selectedProps.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              data-testid="button-clear-all"
            >
              Clear All
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedProps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-empty-slip">
              No props added yet. Select props from the available picks below.
            </p>
          ) : (
            <>
              {selectedProps.map((prop) => (
                <div
                  key={prop.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                  data-testid={`slip-prop-${prop.id}`}
                >
                  <div className="flex-1">
                    <div className="font-medium">{prop.player}</div>
                    <div className="text-sm text-muted-foreground">
                      {prop.stat} {prop.direction} {prop.line} • {prop.confidence}% confidence
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveProp(prop.id)}
                    data-testid={`button-remove-${prop.id}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              {/* Correlation Warnings */}
              {warnings.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-sm font-medium">Correlation Warnings</div>
                  {warnings.map((warning, idx) => {
                    const Icon = getSeverityIcon(warning.severity);
                    return (
                      <Alert
                        key={idx}
                        variant={warning.severity === 'high' ? 'destructive' : 'default'}
                        data-testid={`alert-correlation-${idx}`}
                      >
                        <Icon className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          <span className="font-medium capitalize">{warning.type.replace('-', ' ')}: </span>
                          {warning.description}
                        </AlertDescription>
                      </Alert>
                    );
                  })}
                </div>
              )}

              {/* Place Slip Button */}
              <Button
                className="w-full"
                onClick={handlePlaceSlip}
                disabled={selectedProps.length === 0}
                data-testid="button-place-slip"
              >
                Place Slip ({selectedProps.length} {selectedProps.length === 1 ? 'Pick' : 'Picks'})
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Available Props with Correlation Indicators */}
      <Card data-testid="card-available-props">
        <CardHeader>
          <CardTitle>Available Props</CardTitle>
          <CardDescription>Click to add to your slip</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {availableProps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No props available
            </p>
          ) : (
            availableProps.map((prop) => {
              const isSelected = selectedProps.some(p => p.id === prop.id);
              const correlationWarning = !isSelected ? getCorrelationWarningForProp(prop) : null;
              
              return (
                <button
                  key={prop.id}
                  onClick={() => !isSelected && handleAddProp(prop)}
                  disabled={isSelected}
                  className={`w-full text-left p-3 border rounded-md transition-colors ${
                    isSelected
                      ? 'opacity-50 cursor-not-allowed bg-muted'
                      : 'hover-elevate active-elevate-2 cursor-pointer'
                  }`}
                  data-testid={`button-add-prop-${prop.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium">{prop.player}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <span>{prop.stat} {prop.direction} {prop.line}</span>
                        <LineMovementBadge 
                          lineMovement={prop.lineMovement} 
                          direction={prop.direction}
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {prop.confidence}% confidence
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {prop.platform}
                        </Badge>
                      </div>
                      {correlationWarning && (
                        <div className="mt-2">
                          <Badge variant={getSeverityColor(correlationWarning.severity)} className="text-xs">
                            ⚠ {correlationWarning.type.replace('-', ' ')}
                          </Badge>
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Badge variant="default" className="text-xs">
                        Added
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
