import type { BoostPlan, BoostPlanId, Listing } from '../types/index.ts';

export const BOOST_PLANS: readonly BoostPlan[] = [
  {
    id: 'decouverte',
    name: 'Découverte',
    priceFCFA: 500,
    durationHours: 24,
    durationLabel: '24 heures',
    priority: 1,
    badgeLabel: 'Boost Découverte',
    tagline: 'Idéal pour tester la mise en avant rapide',
    benefits: [
      'Visibilité boostée pendant 24h',
      'Badge Boost affiché sur l’annonce',
      'Remontée devant les annonces standard',
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    priceFCFA: 1000,
    durationHours: 72,
    durationLabel: '3 jours',
    priority: 2,
    badgeLabel: 'Boost Standard',
    tagline: 'Pour accélérer les appels dès ce week-end',
    benefits: [
      'Mise en avant continue 3 jours',
      'Badge Boost visible dans le catalogue',
      'Priorité devant Découverte et gratuit',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    priceFCFA: 1500,
    durationHours: 168,
    durationLabel: '7 jours',
    priority: 3,
    isPopular: true,
    badgeLabel: 'Boost Premium',
    tagline: 'Le meilleur équilibre visibilité et prix',
    benefits: [
      'Priorité élevée pendant 7 jours',
      'Badge Premium mis en évidence',
      'Jusqu’à 5x plus d’appels Wave / OM',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceFCFA: 2500,
    durationHours: 360,
    durationLabel: '15 jours',
    priority: 4,
    badgeLabel: 'Boost Pro',
    tagline: 'Pensé pour les vendeurs réguliers',
    benefits: [
      'Exposition prioritaire 15 jours',
      'Badge Pro visible sur chaque grille',
      'Positionné au-dessus des offres Premium',
    ],
  },
  {
    id: 'vip',
    name: 'VIP',
    priceFCFA: 4000,
    durationHours: 720,
    durationLabel: '30 jours',
    priority: 5,
    badgeLabel: 'Boost VIP',
    tagline: 'Visibilité maximale tout le mois',
    benefits: [
      'Top priorité absolue pendant 30 jours',
      'Badge VIP exclusif sur l’annonce',
      'Exposition maximale sur tout le Sénégal',
    ],
  },
] as const;

export const BOOST_PLANS_MAP: Record<BoostPlanId, BoostPlan> = {
  decouverte: BOOST_PLANS[0],
  standard: BOOST_PLANS[1],
  premium: BOOST_PLANS[2],
  pro: BOOST_PLANS[3],
  vip: BOOST_PLANS[4],
};

export function isValidBoostPlanId(planId: unknown): planId is BoostPlanId {
  return typeof planId === 'string' && planId in BOOST_PLANS_MAP;
}

export function getBoostPlan(planId: BoostPlanId): BoostPlan {
  return BOOST_PLANS_MAP[planId];
}

export function isListingBoostActive(listing: Pick<Listing, 'isFeatured' | 'boostExpiresAt'>): boolean {
  if (!listing.isFeatured) return false;
  if (!listing.boostExpiresAt) return true;
  const expiresMs = Date.parse(listing.boostExpiresAt);
  if (Number.isNaN(expiresMs)) return false;
  return expiresMs > Date.now();
}

export function getListingBoostPriority(listing: Pick<Listing, 'isFeatured' | 'boostExpiresAt' | 'boostPriority' | 'boostPlanId'>): number {
  if (!isListingBoostActive(listing)) return 0;
  if (typeof listing.boostPriority === 'number' && listing.boostPriority > 0) {
    return listing.boostPriority;
  }
  if (listing.boostPlanId && listing.boostPlanId in BOOST_PLANS_MAP) {
    return BOOST_PLANS_MAP[listing.boostPlanId].priority;
  }
  return 1;
}

export function getBoostBadgeLabel(listing: Pick<Listing, 'isFeatured' | 'boostExpiresAt' | 'boostPlanId' | 'boostPlanName'>): string {
  if (!isListingBoostActive(listing)) return '';
  if (listing.boostPlanName) return `Boost ${listing.boostPlanName}`;
  if (listing.boostPlanId && listing.boostPlanId in BOOST_PLANS_MAP) {
    return BOOST_PLANS_MAP[listing.boostPlanId].badgeLabel;
  }
  return 'Sponsorisé';
}

export function getBoostRemainingLabel(boostExpiresAt?: string): string {
  if (!boostExpiresAt) return '';
  const diffMs = Date.parse(boostExpiresAt) - Date.now();
  if (Number.isNaN(diffMs) || diffMs <= 0) return 'Expiré';
  const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));
  if (totalHours < 24) return `${totalHours}h restantes`;
  const days = Math.ceil(totalHours / 24);
  return `${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''}`;
}
