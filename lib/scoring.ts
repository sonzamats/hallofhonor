const AWARD_WEIGHTS: Record<string, number> = {
  'medal-of-honor': 100,
  'distinguished-service-cross': 50,
  'navy-cross': 50,
  'air-force-cross': 50,
  'coast-guard-cross': 50,
  'silver-star': 20,
  'distinguished-flying-cross': 15,
  'bronze-star': 10,
  'purple-heart': 5,
  'legion-of-merit': 3,
  'pow-medal': 3,
};

export function getAwardWeight(slug: string): number {
  return AWARD_WEIGHTS[slug] ?? 3;
}

export function calculateRecipientScore(
  awards: { award_slug: string; oak_leaf_clusters?: number }[]
): number {
  return awards.reduce((total, a) => {
    const base = getAwardWeight(a.award_slug);
    const clusters = a.oak_leaf_clusters ?? 0;
    return total + base * (1 + clusters);
  }, 0);
}
