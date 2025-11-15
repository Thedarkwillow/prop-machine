import PropsTable from '../PropsTable';

export default function PropsTableExample() {
  const props = [
    {
      id: '1',
      player: 'Connor McDavid',
      team: 'EDM',
      stat: 'SOG',
      line: 3.5,
      confidence: 87,
      ev: 8.2,
      platform: 'PrizePicks'
    },
    {
      id: '2',
      player: 'Auston Matthews',
      team: 'TOR',
      stat: 'Points',
      line: 1.5,
      confidence: 78,
      ev: 6.1,
      platform: 'Underdog'
    },
    {
      id: '3',
      player: 'Igor Shesterkin',
      team: 'NYR',
      stat: 'Saves',
      line: 30.5,
      confidence: 81,
      ev: 7.4,
      platform: 'PrizePicks'
    },
    {
      id: '4',
      player: 'Nathan MacKinnon',
      team: 'COL',
      stat: 'SOG',
      line: 4.5,
      confidence: 65,
      ev: 3.2,
      platform: 'Underdog'
    },
    {
      id: '5',
      player: 'Leon Draisaitl',
      team: 'EDM',
      stat: 'Points',
      line: 1.5,
      confidence: 72,
      ev: 4.8,
      platform: 'PrizePicks'
    }
  ];

  return (
    <div className="p-4">
      <PropsTable props={props} />
    </div>
  );
}
