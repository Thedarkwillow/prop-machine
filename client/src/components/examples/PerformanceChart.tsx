import PerformanceChart from '../PerformanceChart';

export default function PerformanceChartExample() {
  const bankrollData = [
    { date: 'Mon', value: 100 },
    { date: 'Tue', value: 105 },
    { date: 'Wed', value: 98 },
    { date: 'Thu', value: 112 },
    { date: 'Fri', value: 118 },
    { date: 'Sat', value: 127 },
    { date: 'Sun', value: 125 }
  ];

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <PerformanceChart
        title="Bankroll Growth"
        data={bankrollData}
      />
      <PerformanceChart
        title="Win Rate Trend"
        data={[
          { date: 'Mon', value: 50 },
          { date: 'Tue', value: 52 },
          { date: 'Wed', value: 48 },
          { date: 'Thu', value: 55 },
          { date: 'Fri', value: 58 },
          { date: 'Sat', value: 57 },
          { date: 'Sun', value: 58 }
        ]}
      />
    </div>
  );
}
