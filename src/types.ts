/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AppMode = 'hubby' | 'wifey' | 'solo';

export interface UserProfile {
  userId: string;
  email: string;
  mode: AppMode;
  linkedUserId?: string;
  username?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export type CyclePhase = 'menstruation' | 'follicular' | 'ovulation' | 'luteal';

export interface SymptomLog {
  mood: 'happy' | 'sad' | 'anxious' | 'calm' | 'irritable' | 'none';
  energy: 'high' | 'medium' | 'low' | 'none';
  discomfort: string[]; // e.g. ["cramps", "bloating", "headache"]
  note?: string;
}

export interface DailySymptomRecord {
  [dateIso: string]: SymptomLog;
}

export interface PhaseInsight {
  hubbyPhaseTitle: string;
  hubbyAdvice: string;
  wifeyPhaseTitle: string;
  wifeyInsight: string;
  soloPhaseTitle: string;
  soloInsight: string;
  wifeyReminder?: string; // Specific calming reminder for her
}

export interface ReminderSetting {
  enabled: boolean;
  time: string; // HH:mm
}

export interface ReminderSettings {
  logSymptoms: ReminderSetting;
  periodStart: ReminderSetting;
  wellness: ReminderSetting;
  timezone?: string;
}

export interface PhaseInsightsData {
  [key: string]: PhaseInsight;
}
