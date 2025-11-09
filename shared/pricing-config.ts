/**
 * Flexible Pricing Configuration
 * 
 * Change tiers, limits, and prices here without touching any other code.
 * All usage tracking, Stripe integration, and UI will automatically adapt.
 */

export type SubscriptionTier = 'free' | 'pro' | 'pro_plus';

export interface TierConfig {
  name: string;
  displayName: string;
  price: number; // in dollars
  stripePriceId: string | null; // null for free tier
  limits: {
    audioAnalysesPerMonth: number | 'unlimited';
    audioAnalysesLifetime?: number; // Only for free tier
    midiGenerationsPerMonth?: number | 'unlimited';
    stemSeparationsPerMonth?: number | 'unlimited';
    projects?: number | 'unlimited';
    collaborators?: number;
    storageGB?: number;
  };
  features: string[];
}

/**
 * PRICING CONFIGURATION
 *
 * Edit these values to change your pricing model.
 * Everything else will automatically update.
 */
export const PRICING_CONFIG: Record<SubscriptionTier, TierConfig> = {
  free: {
    name: 'free',
    displayName: 'Free',
    price: 0,
    stripePriceId: null,
    limits: {
      audioAnalysesPerMonth: 0, // No monthly limit
      audioAnalysesLifetime: 1, // Only 1 lifetime analysis
      projects: 1,
      collaborators: 0,
      storageGB: 0.5,
    },
    features: [
      '1 audio analysis (lifetime)',
      'Unlimited chat (no audio)',
      '30-day history',
      '1 project',
    ],
  },

  pro: {
    name: 'pro',
    displayName: 'Pro',
    price: 19,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_monthly',
    limits: {
      audioAnalysesPerMonth: 10,
      midiGenerationsPerMonth: 50,
      stemSeparationsPerMonth: 5,
      projects: 10,
      collaborators: 0,
      storageGB: 10,
    },
    features: [
      '10 audio analyses per month',
      '50 MIDI generations per month',
      '5 stem separations per month',
      'Unlimited chat & history',
      '10 projects',
      'PDF export',
      'Priority support',
    ],
  },

  pro_plus: {
    name: 'pro_plus',
    displayName: 'Pro Plus',
    price: 39,
    stripePriceId: process.env.STRIPE_PRO_PLUS_PRICE_ID || 'price_pro_plus_monthly',
    limits: {
      audioAnalysesPerMonth: 30,
      midiGenerationsPerMonth: 'unlimited',
      stemSeparationsPerMonth: 30,
      projects: 'unlimited',
      collaborators: 5,
      storageGB: 100,
    },
    features: [
      '30 audio analyses per month',
      'Unlimited MIDI generations',
      '30 stem separations per month',
      'Unlimited projects',
      '5 collaborators per project',
      '100GB storage',
      'API access',
      'Priority chat support',
    ],
  },
};

/**
 * Alias for backward compatibility with the guide
 */
export const PRICING_TIERS = PRICING_CONFIG;

/**
 * Helper function to get tier config
 */
export function getTierConfig(tier: SubscriptionTier): TierConfig {
  return PRICING_CONFIG[tier];
}

/**
 * Simplified limits interface for the guide's UpgradeModal
 */
export interface SimplifiedLimits {
  audioAnalyses: number;
}

/**
 * Get simplified tier info for UpgradeModal
 */
export function getSimplifiedTierLimits(tier: SubscriptionTier): SimplifiedLimits {
  const config = PRICING_CONFIG[tier];

  // For free tier, use lifetime limit; for paid tiers, use monthly limit
  const audioAnalyses = tier === 'free'
    ? (config.limits.audioAnalysesLifetime || 1)
    : (config.limits.audioAnalysesPerMonth as number);

  return { audioAnalyses };
}

/**
 * Helper function to check if user has reached limit
 */
export function hasReachedLimit(
  tier: SubscriptionTier,
  usageType: 'audioAnalyses' | 'midiGenerations' | 'stemSeparations',
  currentUsage: number,
  isLifetime: boolean = false
): boolean {
  const config = getTierConfig(tier);

  // Special case: free tier lifetime limit
  if (tier === 'free' && usageType === 'audioAnalyses' && isLifetime) {
    return currentUsage >= (config.limits.audioAnalysesLifetime || 0);
  }

  // Monthly limits
  let limit: number | 'unlimited' = 0;
  switch (usageType) {
    case 'audioAnalyses':
      limit = config.limits.audioAnalysesPerMonth;
      break;
    case 'midiGenerations':
      limit = config.limits.midiGenerationsPerMonth || 0;
      break;
    case 'stemSeparations':
      limit = config.limits.stemSeparationsPerMonth || 0;
      break;
  }

  if (limit === 'unlimited') return false;
  return currentUsage >= limit;
}

/**
 * Helper function to get upgrade message
 */
export function getUpgradeMessage(
  currentTier: SubscriptionTier,
  usageType: 'audioAnalyses' | 'midiGenerations' | 'stemSeparations'
): string {
  const config = getTierConfig(currentTier);
  
  if (currentTier === 'free') {
    return `Free tier limit reached. You've used your ${config.limits.audioAnalysesLifetime} lifetime analysis. Upgrade to Pro for $${PRICING_CONFIG.pro.price}/month to get ${PRICING_CONFIG.pro.limits.audioAnalysesPerMonth} analyses per month.`;
  }
  
  if (currentTier === 'pro') {
    return `Pro tier limit reached. You've used all ${config.limits.audioAnalysesPerMonth} analyses this month. Upgrade to Pro Plus for $${PRICING_CONFIG.pro_plus.price}/month to get ${PRICING_CONFIG.pro_plus.limits.audioAnalysesPerMonth} analyses per month.`;
  }
  
  return `You've reached your monthly limit. Your limit will reset at the start of your next billing cycle.`;
}

/**
 * Helper function to get remaining usage
 */
export function getRemainingUsage(
  tier: SubscriptionTier,
  usageType: 'audioAnalyses' | 'midiGenerations' | 'stemSeparations',
  currentUsage: number
): number | 'unlimited' {
  const config = getTierConfig(tier);
  
  let limit: number | 'unlimited' = 0;
  switch (usageType) {
    case 'audioAnalyses':
      limit = config.limits.audioAnalysesPerMonth;
      break;
    case 'midiGenerations':
      limit = config.limits.midiGenerationsPerMonth || 0;
      break;
    case 'stemSeparations':
      limit = config.limits.stemSeparationsPerMonth || 0;
      break;
  }
  
  if (limit === 'unlimited') return 'unlimited';
  return Math.max(0, limit - currentUsage);
}
