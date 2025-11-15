interface ConfidenceBarProps {
  confidence: number;
  showLabel?: boolean;
}

export default function ConfidenceBar({ confidence, showLabel = true }: ConfidenceBarProps) {
  const getColor = (conf: number) => {
    if (conf >= 80) return 'bg-green-500';
    if (conf >= 65) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${getColor(confidence)}`}
          style={{ width: `${confidence}%` }}
        />
      </div>
      {showLabel && (
        <span className={`text-sm font-bold font-mono ${
          confidence >= 80 ? 'text-green-600 dark:text-green-400' : 
          confidence >= 65 ? 'text-yellow-600 dark:text-yellow-400' : 
          'text-red-600 dark:text-red-400'
        }`}>
          {confidence}
        </span>
      )}
    </div>
  );
}
