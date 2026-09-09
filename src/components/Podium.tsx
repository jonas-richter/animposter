'use client';

import { Avatar } from './ui';

export default function Podium({
  standings,
  big,
}: {
  standings: { seatId: string; seatName: string; score: number }[];
  big?: boolean;
}) {
  const [first, second, third] = standings;
  const rest = standings.slice(3);

  return (
    <div className={`podium-wrap${big ? ' big' : ''}`}>
      <div className="podium">
        {second && (
          <div className="place p2">
            <Avatar name={second.seatName} />
            <span className="nm">{second.seatName}</span>
            <span className="score">{second.score}</span>
            <span className="block-2">2</span>
          </div>
        )}
        {first && (
          <div className="place p1">
            <span className="crown">👑</span>
            <Avatar name={first.seatName} />
            <span className="nm">{first.seatName}</span>
            <span className="score">{first.score}</span>
            <span className="block-1">1</span>
          </div>
        )}
        {third && (
          <div className="place p3">
            <Avatar name={third.seatName} />
            <span className="nm">{third.seatName}</span>
            <span className="score">{third.score}</span>
            <span className="block-3">3</span>
          </div>
        )}
      </div>

      {rest.length > 0 && (
        <div className="stack" style={{ marginTop: 18 }}>
          {rest.map((r, i) => (
            <div key={r.seatId} className="rowline">
              <span className="rank">{i + 4}</span>
              <span className="grow" style={{ fontWeight: 700 }}>
                {r.seatName}
              </span>
              <span className="pts">{r.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
