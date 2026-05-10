import { getAIProvider, ChatMessage } from './provider';
import { RecommendationService, RecommendableDish, RecommendationContext } from './recommendation';

export interface AssistantDishOption {
  id: string;
  name: string;
  restaurantId: string;
  restaurantName: string;
  price: number;
  estimatedDeliveryMinutes: number;
  rating: number;
  reasons: string[];
}

export interface AssistantResult {
  reply: string;
  options: AssistantDishOption[];
  followUp?: string;
}

export interface CandidateMenuItem extends RecommendableDish {
  restaurantName: string;
  estimatedDeliveryMinutes: number;
  isAvailable: boolean;
  allergens: string[];
}

const SYSTEM_PROMPT = `You are FoodPilot, a meal assistant for a food delivery app.
Rules:
- ONLY recommend items from the candidate list provided.
- Never invent restaurants or dishes.
- Always check item availability and respect dietary needs and allergies.
- Reply in 2-3 short sentences and be friendly.
- Show price and estimated delivery time when relevant.`;

/**
 * Heuristic understanding of the user's request — extracts budget, dietary,
 * cuisine and intent without requiring an LLM.
 */
function parseRequest(message: string) {
  const lower = message.toLowerCase();
  const budgetMatch = lower.match(/\$?(\d{1,3})/);
  const budget = budgetMatch ? Number(budgetMatch[1]) : undefined;
  const dietary: string[] = [];
  if (/\bvegan\b/.test(lower)) dietary.push('VEGAN');
  if (/\bvegetarian\b|\bveg\b/.test(lower)) dietary.push('VEGETARIAN');
  if (/halal/.test(lower)) dietary.push('HALAL');
  if (/gluten[- ]free/.test(lower)) dietary.push('GLUTEN_FREE');
  if (/keto/.test(lower)) dietary.push('KETO');
  if (/high[- ]protein|protein/.test(lower)) dietary.push('HIGH_PROTEIN');

  const wantsHealthy = /healthy|salad|bowl|low[- ]cal/.test(lower);
  const wantsSpicy = /spicy|hot/.test(lower);
  const cuisines: string[] = [];
  for (const c of ['pakistani', 'indian', 'middle eastern', 'pizza', 'burger', 'chinese', 'coffee', 'dessert', 'healthy']) {
    if (lower.includes(c)) cuisines.push(c);
  }

  return { budget, dietary, wantsHealthy, wantsSpicy, cuisines };
}

export class MealAssistantService {
  constructor(private readonly recommender = new RecommendationService()) {}

  async suggest(
    message: string,
    candidates: CandidateMenuItem[],
    context: RecommendationContext = {},
    history: ChatMessage[] = [],
  ): Promise<AssistantResult> {
    const parsed = parseRequest(message);
    const ctx: RecommendationContext = {
      ...context,
      budget: context.budget ?? parsed.budget,
      dietary: [...(context.dietary ?? []), ...parsed.dietary],
      preferredCuisines: parsed.cuisines.length ? parsed.cuisines : context.preferredCuisines,
    };

    const filtered = candidates.filter((c) => c.isAvailable);
    const ranked = this.recommender.rankDishes(filtered, ctx).slice(0, 3);

    const options: AssistantDishOption[] = ranked.map((r) => ({
      id: r.item.id,
      name: r.item.name,
      restaurantId: r.item.restaurantId,
      restaurantName: (r.item as CandidateMenuItem).restaurantName,
      price: r.item.price,
      estimatedDeliveryMinutes: (r.item as CandidateMenuItem).estimatedDeliveryMinutes,
      rating: r.item.rating ?? 4.5,
      reasons: r.reasons,
    }));

    if (options.length === 0) {
      return {
        reply: "I couldn't find anything matching your request right now. Want to broaden the budget or try a different cuisine?",
        options: [],
        followUp: 'Tell me more about what you feel like eating.',
      };
    }

    const provider = getAIProvider();
    const promptOptions = options
      .map(
        (o, i) =>
          `${i + 1}. ${o.name} from ${o.restaurantName} – $${o.price.toFixed(2)} – ~${o.estimatedDeliveryMinutes} min – ${o.reasons.join(', ')}`,
      )
      .join('\n');

    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      {
        role: 'user',
        content: `User said: "${message}".\nCandidate options:\n${promptOptions}\nWrite a friendly reply that briefly explains why these options match.`,
      },
    ];

    let reply = '';
    try {
      reply = await provider.chat(messages, { temperature: 0.5, maxTokens: 220 });
    } catch {
      reply = `Here are some great picks: ${options.map((o) => o.name).join(', ')}.`;
    }
    if (!reply || reply.length < 10) {
      reply = `Here are 3 options that fit: ${options.map((o) => `${o.name} ($${o.price.toFixed(2)})`).join(', ')}.`;
    }

    return { reply, options };
  }
}
