import { 
  CognitiveGameType, 
  DifficultyTier, 
  GameSessionTelemetry, 
  AdaptiveScoreResult 
} from '../types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

/**
 * Calculates adaptive difficulty by calling Next.js API route if online,
 * or running the identical edge heuristic algorithm locally if offline.
 */
export async function calculateAdaptiveTier(
  gameType: CognitiveGameType,
  currentTier: DifficultyTier,
  recentSessions: GameSessionTelemetry[]
): Promise<AdaptiveScoreResult> {
  // If no sessions, maintain current tier
  if (!recentSessions || recentSessions.length === 0) {
    return {
      gameType,
      currentTier,
      suggestedTier: currentTier,
      confidenceScore: 0.5,
      performanceTrend: 'stable',
      metrics: {
        rollingAccuracy: 100,
        rollingReactionTimeMs: 2000,
        hesitationIndex: 0,
      }
    };
  }

  // 1. Try Next.js Cloud Route
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500); // Quick timeout for offline

    const response = await fetch(`${API_BASE_URL}/api/cognitive/adapt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameType, currentTier, recentSessions }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const result = await response.json();
      return result;
    }
  } catch {
    // Network failure / offline: seamlessly execute local fallback
  }

  // 2. On-Device Fallback Heuristic
  return computeLocalAdaptiveTier(gameType, currentTier, recentSessions);
}

/**
 * Local edge heuristic formula:
 * Evaluates rolling accuracy, average reaction time, and hesitation rate.
 */
export function computeLocalAdaptiveTier(
  gameType: CognitiveGameType,
  currentTier: DifficultyTier,
  recentSessions: GameSessionTelemetry[]
): AdaptiveScoreResult {
  const windowSessions = recentSessions.slice(-5); // Last 5 sessions
  const count = windowSessions.length;

  const totalAccuracy = windowSessions.reduce((acc, s) => acc + s.accuracy, 0);
  const totalReaction = windowSessions.reduce((acc, s) => acc + s.averageReactionTimeMs, 0);
  const totalHesitation = windowSessions.reduce((acc, s) => acc + s.hesitationCount, 0);

  const rollingAccuracy = Math.round(totalAccuracy / count);
  const rollingReactionTimeMs = Math.round(totalReaction / count);
  const hesitationIndex = +(totalHesitation / count).toFixed(1);

  let suggestedTier: DifficultyTier = currentTier;
  let performanceTrend: 'improving' | 'stable' | 'declining' = 'stable';

  // Scoring Logic:
  // High mastery (>85% accuracy and fast reaction): upgrade tier
  // Low mastery (<55% accuracy or excessive hesitation): soften difficulty to avoid frustration
  if (rollingAccuracy >= 85 && rollingReactionTimeMs < 3500 && hesitationIndex <= 2) {
    performanceTrend = 'improving';
    if (currentTier === 'easy') suggestedTier = 'medium';
    else if (currentTier === 'medium') suggestedTier = 'hard';
  } else if (rollingAccuracy < 55 || hesitationIndex >= 5) {
    performanceTrend = 'declining';
    if (currentTier === 'hard') suggestedTier = 'medium';
    else if (currentTier === 'medium') suggestedTier = 'easy';
  }

  return {
    gameType,
    currentTier,
    suggestedTier,
    confidenceScore: 0.85,
    performanceTrend,
    metrics: {
      rollingAccuracy,
      rollingReactionTimeMs,
      hesitationIndex,
    }
  };
}
