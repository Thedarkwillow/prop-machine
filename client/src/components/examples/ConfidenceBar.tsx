import ConfidenceBar from '../ConfidenceBar';

export default function ConfidenceBarExample() {
  return (
    <div className="space-y-4 p-4 max-w-md">
      <div>
        <p className="text-sm mb-2">High Confidence (87)</p>
        <ConfidenceBar confidence={87} />
      </div>
      <div>
        <p className="text-sm mb-2">Medium Confidence (72)</p>
        <ConfidenceBar confidence={72} />
      </div>
      <div>
        <p className="text-sm mb-2">Low Confidence (54)</p>
        <ConfidenceBar confidence={54} />
      </div>
    </div>
  );
}
