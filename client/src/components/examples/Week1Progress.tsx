import Week1Progress from '../Week1Progress';

export default function Week1ProgressExample() {
  const goals = [
    { label: 'Win Rate', target: '50%+', current: '58.2%', achieved: true },
    { label: 'CLV Positive', target: '55%+', current: '62.1%', achieved: true },
    { label: 'Kelly Sizing', target: '100%', current: '95.2%', achieved: false },
    { label: 'Daily Tracking', target: '7 days', current: '3 days', achieved: false }
  ];

  return (
    <div className="p-4">
      <Week1Progress day={3} betsPlaced={12} goals={goals} />
    </div>
  );
}
