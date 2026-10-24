import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Ranking = { teamName: string; totalPoints: number; rank: number };

async function loadLeaderboard() {
  const response = await getJson<{ leaderboard: Ranking[] }>('/api/leaderboard');
  return response.leaderboard;
}

export default function Leaderboard() {
  return <CapabilityCard
    title="Leaderboard"
    description="Compare team point totals."
    emptyMessage="No leaderboard rankings yet."
    loadItems={loadLeaderboard}
    renderItem={(ranking) => `${ranking.rank}. ${ranking.teamName} — ${ranking.totalPoints} points`}
  />;
}
