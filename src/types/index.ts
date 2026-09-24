export type LanguageCode = 'en' | 'as' | 'kha' | 'bn';

export type CognitiveGameType = 
  | 'memory_match'           // Rhino Memory Match (Visual & Spatial)
  | 'daily_routine_recall'   // NER Daily Routine Recall (Sequencing)
  | 'pattern_recognition'    // Bamboo Pattern Recognition (Working Memory)
  | 'focus_tap';             // Tea Garden Focus & Tap (Attention & Speed)

export type DifficultyTier = 'easy' | 'medium' | 'hard';

export interface CaregiverProfile {
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  photoURL?: string;
  createdAt: number;
  patientIds: string[];
}

export interface PatientProfile {
  id: string;
  caregiverId: string;
  name: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  preferredLanguage: LanguageCode;
  accessCode: string;
  dementiaStage?: 'mild' | 'moderate' | 'early';
  createdAt: number;
  lastActive?: number;
  difficultyLevels: Record<CognitiveGameType, DifficultyTier>;
}

export interface PatientCodeMapping {
  code: string;
  patientId: string;
  caregiverId: string;
  patientName: string;
  createdAt: number;
}

export interface GameSessionTelemetry {
  id: string;
  patientId: string;
  gameType: CognitiveGameType;
  difficultyTier: DifficultyTier;
  score: number;
  accuracy: number; // 0 to 100%
  averageReactionTimeMs: number;
  hesitationCount: number;
  totalTrials: number;
  successfulTrials: number;
  durationSeconds: number;
  timestamp: number;
  syncedAt?: number;
}

export type ReminderType = 'medicine' | 'hydration' | 'daily_activity' | 'appointment';

export interface ReminderItem {
  id: string;
  patientId: string;
  caregiverId: string;
  title: string;
  type: ReminderType;
  time: string; // HH:mm format (e.g. "08:30")
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday ... 6 = Saturday
  dosageOrDetails?: string;
  iconName?: string;
  isActive: boolean;
  lastAcknowledgedAt?: number;
  createdAt: number;
}

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface CaregiverAlert {
  id: string;
  caregiverId: string;
  patientId: string;
  patientName: string;
  type: 'missed_reminder' | 'performance_drop' | 'inactivity' | 'milestone';
  severity: AlertSeverity;
  message: string;
  details?: Record<string, any>;
  timestamp: number;
  isRead: boolean;
}

export interface AdaptiveScoreResult {
  gameType: CognitiveGameType;
  currentTier: DifficultyTier;
  suggestedTier: DifficultyTier;
  confidenceScore: number;
  performanceTrend: 'improving' | 'stable' | 'declining';
  metrics: {
    rollingAccuracy: number;
    rollingReactionTimeMs: number;
    hesitationIndex: number;
  };
}
