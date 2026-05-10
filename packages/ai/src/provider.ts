/**
 * AI provider abstraction — wraps OpenAI when a key is configured,
 * otherwise produces deterministic mock responses so the platform
 * works fully offline / in CI.
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIProvider {
  name: string;
  chat(messages: ChatMessage[], opts?: { temperature?: number; maxTokens?: number }): Promise<string>;
  classify(text: string, labels: string[]): Promise<{ label: string; confidence: number }>;
}

class MockProvider implements AIProvider {
  name = 'mock';

  async chat(messages: ChatMessage[]): Promise<string> {
    const last = messages[messages.length - 1]?.content ?? '';
    const lower = last.toLowerCase();
    const system = messages.find((m) => m.role === 'system')?.content?.toLowerCase() ?? '';

    if (system.includes('customer-support') || system.includes('support agent')) {
      const intentMatch = last.match(/Intent:\s*([A-Z_]+)/);
      const intent = intentMatch?.[1] ?? '';
      const templates: Record<string, string> = {
        REFUND_REQUEST: 'I am really sorry about the experience. I can issue a refund right away — would a full refund or a 50% partial refund plus a $5 wallet credit work better for you?',
        FOOD_QUALITY: 'I am so sorry the food did not arrive in good condition. I have flagged the restaurant and would like to make this right with a full refund — could you share a quick photo so I can move faster?',
        WRONG_ORDER: 'Sorry about the mix-up. I can issue a refund for the missing items or send a fresh delivery — which would you prefer?',
        DELIVERY_DELAY: 'I apologise for the delay — that is not the experience we aim for. I have applied a free-delivery coupon to your account and we are investigating what slowed this order down.',
        CANCEL_ORDER: 'No problem — I can cancel this order and process the refund immediately. It should land back on your card within 3-5 business days.',
        ACCOUNT: 'Thanks for reaching out. I have sent a password-reset link to your registered email — let me know if you do not see it within a few minutes.',
        COUPONS: 'Happy to help! WELCOME10 (10% off) and FREESHIP (free delivery) are both active for your account.',
      };
      return templates[intent] ?? 'Thanks for reaching out — I am on it. Could you share a bit more detail so I can help you fastest?';
    }

    if (system.includes('foodpilot') || system.includes('meal assistant')) {
      const linesAfter = last.split('\n').filter((l) => /^\d+\./.test(l.trim()));
      if (linesAfter.length) {
        const names = linesAfter.slice(0, 3).map((l) => l.split('–')[0].replace(/^\d+\.\s*/, '').trim());
        return `Here are a few picks I think you'll love: ${names.join(', ')}. Tell me which one to add to your cart and I'll handle it.`;
      }
      return "Here are a few options that match what you're craving. Tell me which one to add to your cart.";
    }

    if (system.includes('summarise') || system.includes('summarize') || lower.includes('summarise')) {
      return 'Customers consistently praise the food quality and packaging. A few mentioned the delivery time during peak hours could improve.';
    }
    if (system.includes('manager replying') || lower.includes('write a reply') || lower.includes('reply to a customer')) {
      return 'Thank you so much for your feedback! We appreciate you taking the time to share your experience and we look forward to serving you again soon.';
    }
    if (lower.includes('tag')) {
      return JSON.stringify({ cuisine: 'general', spiceLevel: 1, allergens: [], dietary: [] });
    }
    return 'Here are a few options that match what you asked for. Let me know which one to add to your cart.';
  }

  async classify(text: string, labels: string[]) {
    const lower = text.toLowerCase();
    let best = labels[0];
    if (lower.includes('great') || lower.includes('love') || lower.includes('amazing') || lower.includes('hot')) {
      best = labels.find((l) => l.toUpperCase().includes('POSITIVE')) ?? labels[0];
    } else if (lower.includes('bad') || lower.includes('cold') || lower.includes('late') || lower.includes('hate')) {
      best = labels.find((l) => l.toUpperCase().includes('NEGATIVE')) ?? labels[0];
    } else {
      best = labels.find((l) => l.toUpperCase().includes('NEUTRAL')) ?? labels[0];
    }
    return { label: best, confidence: 0.7 };
  }
}

class OpenAIProvider implements AIProvider {
  name = 'openai';
  private client: any;
  private model: string;

  constructor(apiKey: string, model = 'gpt-4o-mini') {
    this.model = model;
    // Lazy-load to avoid pulling in the SDK when not needed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { default: OpenAI } = require('openai');
    this.client = new OpenAI({ apiKey });
  }

  async chat(messages: ChatMessage[], opts?: { temperature?: number; maxTokens?: number }) {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: opts?.temperature ?? 0.4,
      max_tokens: opts?.maxTokens ?? 600,
    });
    return completion.choices[0]?.message?.content ?? '';
  }

  async classify(text: string, labels: string[]) {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `Classify the user text into exactly one of these labels: ${labels.join(', ')}. Reply only with the label.`,
        },
        { role: 'user', content: text },
      ],
      temperature: 0,
    });
    const raw = (completion.choices[0]?.message?.content ?? labels[0]).trim().toUpperCase();
    const match = labels.find((l) => l.toUpperCase() === raw) ?? labels[0];
    return { label: match, confidence: 0.85 };
  }
}

let cached: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (cached) return cached;
  const key = process.env.OPENAI_API_KEY;
  const provider = process.env.AI_PROVIDER || (key ? 'openai' : 'mock');
  if (provider === 'openai' && key) {
    try {
      cached = new OpenAIProvider(key);
      return cached;
    } catch {
      // fall through to mock
    }
  }
  cached = new MockProvider();
  return cached;
}
