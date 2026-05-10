import { AgentDefinition, AgentResult } from '../agent';
import { getAIProvider } from '../provider';

export interface SupportAgentInput {
  message: string;
  orderStatus?: string;
  category?: 'REFUND' | 'DELIVERY' | 'FOOD_QUALITY' | 'PAYMENT' | 'ACCOUNT' | 'OTHER';
}

export interface SupportAgentOutput {
  reply: string;
  intent: string;
  suggestedActions: Array<{ label: string; action: string }>;
  escalate: boolean;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

const INTENT_PATTERNS: Array<[RegExp, string, 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT']> = [
  [/refund|money back|charged twice|double charge/i, 'REFUND_REQUEST', 'HIGH'],
  [/missing item|wrong order|forgot/i, 'WRONG_ORDER', 'HIGH'],
  [/cold|soggy|burnt|inedible|spoiled|sick/i, 'FOOD_QUALITY', 'HIGH'],
  [/late|delay|where is|tracking|hasn't arrived|stuck/i, 'DELIVERY_DELAY', 'NORMAL'],
  [/account|login|password|locked/i, 'ACCOUNT', 'NORMAL'],
  [/coupon|promo|discount/i, 'COUPONS', 'LOW'],
  [/cancel/i, 'CANCEL_ORDER', 'NORMAL'],
];

export const SupportAgent: AgentDefinition<SupportAgentInput, SupportAgentOutput> = {
  id: 'support',
  name: 'Customer Support Agent',
  description:
    'Triages customer messages, classifies intent, drafts a helpful reply, and recommends actions (refund, re-deliver, escalate).',
  capabilities: ['Intent classification', 'Draft reply', 'Suggested actions', 'Auto-escalation'],
  rolesAllowed: ['CUSTOMER', 'ADMIN', 'SYSTEM'],
  sampleInput: {
    message: "My order arrived 40 minutes late and the food was cold. Can I get a refund?",
    orderStatus: 'DELIVERED',
  },

  async run(input): Promise<AgentResult<SupportAgentOutput>> {
    const reasoning: string[] = [];
    let intent = 'GENERAL_INQUIRY';
    let priority: SupportAgentOutput['priority'] = 'NORMAL';
    for (const [re, label, p] of INTENT_PATTERNS) {
      if (re.test(input.message)) {
        intent = label;
        priority = p;
        reasoning.push(`Matched pattern → ${label}`);
        break;
      }
    }

    const actions: SupportAgentOutput['suggestedActions'] = [];
    if (intent === 'REFUND_REQUEST' || intent === 'FOOD_QUALITY' || intent === 'WRONG_ORDER') {
      actions.push({ label: 'Issue full refund', action: 'order:refund' });
      actions.push({ label: 'Issue partial refund (50%)', action: 'order:refund-partial' });
      actions.push({ label: 'Apply $5 credit to wallet', action: 'wallet:credit:5' });
    }
    if (intent === 'DELIVERY_DELAY') {
      actions.push({ label: 'Apologise + apply free-delivery coupon', action: 'coupon:issue:FREESHIP' });
      actions.push({ label: 'Reassign new courier', action: 'order:reassign-courier' });
    }
    if (intent === 'CANCEL_ORDER') {
      actions.push({ label: 'Cancel and refund', action: 'order:cancel' });
    }
    if (intent === 'ACCOUNT') {
      actions.push({ label: 'Send password reset email', action: 'auth:reset-password' });
    }
    if (intent === 'COUPONS') {
      actions.push({ label: 'Share active coupons', action: 'coupon:list' });
    }
    if (!actions.length) {
      actions.push({ label: 'Acknowledge and follow up in 1h', action: 'ticket:followup' });
    }

    const escalate = priority === 'HIGH' || priority === 'URGENT' || actions.length === 0;
    if (escalate) reasoning.push('Escalated to human agent due to severity');

    const provider = getAIProvider();
    let reply = '';
    try {
      reply = await provider.chat([
        {
          role: 'system',
          content:
            'You are a polite, empathetic customer-support agent for a food-delivery platform. Reply in 2-3 short sentences. Acknowledge the issue, propose a concrete next step, and avoid corporate boilerplate.',
        },
        {
          role: 'user',
          content: `Customer message: "${input.message}"\nIntent: ${intent}\nOrder status: ${input.orderStatus ?? 'unknown'}\nWrite the reply.`,
        },
      ]);
    } catch {
      reply = '';
    }

    if (!reply || reply.length < 10) {
      // Fallback templates per intent
      const templates: Record<string, string> = {
        REFUND_REQUEST:
          'I am really sorry about the experience. I can issue a refund right away — would a full refund or a 50% partial refund with a $5 wallet credit work better for you?',
        FOOD_QUALITY:
          'I am so sorry the food did not arrive in good condition. I have flagged the restaurant and would like to make this right with a full refund. Could you share a photo so we can take this up with them?',
        WRONG_ORDER:
          'I am sorry about the mix-up. I can issue a refund for the missing items or send a fresh delivery — which would you prefer?',
        DELIVERY_DELAY:
          'I apologise for the delay — that is not the experience we aim for. I have applied a free-delivery coupon to your account, and we are looking into what slowed this order down.',
        CANCEL_ORDER:
          'No problem — I can cancel this order and process the refund immediately. It should land back on your card within 3-5 business days.',
        ACCOUNT:
          'Thanks for reaching out. I have sent a password-reset link to your registered email — let me know if you do not see it within a few minutes.',
        COUPONS:
          'Happy to help! Right now WELCOME10 (10% off your next order) and FREESHIP (free delivery) are both active for you.',
        GENERAL_INQUIRY:
          'Thanks for reaching out — could you share a bit more detail so I can help you fastest?',
      };
      reply = templates[intent] ?? templates.GENERAL_INQUIRY;
    }

    return {
      output: { reply, intent, suggestedActions: actions, escalate, priority },
      reasoning,
      confidence: priority === 'URGENT' ? 0.95 : 0.85,
      usedTools: ['intent-classifier', 'reply-llm', 'action-suggester'],
      modelVersion: 'support-agent-v1',
    };
  },
};
