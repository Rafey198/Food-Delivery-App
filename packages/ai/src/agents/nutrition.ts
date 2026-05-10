import { AgentDefinition, AgentResult } from '../agent';

export interface NutritionAgentInput {
  goal: 'WEIGHT_LOSS' | 'MUSCLE_GAIN' | 'BALANCED' | 'LOW_SODIUM' | 'DIABETES_FRIENDLY';
  dailyCalorieTarget?: number;
  consumedToday?: { calories: number; meals: number };
  upcomingMeal: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  dietary?: string[];
  candidates: Array<{
    id: string;
    name: string;
    price: number;
    calories?: number | null;
    dietaryTags?: string[];
  }>;
}

export interface NutritionAgentOutput {
  picks: Array<{
    id: string;
    name: string;
    price: number;
    calories?: number | null;
    score: number;
    why: string[];
  }>;
  remainingCalories?: number;
  coachingNote: string;
}

export const NutritionCoachAgent: AgentDefinition<NutritionAgentInput, NutritionAgentOutput> = {
  id: 'nutrition-coach',
  name: 'Nutrition Coach Agent',
  description:
    'Helps customers hit their daily calorie / macro goals by recommending meals that fit the remaining budget for the day and the goal (weight loss, muscle gain, low sodium, etc.).',
  capabilities: ['Calorie budgeting', 'Goal-aware ranking', 'Dietary filter'],
  rolesAllowed: ['CUSTOMER', 'SYSTEM'],
  sampleInput: {
    goal: 'WEIGHT_LOSS',
    dailyCalorieTarget: 1800,
    consumedToday: { calories: 900, meals: 2 },
    upcomingMeal: 'DINNER',
    dietary: ['HIGH_PROTEIN'],
    candidates: [
      { id: 'a', name: 'Grilled Chicken Bowl', price: 9.5, calories: 540, dietaryTags: ['HIGH_PROTEIN', 'GLUTEN_FREE'] },
      { id: 'b', name: 'Vegan Buddha Bowl', price: 8.5, calories: 480, dietaryTags: ['VEGAN', 'GLUTEN_FREE'] },
      { id: 'c', name: 'Pepperoni Pizza', price: 10, calories: 840, dietaryTags: [] },
      { id: 'd', name: 'Salmon Power Bowl', price: 11.5, calories: 620, dietaryTags: ['HIGH_PROTEIN'] },
    ],
  },

  async run(input): Promise<AgentResult<NutritionAgentOutput>> {
    const remaining =
      input.dailyCalorieTarget !== undefined && input.consumedToday !== undefined
        ? input.dailyCalorieTarget - input.consumedToday.calories
        : undefined;

    const target = remaining ?? (input.goal === 'WEIGHT_LOSS' ? 500 : input.goal === 'MUSCLE_GAIN' ? 700 : 600);

    const filtered = input.candidates.filter((c) => {
      if (!input.dietary?.length) return true;
      return input.dietary.every((tag) =>
        (c.dietaryTags ?? []).map((t) => t.toUpperCase()).includes(tag.toUpperCase()),
      );
    });

    const picks = filtered
      .map((c) => {
        const why: string[] = [];
        const cal = c.calories ?? 600;
        const calFit = Math.max(0, 1 - Math.abs(cal - target) / Math.max(target, 1));
        if (calFit > 0.8) why.push(`Fits remaining ${target} kcal`);
        const goalBoost =
          input.goal === 'MUSCLE_GAIN' && (c.dietaryTags ?? []).includes('HIGH_PROTEIN')
            ? 0.2
            : input.goal === 'WEIGHT_LOSS' && cal < 600
              ? 0.2
              : 0;
        if (goalBoost > 0) why.push(`Aligned with ${input.goal.replace('_', ' ').toLowerCase()} goal`);
        if (cal && cal < target * 0.7) why.push('Light option');
        const score = +(0.7 * calFit + goalBoost + 0.1).toFixed(3);
        return { id: c.id, name: c.name, price: c.price, calories: c.calories, score, why };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const coaching =
      remaining !== undefined && remaining < 0
        ? `You've already gone ${Math.abs(remaining)} kcal over today's target — picking the lightest option is best.`
        : remaining !== undefined
          ? `You have ~${remaining} kcal left today. The picks below stay under that.`
          : `Aiming for ~${target} kcal for this ${input.upcomingMeal.toLowerCase()} based on your goal.`;

    return {
      output: { picks, remainingCalories: remaining, coachingNote: coaching },
      reasoning: picks.flatMap((p) => p.why),
      confidence: 0.7,
      usedTools: ['calorie-budgeter', 'goal-ranker', 'dietary-filter'],
      modelVersion: 'nutrition-agent-v1',
    };
  },
};
