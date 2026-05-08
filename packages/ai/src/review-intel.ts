import { getAIProvider } from './provider';

export interface ReviewInput {
  rating: number;
  comment: string | null;
}

export interface ReviewSummary {
  highlights: string[];
  complaints: string[];
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  suggestedActions: string[];
  summary: string;
}

const POSITIVE_WORDS = ['great', 'love', 'amazing', 'fast', 'hot', 'fresh', 'delicious', 'best', 'perfect'];
const NEGATIVE_WORDS = ['cold', 'late', 'bad', 'rude', 'leak', 'missing', 'wrong', 'soggy', 'slow'];

export class ReviewIntelligenceService {
  async summarise(reviews: ReviewInput[]): Promise<ReviewSummary> {
    if (!reviews.length) {
      return {
        highlights: [],
        complaints: [],
        sentiment: 'NEUTRAL',
        suggestedActions: ['Encourage early customers to leave reviews.'],
        summary: 'No reviews yet.',
      };
    }
    const avg = reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
    const counts = { pos: 0, neg: 0 };
    const highlightSet = new Set<string>();
    const complaintSet = new Set<string>();

    for (const r of reviews) {
      const c = (r.comment || '').toLowerCase();
      for (const w of POSITIVE_WORDS) if (c.includes(w)) {
        counts.pos++;
        highlightSet.add(w);
      }
      for (const w of NEGATIVE_WORDS) if (c.includes(w)) {
        counts.neg++;
        complaintSet.add(w);
      }
    }

    const sentiment: ReviewSummary['sentiment'] =
      avg >= 4 || counts.pos > counts.neg * 1.5
        ? 'POSITIVE'
        : avg <= 3 || counts.neg > counts.pos
          ? 'NEGATIVE'
          : 'NEUTRAL';

    const suggested: string[] = [];
    if (complaintSet.has('cold') || complaintSet.has('soggy')) suggested.push('Improve packaging insulation.');
    if (complaintSet.has('late') || complaintSet.has('slow')) suggested.push('Investigate prep-time bottlenecks.');
    if (complaintSet.has('missing') || complaintSet.has('wrong')) suggested.push('Add an order checklist before handoff.');
    if (!suggested.length) suggested.push('Keep up the great work and reply to reviews to build loyalty.');

    let summary = `Average rating ${avg.toFixed(1)}★ across ${reviews.length} reviews. ${sentiment === 'POSITIVE' ? 'Customers are largely happy.' : sentiment === 'NEGATIVE' ? 'There are recurring concerns to address.' : 'Mixed feedback overall.'}`;

    try {
      const provider = getAIProvider();
      summary = await provider.chat([
        { role: 'system', content: 'Summarise restaurant reviews into 1-2 short customer-facing sentences. No emojis.' },
        { role: 'user', content: reviews.slice(0, 30).map((r) => `${r.rating}★ ${r.comment ?? ''}`).join('\n') },
      ]);
    } catch {
      // keep heuristic summary
    }

    return {
      highlights: [...highlightSet].slice(0, 4),
      complaints: [...complaintSet].slice(0, 4),
      sentiment,
      suggestedActions: suggested,
      summary,
    };
  }

  async draftReply(comment: string, rating: number): Promise<string> {
    try {
      const provider = getAIProvider();
      return await provider.chat([
        {
          role: 'system',
          content:
            'You are a polite restaurant manager replying to a customer review in 2-3 sentences. Acknowledge the feedback, thank them, and address concerns if rating is low.',
        },
        { role: 'user', content: `Rating: ${rating}/5\nReview: ${comment}` },
      ]);
    } catch {
      return rating >= 4
        ? 'Thank you so much for the kind words! We are thrilled you enjoyed it and look forward to serving you again soon.'
        : 'We are sorry the experience fell short. Could you share more details so we can make it right? Thank you for the honest feedback.';
    }
  }

  classifySentiment(comment: string): 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' {
    const c = comment.toLowerCase();
    let pos = 0;
    let neg = 0;
    for (const w of POSITIVE_WORDS) if (c.includes(w)) pos++;
    for (const w of NEGATIVE_WORDS) if (c.includes(w)) neg++;
    if (pos > neg) return 'POSITIVE';
    if (neg > pos) return 'NEGATIVE';
    return 'NEUTRAL';
  }
}
