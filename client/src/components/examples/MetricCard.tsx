import MetricCard from '../MetricCard';

export default function MetricCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      <MetricCard label="Bankroll" value="$127.50" change={15.3} mono />
      <MetricCard label="Win Rate" value={58.2} suffix="%" change={4.1} />
      <MetricCard label="CLV" value="+2.8" suffix="%" change={12.5} />
      <MetricCard label="ROI" value={7.4} suffix="%" change={-1.2} />
    </div>
  );
}
