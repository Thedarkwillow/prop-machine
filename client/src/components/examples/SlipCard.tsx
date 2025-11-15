import SlipCard from '../SlipCard';

export default function SlipCardExample() {
  const picks = [
    { player: 'Connor McDavid', stat: 'SOG', line: 3.5, direction: 'over' as const, confidence: 87 },
    { player: 'Auston Matthews', stat: 'Points', line: 1.5, direction: 'over' as const, confidence: 82 },
    { player: 'Igor Shesterkin', stat: 'Saves', line: 30.5, direction: 'over' as const, confidence: 78 }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      <SlipCard
        title="Safe Grind"
        type="conservative"
        picks={picks}
        confidence={82}
        suggestedBet={8.50}
        potentialReturn={34.00}
        platform="PrizePicks"
      />
      <SlipCard
        title="Value Play"
        type="balanced"
        picks={picks.slice(0, 4)}
        confidence={68}
        suggestedBet={6.00}
        potentialReturn={48.00}
        platform="Underdog"
      />
      <SlipCard
        title="Moonshot"
        type="aggressive"
        picks={[...picks, ...picks.slice(0, 2)]}
        confidence={45}
        suggestedBet={2.00}
        potentialReturn={50.00}
        platform="PrizePicks"
      />
    </div>
  );
}
