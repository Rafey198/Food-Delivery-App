import { registerAgent, AgentDefinition } from '../agent';
import { RecommendationService } from '../recommendation';
import { MealAssistantService } from '../meal-assistant';
import { ReviewIntelligenceService } from '../review-intel';
import { MenuTaggingService } from '../menu-tagging';
import { DispatchService } from '../dispatch';
import { DemandForecastService } from '../demand-forecast';
import { SupportAgent } from './support';
import { FraudDetectionAgent } from './fraud';
import { ChurnPredictionAgent } from './churn';
import { SubstitutionAgent } from './substitution';
import { NutritionCoachAgent } from './nutrition';
import { PricingOptimizationAgent } from './pricing';

// ------------------------ wrap existing services as agents ------------------------

const recommendation = new RecommendationService();
const meal = new MealAssistantService();
const reviewIntel = new ReviewIntelligenceService();
const menuTagger = new MenuTaggingService();
const dispatch = new DispatchService();
const forecaster = new DemandForecastService();

const RecommendationAgent: AgentDefinition = {
  id: 'recommendation',
  name: 'Recommendation Agent',
  description:
    'Ranks restaurants and dishes for a user using an interpretable, weighted score (preference, rating, speed, price-fit, popularity, availability) with per-item explanations.',
  capabilities: ['Restaurant ranking', 'Dish ranking', 'Explainable reasons', 'Cold-start fallback'],
  rolesAllowed: ['CUSTOMER', 'ADMIN', 'SYSTEM'],
  sampleInput: {
    restaurants: [
      { id: 'r1', name: 'Karachi Biryani House', cuisineTypes: ['Pakistani'], rating: 4.7, reviewCount: 120, averagePrepTime: 22, latitude: 24.86, longitude: 67.0, isOpen: true },
      { id: 'r2', name: 'Pizza Republic', cuisineTypes: ['Pizza'], rating: 4.4, reviewCount: 60, averagePrepTime: 20, latitude: 24.81, longitude: 67.03, isOpen: true },
    ],
    ctx: { userLat: 24.86, userLon: 67.0, preferredCuisines: ['Pakistani'], pastOrderRestaurantIds: ['r1'] },
  },
  async run(input: any) {
    const ranked = recommendation.rankRestaurants(input.restaurants, input.ctx ?? {});
    return {
      output: { restaurants: ranked.slice(0, 5) },
      reasoning: ranked[0]?.reasons ?? [],
      confidence: 0.82,
      usedTools: ['scoring-engine'],
      modelVersion: 'recommendation-v1',
    };
  },
};

const MealAssistantAgent: AgentDefinition = {
  id: 'meal-assistant',
  name: 'Meal Assistant Agent',
  description:
    'Conversational food-ordering assistant. Parses budget, dietary needs and cuisine; returns 3 grounded picks from real candidate menu items with reasoning. Never invents dishes.',
  capabilities: ['Intent parsing', 'Budget detection', 'Dietary filtering', 'Grounded recommendation'],
  rolesAllowed: ['CUSTOMER', 'ADMIN', 'SYSTEM'],
  sampleInput: {
    message: 'I want something spicy under $15',
    candidates: [
      { id: 'i1', name: 'Chicken Biryani', restaurantName: 'Karachi Biryani House', restaurantId: 'r1', price: 7.5, dietaryTags: ['HALAL', 'SPICY'], popularity: 80, allergens: [], rating: 4.7, isAvailable: true, estimatedDeliveryMinutes: 28 },
      { id: 'i2', name: 'Falafel Wrap', restaurantName: 'Falafel & Co.', restaurantId: 'r2', price: 5.5, dietaryTags: ['VEGAN'], popularity: 60, allergens: ['SESAME'], rating: 4.5, isAvailable: true, estimatedDeliveryMinutes: 18 },
    ],
  },
  async run(input: any) {
    const r = await meal.suggest(input.message, input.candidates ?? [], input.context ?? {});
    return {
      output: r,
      reasoning: r.options.flatMap((o) => o.reasons),
      confidence: 0.85,
      usedTools: ['intent-parser', 'recommender', 'llm-polisher'],
      modelVersion: 'meal-assistant-v1',
    };
  },
};

const ReviewIntelligenceAgent: AgentDefinition = {
  id: 'review-intel',
  name: 'Review Intelligence Agent',
  description:
    'Summarises a restaurant’s reviews into highlights, complaints, sentiment and suggested actions; can also draft polite replies.',
  capabilities: ['Sentiment classification', 'Theme extraction', 'Reply drafting'],
  rolesAllowed: ['MERCHANT', 'ADMIN', 'SYSTEM'],
  sampleInput: {
    reviews: [
      { rating: 5, comment: 'Food was hot and arrived fast, packaging was great!' },
      { rating: 2, comment: 'Pizza was cold and delivery was very late.' },
      { rating: 4, comment: 'Loved the biryani. Slight delay but worth it.' },
    ],
  },
  async run(input: any) {
    const summary = await reviewIntel.summarise(input.reviews ?? []);
    return {
      output: summary,
      reasoning: [`Sentiment ${summary.sentiment}`, ...summary.highlights.map((h) => `Highlight: ${h}`)],
      confidence: 0.8,
      usedTools: ['sentiment-classifier', 'theme-extractor', 'reply-llm'],
      modelVersion: 'review-intel-v1',
    };
  },
};

const MenuTaggingAgent: AgentDefinition = {
  id: 'menu-tagging',
  name: 'Menu Tagging Agent',
  description:
    'Auto-tags new menu items with cuisine, dietary tags, allergens, spice level and sustainability hints. Flags safety-critical tags (HALAL/VEGAN/GLUTEN_FREE/allergens) for merchant confirmation.',
  capabilities: ['Cuisine detection', 'Allergen extraction', 'Dietary tag inference', 'Confirmation gating'],
  rolesAllowed: ['MERCHANT', 'ADMIN', 'SYSTEM'],
  sampleInput: { name: 'Spicy Chicken Tikka', description: 'Charcoal-grilled chicken tikka in tandoori masala.' },
  async run(input: any) {
    const t = await menuTagger.tag(input);
    return {
      output: t,
      reasoning: [
        `Cuisine: ${t.cuisine ?? 'unknown'}`,
        `Spice: ${t.spiceLevel}`,
        `Dietary: ${t.dietary.join(', ') || 'none'}`,
        `Allergens: ${t.allergens.join(', ') || 'none'}`,
      ],
      confidence: 0.78,
      usedTools: ['regex-tagger', 'allergen-dictionary'],
      modelVersion: 'menu-tagging-v1',
    };
  },
};

const DispatchAgent: AgentDefinition = {
  id: 'dispatch',
  name: 'Dispatch Agent',
  description:
    'Selects the best courier(s) for an order using distance, vehicle suitability, rating, acceptance rate, workload and a fairness rotation factor — fully explainable.',
  capabilities: ['Multi-objective ranking', 'Fairness rotation', 'Per-offer reasoning'],
  rolesAllowed: ['ADMIN', 'SYSTEM'],
  sampleInput: {
    restaurantLat: 24.86,
    restaurantLon: 67.0,
    prepTimeMinutes: 22,
    candidateCouriers: [
      { id: 'c1', lat: 24.85, lon: 67.0, vehicleType: 'MOTORCYCLE', rating: 4.7, acceptanceRate: 0.9, fairnessScore: 0.7, status: 'ONLINE', isApproved: true, activeAssignments: 0 },
      { id: 'c2', lat: 24.87, lon: 67.02, vehicleType: 'BICYCLE', rating: 4.5, acceptanceRate: 0.95, fairnessScore: 0.3, status: 'ONLINE', isApproved: true, activeAssignments: 1 },
    ],
  },
  async run(input: any) {
    const ranked = dispatch.rank(input);
    return {
      output: { offers: ranked },
      reasoning: ranked[0]?.reasoning ?? [],
      confidence: 0.88,
      usedTools: ['distance-calc', 'fairness-scorer'],
      modelVersion: 'dispatch-v1',
    };
  },
};

const DemandForecastAgent: AgentDefinition = {
  id: 'demand-forecast',
  name: 'Demand Forecast Agent',
  description:
    'Forecasts next 24h order demand per delivery zone using historical weekday/hour averages plus a peak-window boost. Pluggable with a real ML model later.',
  capabilities: ['24h zone forecast', 'Peak window boost', 'Confidence intervals'],
  rolesAllowed: ['ADMIN', 'SYSTEM'],
  sampleInput: {
    orders: [
      { zoneId: 'z1', createdAt: new Date(Date.now() - 86400000) },
      { zoneId: 'z1', createdAt: new Date(Date.now() - 7200000) },
      { zoneId: 'z2', createdAt: new Date(Date.now() - 3600000) },
    ],
    zoneIds: ['z1', 'z2'],
  },
  async run(input: any) {
    const f = forecaster.forecastNext24h(
      (input.orders ?? []).map((o: any) => ({ zoneId: o.zoneId, createdAt: new Date(o.createdAt) })),
      input.zoneIds ?? [],
    );
    return {
      output: { forecast: f.slice(0, 24) },
      reasoning: [`Generated ${f.length} hour-zone forecasts`],
      confidence: 0.6,
      usedTools: ['historical-averager', 'peak-window-booster'],
      modelVersion: 'demand-forecast-v1',
    };
  },
};

// ------------------------ register all agents ------------------------

registerAgent(RecommendationAgent);
registerAgent(MealAssistantAgent);
registerAgent(ReviewIntelligenceAgent);
registerAgent(MenuTaggingAgent);
registerAgent(DispatchAgent);
registerAgent(DemandForecastAgent);
registerAgent(SupportAgent);
registerAgent(FraudDetectionAgent);
registerAgent(ChurnPredictionAgent);
registerAgent(SubstitutionAgent);
registerAgent(NutritionCoachAgent);
registerAgent(PricingOptimizationAgent);

export {
  RecommendationAgent,
  MealAssistantAgent,
  ReviewIntelligenceAgent,
  MenuTaggingAgent,
  DispatchAgent,
  DemandForecastAgent,
  SupportAgent,
  FraudDetectionAgent,
  ChurnPredictionAgent,
  SubstitutionAgent,
  NutritionCoachAgent,
  PricingOptimizationAgent,
};
