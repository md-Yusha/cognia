import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameType, currentTier, recentSessions } = body;

    if (!gameType || !recentSessions) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const windowSessions = (recentSessions || []).slice(-5);
    const count = windowSessions.length;

    if (count === 0) {
      return NextResponse.json({
        gameType,
        currentTier: currentTier || 'easy',
        suggestedTier: currentTier || 'easy',
        confidenceScore: 0.5,
        performanceTrend: 'stable',
        metrics: {
          rollingAccuracy: 100,
          rollingReactionTimeMs: 2000,
          hesitationIndex: 0,
        },
      });
    }

    const totalAccuracy = windowSessions.reduce((acc: number, s: any) => acc + (s.accuracy || 0), 0);
    const totalReaction = windowSessions.reduce((acc: number, s: any) => acc + (s.averageReactionTimeMs || 0), 0);
    const totalHesitation = windowSessions.reduce((acc: number, s: any) => acc + (s.hesitationCount || 0), 0);

    const rollingAccuracy = Math.round(totalAccuracy / count);
    const rollingReactionTimeMs = Math.round(totalReaction / count);
    const hesitationIndex = +(totalHesitation / count).toFixed(1);

    let suggestedTier = currentTier || 'easy';
    let performanceTrend = 'stable';

    if (rollingAccuracy >= 85 && rollingReactionTimeMs < 3500 && hesitationIndex <= 2) {
      performanceTrend = 'improving';
      if (currentTier === 'easy') suggestedTier = 'medium';
      else if (currentTier === 'medium') suggestedTier = 'hard';
    } else if (rollingAccuracy < 55 || hesitationIndex >= 5) {
      performanceTrend = 'declining';
      if (currentTier === 'hard') suggestedTier = 'medium';
      else if (currentTier === 'medium') suggestedTier = 'easy';
    }

    return NextResponse.json({
      gameType,
      currentTier,
      suggestedTier,
      confidenceScore: 0.92,
      performanceTrend,
      metrics: {
        rollingAccuracy,
        rollingReactionTimeMs,
        hesitationIndex,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to compute cognitive tier' }, { status: 500 });
  }
}
