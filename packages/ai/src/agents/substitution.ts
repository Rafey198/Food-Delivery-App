import { AgentDefinition, AgentResult } from '../agent';

export interface SubstitutionAgentInput {
  unavailableItem: {
    id: string;
    name: string;
    price: number;
    dietaryTags?: string[];
    allergens?: string[];
  };
  candidates: Array<{
    id: string;
    name: string;
    price: number;
    dietaryTags?: string[];
    allergens?: string[];
    popularity?: number;
  }>;
}

export interface SubstitutionAgentOutput {
  picks: Array<{ id: string; name: string; price: number; score: number; why: string[] }>;
}

function jaccard(a: string[], b: string[]) {
  const A = new Set(a.map((s) => s.toUpperCase()));
  const B = new Set(b.map((s) => s.toUpperCase()));
  if (!A.size && !B.size) return 1;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter || 1);
}

export const SubstitutionAgent: AgentDefinition<SubstitutionAgentInput, SubstitutionAgentOutput> = {
  id: 'substitution',
  name: 'Substitution Agent',
  description:
    'When a restaurant item goes out of stock mid-order, picks the best substitutes from the same menu respecting dietary tags, allergens, price proximity and popularity.',
  capabilities: ['Dietary-tag matching', 'Allergen safety filter', 'Price proximity', 'Popularity boost'],
  rolesAllowed: ['CUSTOMER', 'SYSTEM'],
  sampleInput: {
    unavailableItem: {
      id: 'orig',
      name: 'Chicken Biryani',
      price: 7.5,
      dietaryTags: ['HALAL'],
      allergens: [],
    },
    candidates: [
      { id: 'a', name: 'Beef Biryani', price: 8.5, dietaryTags: ['HALAL'], popularity: 80 },
      { id: 'b', name: 'Chicken Karahi', price: 9.9, dietaryTags: ['HALAL'], popularity: 60 },
      { id: 'c', name: 'Veg Biryani', price: 6.5, dietaryTags: ['HALAL', 'VEGETARIAN'], popularity: 40 },
      { id: 'd', name: 'Margherita Pizza', price: 8.0, dietaryTags: [], popularity: 75 },
    ],
  },

  async run(input): Promise<AgentResult<SubstitutionAgentOutput>> {
    const orig = input.unavailableItem;

    const picks = input.candidates
      .filter((c) => {
        // exclude items that have any allergen the user couldn't tolerate
        if (orig.allergens && orig.allergens.length) {
          return !c.allergens?.some((a) => orig.allergens!.includes(a));
        }
        return true;
      })
      .map((c) => {
        const why: string[] = [];
        const dietMatch = jaccard(orig.dietaryTags ?? [], c.dietaryTags ?? []);
        if (dietMatch > 0.5) why.push('Matches dietary tags');
        const priceDelta = Math.abs(orig.price - c.price) / Math.max(1, orig.price);
        const priceFit = Math.max(0, 1 - priceDelta);
        if (priceDelta < 0.2) why.push('Similar price');
        const popularity = Math.min(1, (c.popularity ?? 0) / 100);
        if (popularity > 0.6) why.push('Popular pick');

        const nameSimilarity =
          orig.name.toLowerCase().split(/\s+/).filter((w) => c.name.toLowerCase().includes(w)).length /
          Math.max(1, orig.name.split(/\s+/).length);
        if (nameSimilarity > 0.4) why.push('Closely related dish');

        const score =
          0.4 * dietMatch +
          0.25 * priceFit +
          0.15 * popularity +
          0.2 * nameSimilarity;

        return { id: c.id, name: c.name, price: c.price, score: +score.toFixed(3), why };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return {
      output: { picks },
      reasoning: picks.flatMap((p) => p.why),
      confidence: 0.75,
      usedTools: ['dietary-matcher', 'allergen-filter', 'price-proximity'],
      modelVersion: 'substitution-agent-v1',
    };
  },
};
