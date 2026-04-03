interface LeadScoreInput {
  estimatedMonthlyVolume: number | null;
  vertical: string | null;
  leadSource: string | null;
  lastContactDate: string | null;
}

const VERTICAL_SCORES: Record<string, number> = {
  restaurant: 20,
  retail: 18,
  healthcare: 22,
  hospitality: 18,
  ecommerce: 15,
  automotive: 16,
  salon: 14,
  gym: 14,
  services: 12,
};

const SOURCE_SCORES: Record<string, number> = {
  referral: 25,
  "warm referral": 25,
  inbound: 20,
  "trade show": 18,
  "cold call": 10,
  "social media": 12,
  website: 15,
  email: 10,
};

export function calculateLeadScore(input: LeadScoreInput): number {
  let score = 0;

  // Volume score (0-40 points)
  const vol = input.estimatedMonthlyVolume ?? 0;
  if (vol >= 500000) score += 40;
  else if (vol >= 200000) score += 32;
  else if (vol >= 100000) score += 25;
  else if (vol >= 50000) score += 18;
  else if (vol >= 20000) score += 12;
  else if (vol >= 5000) score += 6;

  // Vertical score (0-22 points)
  if (input.vertical) {
    const vKey = input.vertical.toLowerCase();
    score += VERTICAL_SCORES[vKey] ?? 10;
  }

  // Source score (0-25 points)
  if (input.leadSource) {
    const sKey = input.leadSource.toLowerCase();
    score += SOURCE_SCORES[sKey] ?? 8;
  }

  // Recency score (0-13 points) — based on last contact date
  if (input.lastContactDate) {
    const daysSince = Math.floor(
      (Date.now() - new Date(input.lastContactDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince <= 3) score += 13;
    else if (daysSince <= 7) score += 10;
    else if (daysSince <= 14) score += 7;
    else if (daysSince <= 30) score += 3;
  }

  return Math.min(100, Math.max(0, score));
}
