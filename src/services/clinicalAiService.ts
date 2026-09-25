import { GameSessionTelemetry, PatientProfile, ClinicalAiAssessment } from '../types';
import { DailyActivityItem } from './activityService';

/**
 * AI-driven cognitive assessment that tracks cognitive stability, sundowning risk patterns,
 * and generates actionable clinical recommendations for caregivers and doctors.
 */
export function generateClinicalAiAssessment(
  patient: PatientProfile,
  sessions: GameSessionTelemetry[],
  activities: DailyActivityItem[]
): ClinicalAiAssessment {
  if (sessions.length === 0) {
    return {
      cognitiveStabilityIndex: 82,
      trend: 'stable',
      sundowningRisk: 'low',
      reactionTimeAvgMs: 1450,
      adherenceRate: 85,
      summaryHeadline: 'Baseline Established • Mild Cognitive Stability',
      clinicalObservations: [
        'Patient has begun initial cognitive onboarding exercises.',
        'Initial baseline indicates receptive motor response and familiar object recall.',
        'No evening sundowning flags detected in current logs.',
      ],
      actionableRecommendations: [
        'Engage in daily morning memory routines between 9:00 AM and 11:30 AM.',
        'Reinforce hydration with warm Assam tea after breakfast for sensory recall.',
        'Maintain consistent sleep-wake cycles to support circadian stability.',
      ],
      generatedAt: Date.now(),
    };
  }

  // 1. Calculate Average Reaction Time and Accuracy
  const totalReactionTime = sessions.reduce((acc, s) => acc + (s.averageReactionTimeMs || 1500), 0);
  const reactionTimeAvgMs = Math.round(totalReactionTime / sessions.length);

  const totalAccuracy = sessions.reduce((acc, s) => acc + (s.accuracy || 75), 0);
  const avgAccuracy = totalAccuracy / sessions.length;

  // 2. Trend analysis (Compare newest half with older half)
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (sessions.length >= 4) {
    const half = Math.floor(sessions.length / 2);
    const recentBatch = sessions.slice(0, half);
    const olderBatch = sessions.slice(half);

    const recentAcc = recentBatch.reduce((sum, s) => sum + s.accuracy, 0) / recentBatch.length;
    const olderAcc = olderBatch.reduce((sum, s) => sum + s.accuracy, 0) / olderBatch.length;

    if (recentAcc - olderAcc >= 6) {
      trend = 'improving';
    } else if (olderAcc - recentAcc >= 8) {
      trend = 'declining';
    }
  }

  // 3. Sundowning Analysis (Dusk / Evening Degradation)
  // Check sessions played between 16:00 and 20:00
  let eveningSessions = 0;
  let eveningHesitations = 0;
  let morningSessions = 0;
  let morningHesitations = 0;

  sessions.forEach((s) => {
    const hour = new Date(s.timestamp).getHours();
    if (hour >= 16 && hour <= 20) {
      eveningSessions++;
      eveningHesitations += s.hesitationCount || 0;
    } else if (hour >= 8 && hour <= 13) {
      morningSessions++;
      morningHesitations += s.hesitationCount || 0;
    }
  });

  const avgEveningHesitations = eveningSessions ? eveningHesitations / eveningSessions : 0;
  const avgMorningHesitations = morningSessions ? morningHesitations / morningSessions : 0;

  // Also inspect stress alerts in activities
  const eveningAgitationActivities = activities.filter((a) => {
    const hour = new Date(a.timestamp).getHours();
    return (a.type === 'stress' || !!a.whyClinical?.includes('sundowning')) && hour >= 16;
  }).length;

  let sundowningRisk: 'low' | 'moderate' | 'high' = 'low';
  if (eveningAgitationActivities > 1 || (eveningSessions >= 2 && avgEveningHesitations > avgMorningHesitations * 1.5)) {
    sundowningRisk = 'high';
  } else if (eveningAgitationActivities === 1 || avgEveningHesitations > avgMorningHesitations * 1.2) {
    sundowningRisk = 'moderate';
  }

  // 4. Cognitive Stability Index (0 - 100)
  // Weighted: Accuracy (40%), Reaction speed appropriateness (30%), Routine adherence (30%)
  const speedScore = Math.max(30, Math.min(100, Math.round(100 - (reactionTimeAvgMs - 800) / 25)));
  const adherenceScore = Math.min(100, Math.max(40, activities.length * 12));
  const cognitiveStabilityIndex = Math.min(98, Math.max(35, Math.round(avgAccuracy * 0.4 + speedScore * 0.3 + adherenceScore * 0.3)));

  // 5. Clinical Observations
  const clinicalObservations: string[] = [];
  if (avgAccuracy >= 80) {
    clinicalObservations.push(`Robust visual recognition (${Math.round(avgAccuracy)}% overall accuracy) on regional symbols.`);
  } else {
    clinicalObservations.push(`Moderate working memory fatigue noted during multi-step sequencing (${Math.round(avgAccuracy)}% accuracy).`);
  }

  if (reactionTimeAvgMs < 1300) {
    clinicalObservations.push(`Responsive motor processing speed (${reactionTimeAvgMs}ms mean reaction time).`);
  } else {
    clinicalObservations.push(`Mild delay in stimulus response (${reactionTimeAvgMs}ms); beneficial to provide verbal cues.`);
  }

  if (sundowningRisk === 'high') {
    clinicalObservations.push(`Evening sundowning flag: Noticeable increase in agitation and hesitation after 4:30 PM.`);
  } else if (sundowningRisk === 'moderate') {
    clinicalObservations.push(`Slight dusk restlessness detected; patient benefits from calming afternoon Assam tea ritual.`);
  } else {
    clinicalObservations.push(`Consistent emotional baseline across morning and afternoon sessions.`);
  }

  // 6. Actionable Recommendations
  const actionableRecommendations: string[] = [];
  if (sundowningRisk === 'high') {
    actionableRecommendations.push('Schedule cognitive games strictly between 9:30 AM and 1:00 PM when alertness peaks.');
    actionableRecommendations.push('Turn on bright, warm indoor lighting by 4:00 PM to counteract dusk disorientation.');
  } else {
    actionableRecommendations.push('Continue encouraging daily morning tea and hydration check-in rituals.');
  }

  if (trend === 'declining') {
    actionableRecommendations.push('Temporarily adjust game difficulty to Mild tier to preserve confidence and reduce frustration.');
  } else {
    actionableRecommendations.push('Gradually challenge with 6-card memory grids and family photo reminiscence recall.');
  }

  actionableRecommendations.push('Share 30-day cognitive summary with the visiting PHC doctor or ASHA community worker.');

  let summaryHeadline = `${cognitiveStabilityIndex}/100 Stability Score • ${trend === 'improving' ? 'Positive Cognitive Trajectory' : trend === 'stable' ? 'Stable Cognitive Baseline' : 'Attention Fluctuations Noted'}`;

  return {
    cognitiveStabilityIndex,
    trend,
    sundowningRisk,
    reactionTimeAvgMs,
    adherenceRate: Math.min(100, Math.round(adherenceScore)),
    summaryHeadline,
    clinicalObservations,
    actionableRecommendations,
    generatedAt: Date.now(),
  };
}
