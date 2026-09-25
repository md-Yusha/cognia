import { Share, Alert, Platform } from 'react-native';
import { PatientProfile, GameSessionTelemetry, ClinicalAiAssessment } from '../types';
import { DailyActivityItem } from './activityService';

/**
 * Formats a clean clinical diagnostic report string suitable for sharing
 * with visiting doctors, PHC officers, or family members.
 */
export function formatClinicalSummaryText(
  patient: PatientProfile,
  assessment: ClinicalAiAssessment,
  sessions: GameSessionTelemetry[]
): string {
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return `🏥 COGNIA CLINICAL HEALTH REPORT
MDoNER Elderly Dementia Assistance Platform
Date: ${dateStr}

PATIENT PROFILE:
• Name: ${patient.name}
• Age / Gender: ${patient.age || 'Elder'} yrs • ${patient.gender || 'N/A'}
• Location: ${patient.city || 'North Eastern Region'} (${patient.locationAddress || 'NER District'})
• Dementia Stage: ${(patient.dementiaStage || 'mild').toUpperCase()}
• Access Code: ${patient.accessCode}
${patient.familyCaregivers && patient.familyCaregivers.length > 0 ? `• Registered Family Contacts: ${patient.familyCaregivers.map(f => `${f.name} (${f.relationship || 'Family'}) Ph: ${f.phone}, Email: ${f.email}`).join('; ')}` : ''}

COGNITIVE TRAJECTORY ASSESSMENT:
• Stability Index: ${assessment.cognitiveStabilityIndex} / 100
• Performance Trend: ${assessment.trend.toUpperCase()}
• Evening Sundowning Risk: ${assessment.sundowningRisk.toUpperCase()}
• Average Reaction Time: ${assessment.reactionTimeAvgMs} ms
• Total Recorded Sessions: ${sessions.length}

CLINICAL OBSERVATIONS:
${assessment.clinicalObservations.map((obs) => `• ${obs}`).join('\n')}

ACTIONABLE RECOMMENDATIONS:
${assessment.actionableRecommendations.map((rec) => `• ${rec}`).join('\n')}

Generated via Cognia MedTech Platform for Ministry of Development of North Eastern Region (MDoNER).`;
}

/**
 * Triggers native OS share sheet with the clinical report summary
 */
export async function shareClinicalReport(
  patient: PatientProfile,
  assessment: ClinicalAiAssessment,
  sessions: GameSessionTelemetry[]
): Promise<void> {
  const content = formatClinicalSummaryText(patient, assessment, sessions);
  try {
    await Share.share({
      title: `Cognia Clinical Report - ${patient.name}`,
      message: content,
    });
  } catch (err) {
    Alert.alert('Sharing Error', 'Unable to open share dialog.');
  }
}

/**
 * Generates an HTML clinical document ready for viewing in a WebView or printing
 */
export function generateClinicalReportHtml(
  patient: PatientProfile,
  assessment: ClinicalAiAssessment,
  sessions: GameSessionTelemetry[],
  activities: DailyActivityItem[]
): string {
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const recentSessions = sessions.slice(0, 5);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cognia Clinical Report - ${patient.name}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 24px;
      color: #1E293B;
      background: #FFFFFF;
      line-height: 1.5;
    }
    .header {
      border-bottom: 3px solid #16704A;
      padding-bottom: 16px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .title {
      font-size: 24px;
      font-weight: 800;
      color: #115438;
      margin: 0;
    }
    .subtitle {
      font-size: 13px;
      color: #64748B;
      font-weight: 600;
      margin-top: 4px;
    }
    .badge {
      background: #EBF7F0;
      color: #115438;
      border: 1px solid #C2E4D0;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .card {
      background: #FAF8F5;
      border: 1px solid #E2DDD5;
      border-radius: 16px;
      padding: 16px;
    }
    .card-title {
      font-size: 12px;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .score-banner {
      background: #F0FDF4;
      border: 2px solid #86EFAC;
      border-radius: 18px;
      padding: 18px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .score-num {
      font-size: 38px;
      font-weight: 900;
      color: #166534;
    }
    .section-title {
      font-size: 16px;
      font-weight: 800;
      color: #0F172A;
      margin-top: 24px;
      margin-bottom: 12px;
      border-left: 4px solid #16704A;
      padding-left: 8px;
    }
    ul {
      margin: 0;
      padding-left: 20px;
    }
    li {
      margin-bottom: 6px;
      font-size: 14px;
      color: #334155;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      font-size: 13px;
    }
    th, td {
      border: 1px solid #E2E8F0;
      padding: 10px;
      text-align: left;
    }
    th {
      background: #F8FAFC;
      color: #475569;
      font-weight: 700;
    }
    .footer {
      margin-top: 40px;
      border-top: 1px dashed #CBD5E1;
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #64748B;
    }
    .sig-line {
      margin-top: 40px;
      border-top: 1px solid #000;
      width: 220px;
      text-align: center;
      padding-top: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">COGNIA CLINICAL ASSESSMENT REPORT</div>
      <div class="subtitle">AI-Enabled Cognitive Assistance Platform • MDoNER Healthcare Initiative</div>
    </div>
    <div class="badge">CONFIDENTIAL MEDICAL SUMMARY</div>
  </div>

  <div class="score-banner">
    <div>
      <div style="font-size: 13px; font-weight: 700; color: #166534; text-transform: uppercase;">Cognitive Stability Index</div>
      <div style="font-size: 14px; color: #15803D; font-weight: 600; margin-top: 2px;">${assessment.summaryHeadline}</div>
    </div>
    <div class="score-num">${assessment.cognitiveStabilityIndex}<span style="font-size: 18px; color: #15803D;">/100</span></div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-title">Patient Demographics</div>
      <div><strong>Name:</strong> ${patient.name}</div>
      <div><strong>Age / Gender:</strong> ${patient.age || 'Elder'} yrs • ${patient.gender || 'Not specified'}</div>
      <div><strong>Location:</strong> ${patient.city || 'North Eastern Region'}</div>
      <div><strong>Address / District:</strong> ${patient.locationAddress || 'NER Rural Block'}</div>
      <div><strong>Access Code:</strong> ${patient.accessCode}</div>
    </div>
    <div class="card">
      <div class="card-title">Clinical Status & Risk</div>
      <div><strong>Dementia Stage:</strong> ${(patient.dementiaStage || 'mild').toUpperCase()}</div>
      <div><strong>Performance Trajectory:</strong> ${assessment.trend.toUpperCase()}</div>
      <div><strong>Evening Sundowning Risk:</strong> <span style="color: ${assessment.sundowningRisk === 'high' ? '#DC2626' : assessment.sundowningRisk === 'moderate' ? '#D97706' : '#16A34A'}; font-weight: 700;">${assessment.sundowningRisk.toUpperCase()}</span></div>
      <div><strong>Mean Reaction Time:</strong> ${assessment.reactionTimeAvgMs} ms</div>
      <div><strong>Daily Routine Adherence:</strong> ${assessment.adherenceRate}%</div>
    </div>
    <div class="card" style="grid-column: 1 / -1;">
      <div class="card-title">Registered Family Caregivers (Home Monitoring)</div>
      ${patient.familyCaregivers && patient.familyCaregivers.length > 0 ? 
        patient.familyCaregivers.map(f => `<div style="margin-bottom: 6px;"><strong>${f.name}</strong> <span style="background: #FFF3EB; color: #D96B27; padding: 2px 6px; border-radius: 6px; font-size: 11px; font-weight: 700;">${f.relationship || 'Family'}</span> &bull; Phone: <strong>${f.phone}</strong> &bull; Email: ${f.email}</div>`).join('')
        : '<div style="color: #64748B; font-size: 13px;">No family caregivers linked to this access code yet.</div>'
      }
    </div>
  </div>

  <div class="section-title">Clinical Telemetry & Behavioral Observations</div>
  <ul>
    ${assessment.clinicalObservations.map((obs) => `<li>${obs}</li>`).join('')}
  </ul>

  <div class="section-title">Actionable Clinical Recommendations</div>
  <ul>
    ${assessment.actionableRecommendations.map((rec) => `<li>${rec}</li>`).join('')}
  </ul>

  <div class="section-title">Recent Cognitive Session Telemetry</div>
  <table>
    <thead>
      <tr>
        <th>Date & Time</th>
        <th>Game Module</th>
        <th>Difficulty</th>
        <th>Score</th>
        <th>Accuracy</th>
        <th>Reaction Speed</th>
      </tr>
    </thead>
    <tbody>
      ${
        recentSessions.length === 0
          ? '<tr><td colspan="6" style="text-align: center; color: #94A3B8;">No game sessions logged yet</td></tr>'
          : recentSessions
              .map(
                (s) => `<tr>
            <td>${new Date(s.timestamp).toLocaleDateString()} ${new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
            <td>${s.gameType.replace('_', ' ').toUpperCase()}</td>
            <td>${(s.difficultyTier || 'mild').toUpperCase()}</td>
            <td><strong>${s.score}</strong></td>
            <td>${Math.round(s.accuracy)}%</td>
            <td>${s.averageReactionTimeMs} ms</td>
          </tr>`
              )
              .join('')
      }
    </tbody>
  </table>

  <div class="footer">
    <div>
      Report Generated: ${dateStr}<br/>
      Cognia Telehealth System • MDoNER Certified
    </div>
    <div>
      <div class="sig-line">Visiting Medical Officer / ASHA Sign-off</div>
    </div>
  </div>
</body>
</html>`;
}
