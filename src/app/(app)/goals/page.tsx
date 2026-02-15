import { getGoals } from "@/actions/goal-actions";
import { checkAchievements } from "@/actions/achievement-actions";
import { GoalsList } from "@/components/goals/goals-list";
import { Achievements } from "@/components/goals/achievements";

export const metadata = { title: "Metas" };

export default async function GoalsPage() {
  const [goals, achievements] = await Promise.all([
    getGoals(),
    checkAchievements(),
  ]);

  return (
    <div className="space-y-6">
      <GoalsList goals={goals} />
      <Achievements achievements={achievements} />
    </div>
  );
}
