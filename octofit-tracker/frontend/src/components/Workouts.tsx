import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type WorkoutSuggestion = { title: string; reason: string };

async function loadSuggestions() {
  const response = await getJson<{ suggestions: WorkoutSuggestion[] }>('/api/workouts/suggestions/mona@example.com');
  return response.suggestions;
}

export default function Workouts() {
  return <CapabilityCard
    title="Workout suggestions"
    description="Recommend workouts from activity patterns."
    emptyMessage="No workout suggestions yet."
    loadItems={loadSuggestions}
    renderItem={(suggestion) => `${suggestion.title} — ${suggestion.reason}`}
  />;
}
