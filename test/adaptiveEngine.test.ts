import { computeLocalAdaptiveTier } from '../src/services/adaptiveEngine';
import { GameSessionTelemetry } from '../src/types';

describe('Hybrid Adaptive AI Engine', () => {
  it('should upgrade difficulty from easy to medium when player has high accuracy and low reaction time', () => {
    const mockSessions: GameSessionTelemetry[] = [
      {
        id: '1',
        patientId: 'p1',
        gameType: 'memory_match',
        difficultyTier: 'easy',
        score: 100,
        accuracy: 95,
        averageReactionTimeMs: 1500,
        hesitationCount: 0,
        totalTrials: 4,
        successfulTrials: 4,
        durationSeconds: 15,
        timestamp: Date.now(),
      },
      {
        id: '2',
        patientId: 'p1',
        gameType: 'memory_match',
        difficultyTier: 'easy',
        score: 90,
        accuracy: 90,
        averageReactionTimeMs: 1800,
        hesitationCount: 1,
        totalTrials: 4,
        successfulTrials: 4,
        durationSeconds: 18,
        timestamp: Date.now(),
      },
    ];

    const result = computeLocalAdaptiveTier('memory_match', 'easy', mockSessions);
    expect(result.suggestedTier).toBe('medium');
    expect(result.performanceTrend).toBe('improving');
  });

  it('should soften difficulty from hard to medium if player exhibits low accuracy or high hesitation', () => {
    const mockSessions: GameSessionTelemetry[] = [
      {
        id: '1',
        patientId: 'p1',
        gameType: 'pattern_recognition',
        difficultyTier: 'hard',
        score: 30,
        accuracy: 40,
        averageReactionTimeMs: 4500,
        hesitationCount: 6,
        totalTrials: 5,
        successfulTrials: 2,
        durationSeconds: 35,
        timestamp: Date.now(),
      }
    ];

    const result = computeLocalAdaptiveTier('pattern_recognition', 'hard', mockSessions);
    expect(result.suggestedTier).toBe('medium');
    expect(result.performanceTrend).toBe('declining');
  });

  it('should maintain stable tier when performance is balanced', () => {
    const mockSessions: GameSessionTelemetry[] = [
      {
        id: '1',
        patientId: 'p1',
        gameType: 'focus_tap',
        difficultyTier: 'medium',
        score: 70,
        accuracy: 75,
        averageReactionTimeMs: 2500,
        hesitationCount: 2,
        totalTrials: 6,
        successfulTrials: 5,
        durationSeconds: 20,
        timestamp: Date.now(),
      }
    ];

    const result = computeLocalAdaptiveTier('focus_tap', 'medium', mockSessions);
    expect(result.suggestedTier).toBe('medium');
    expect(result.performanceTrend).toBe('stable');
  });
});
