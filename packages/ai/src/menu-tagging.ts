export interface MenuTaggingInput {
  name: string;
  description?: string | null;
}

export interface MenuTaggingOutput {
  cuisine?: string;
  dietary: string[]; // VEGAN, VEGETARIAN, HALAL, GLUTEN_FREE, KETO, HIGH_PROTEIN, BUDGET
  allergens: string[]; // DAIRY, GLUTEN, NUTS, SOY, EGG, FISH, SHELLFISH, SESAME, PEANUTS
  spiceLevel: number; // 0-5
  sustainability: string[]; // ECO_PACKAGING, LOCAL_SOURCED
  needsConfirmation: string[]; // tags merchant should confirm before publishing
}

const CUISINE_PATTERNS: Array<[RegExp, string]> = [
  [/biryani|karahi|nihari|haleem|tikka|kebab/i, 'Pakistani'],
  [/butter chicken|paneer|naan|tikka masala|rogan josh/i, 'Indian'],
  [/shawarma|falafel|hummus|kebab|mezze/i, 'Middle Eastern'],
  [/pizza|margherita|pepperoni/i, 'Pizza'],
  [/burger|fries|nuggets|wings/i, 'Burgers'],
  [/sushi|ramen|teriyaki/i, 'Japanese'],
  [/noodle|chow mein|dim sum|kung pao/i, 'Chinese'],
  [/salad|bowl|quinoa|kale/i, 'Healthy Bowls'],
  [/cake|brownie|cheesecake|cookie/i, 'Desserts'],
  [/latte|cappuccino|espresso|coffee|americano/i, 'Coffee'],
];

const ALLERGEN_KEYWORDS: Record<string, RegExp> = {
  DAIRY: /milk|cheese|butter|cream|paneer|yogurt|latte|cappuccino/i,
  GLUTEN: /bread|naan|pizza|burger|pasta|noodle|wrap|bun|dough/i,
  NUTS: /walnut|almond|cashew|pistachio|nut/i,
  PEANUTS: /peanut|kung pao/i,
  SOY: /soy|tofu/i,
  EGG: /egg/i,
  FISH: /fish|salmon|tuna|cod/i,
  SHELLFISH: /shrimp|prawn|crab|lobster/i,
  SESAME: /sesame|tahini/i,
};

export class MenuTaggingService {
  async tag(input: MenuTaggingInput): Promise<MenuTaggingOutput> {
    const text = `${input.name} ${input.description ?? ''}`.toLowerCase();
    let cuisine: string | undefined;
    for (const [re, tag] of CUISINE_PATTERNS) {
      if (re.test(text)) {
        cuisine = tag;
        break;
      }
    }

    const allergens: string[] = [];
    for (const [tag, re] of Object.entries(ALLERGEN_KEYWORDS)) {
      if (re.test(text)) allergens.push(tag);
    }

    const dietary: string[] = [];
    if (/vegan/.test(text)) dietary.push('VEGAN');
    if (/vegetarian|veggie|paneer|cheese pizza|margherita/.test(text) && !/chicken|beef|lamb|fish|prawn/.test(text)) {
      dietary.push('VEGETARIAN');
    }
    if (/halal/.test(text)) dietary.push('HALAL');
    if (/gluten[- ]free/.test(text)) dietary.push('GLUTEN_FREE');
    if (/keto/.test(text)) dietary.push('KETO');
    if (/protein|grilled chicken|salmon|steak/.test(text)) dietary.push('HIGH_PROTEIN');

    let spiceLevel = 0;
    if (/mild/.test(text)) spiceLevel = 1;
    if (/medium/.test(text)) spiceLevel = 2;
    if (/spicy|hot/.test(text)) spiceLevel = 3;
    if (/extra spicy|fiery/.test(text)) spiceLevel = 4;
    if (/karahi|kung pao|zinger|peri/.test(text)) spiceLevel = Math.max(spiceLevel, 3);

    const sustainability: string[] = [];
    if (/eco|recyclable|compost/.test(text)) sustainability.push('ECO_PACKAGING');
    if (/local|farm/.test(text)) sustainability.push('LOCAL_SOURCED');

    // Tags that must be confirmed by the merchant before being published
    // because they have legal/health implications.
    const needsConfirmation: string[] = [];
    for (const tag of dietary) {
      if (['HALAL', 'VEGAN', 'GLUTEN_FREE', 'KETO'].includes(tag)) {
        needsConfirmation.push(tag);
      }
    }
    for (const a of allergens) needsConfirmation.push(`ALLERGEN:${a}`);

    return {
      cuisine,
      dietary: [...new Set(dietary)],
      allergens: [...new Set(allergens)],
      spiceLevel,
      sustainability,
      needsConfirmation,
    };
  }
}
